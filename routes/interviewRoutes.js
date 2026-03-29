const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const User = require('../models/User');
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const { generateQuestion, evaluateAnswer } = require('../utils/aiService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const router = express.Router();

// ================= UNIQUE QUESTION TRACKER =================
const askedQuestions = new Set();

async function getUniqueQuestion(role, difficulty) {
  let newQ;

  do {
    newQ = await generateQuestion(role, difficulty);
  } while (askedQuestions.has(newQ.question));

  askedQuestions.add(newQ.question);
  return newQ;
}

// ----------------------------- FALLBACK ANSWER EVALUATION -----------------------------
function evaluateAnswerFallback(answer, keywords = [], minLength = 20) {
  if (!answer || answer.trim().length === 0) {
    return { score: 0, feedback: ['No answer provided.'] };
  }

  const answerTokens = tokenizer.tokenize(answer.toLowerCase());
  const stemmedAnswer = answerTokens.map(t => PorterStemmer.stem(t));
  const stemmedKeywords = keywords.map(k => PorterStemmer.stem(k.toLowerCase()));

  let matchedCount = 0;
  stemmedKeywords.forEach(sk => {
    if (stemmedAnswer.includes(sk)) matchedCount++;
  });

  const keywordScore = (matchedCount / Math.max(keywords.length, 1)) * 10;
  const lengthBonus = answer.length > minLength ? 1 : 0;
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const structureBonus = sentences.length >= 3 ? 1 : 0;

  let totalScore = Math.min(10, Math.round(keywordScore + lengthBonus + structureBonus));

  let feedback = [];
  if (keywords.length === 0) {
    feedback.push(answer.length > 50 ? 'Good detail.' : 'Try to elaborate more.');
  } else {
    if (matchedCount === 0) {
      feedback.push('Your answer missed key technical terms.');
    } else if (matchedCount < keywords.length / 2) {
      feedback.push('Good start but missed some important points.');
    } else {
      feedback.push('You covered most key concepts.');
    }
  }

  if (answer.length < minLength) {
    feedback.push('Your answer is short. Try explaining more.');
  }

  if (sentences.length < 2) {
    feedback.push('Structure your answer using clear sentences.');
  }

  return { score: totalScore, feedback };
}

// ================= STANDARD INTERVIEW =================
router.post('/generate', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;

  askedQuestions.clear(); // 🔥 reset for new session

  const questions = [];
  const numberOfQuestions = 5;

  for (let i = 0; i < numberOfQuestions; i++) {
    try {
      const q = await getUniqueQuestion(role, difficulty);
      questions.push(q);
    } catch (error) {
      questions.push({
        type: 'text',
        question: `Explain a key concept related to ${role}.`,
        skill: role,
        difficulty: difficulty,
        keywords: [],
        hint: `Think about important fundamentals in ${role}.`
      });
    }
  }

  res.json({ questions });
});

// ================= EXAM MODE =================
router.post('/exam', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;

  askedQuestions.clear(); // 🔥 reset

  const questions = [];

  // Generate 7 MCQs
  for (let i = 0; i < 7; i++) {
    try {
      const prompt = `
Generate a UNIQUE multiple choice question for a ${difficulty} ${role} developer.

Requirements:
- Do NOT repeat common questions
- Provide 4 options (A, B, C, D)
- Give correct answer

Output JSON:
{"question":"...", "options":["A...","B...","C...","D..."], "answer":"A"}
`;

      const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95
        }
      });

      const raw = result.response.text();
      const jsonMatch = raw.match(/\{.*\}/s);

      if (jsonMatch) {
        const q = JSON.parse(jsonMatch[0]);
        questions.push({ ...q, type: 'mcq', skill: role, difficulty });
      } else {
        throw new Error("Invalid JSON");
      }

    } catch (error) {
      questions.push({
        type: 'mcq',
        question: `What is a key concept in ${role}?`,
        options: ['A. Concept1', 'B. Concept2', 'C. Concept3', 'D. Concept4'],
        answer: 'A',
        skill: role,
        difficulty
      });
    }
  }

  // Generate 2 THEORY questions (unique)
  for (let i = 0; i < 2; i++) {
    try {
      const q = await getUniqueQuestion(role, difficulty);
      questions.push({ ...q, type: 'text' });
    } catch (error) {
      questions.push({
        type: 'text',
        question: `Explain an important ${role} concept.`,
        skill: role,
        difficulty,
        keywords: [],
        hint: `Think about ${role} fundamentals.`
      });
    }
  }

  res.json({ questions });
});

// ================= EVALUATE EXAM =================
router.post('/exam/evaluate', authMiddleware, async (req, res) => {
  const { questions, answers } = req.body;

  let totalScore = 0;
  const results = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const userAnswer = answers[i];

    if (q.type === 'mcq') {
      const correct = userAnswer === q.answer;
      const score = correct ? 10 : 0;
      totalScore += score;

      results.push({
        correct,
        score,
        feedback: correct ? 'Correct' : 'Wrong'
      });
    } else {
      try {
        const { score, feedback } = await evaluateAnswer(q.question, userAnswer);
        totalScore += score;
        results.push({ score, feedback });
      } catch (error) {
        const fallback = evaluateAnswerFallback(userAnswer, q.keywords || []);
        totalScore += fallback.score;
        results.push(fallback);
      }
    }
  }

  const newInterview = new Interview({
    userId: req.user.id,
    role: questions[0]?.skill || 'general',
    difficulty: questions[0]?.difficulty || 'medium',
    totalScore: Math.round((totalScore / (questions.length * 10)) * 100),
    answers: questions.map((q, i) => ({
      question: q.question,
      answer: answers[i],
      score: results[i].score,
      skill: q.skill,
      timeSpent: 0
    }))
  });

  await newInterview.save();

  res.json({ totalScore, results });
});

// ================= OTHER ROUTES (UNCHANGED) =================

router.get('/hint', authMiddleware, (req, res) => {
  res.json({ hint: "Think about the core concepts and explain step by step." });
});

router.post('/evaluate', authMiddleware, async (req, res) => {
  const { answer, questionObj } = req.body;

  try {
    const { score, feedback } = await evaluateAnswer(questionObj.question, answer);
    res.json({ score, feedback: [feedback] });
  } catch (error) {
    const result = evaluateAnswerFallback(answer, questionObj.keywords || []);
    res.json(result);
  }
});

router.post('/save', authMiddleware, async (req, res) => {
  const { role, difficulty, totalScore, answers } = req.body;

  const newInterview = new Interview({
    userId: req.user.id,
    role,
    difficulty,
    totalScore,
    answers
  });

  await newInterview.save();
  res.json({ message: "Interview saved successfully" });
});

router.get('/history', authMiddleware, async (req, res) => {
  const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(history);
});

router.get('/skills', authMiddleware, async (req, res) => {
  const interviews = await Interview.find({ userId: req.user.id });

  const skillMap = {};

  interviews.forEach(i => {
    i.answers.forEach(a => {
      if (!skillMap[a.skill]) skillMap[a.skill] = [];
      skillMap[a.skill].push(a.score);
    });
  });

  const skillAverages = {};

  for (let skill in skillMap) {
    const scores = skillMap[skill];
    skillAverages[skill] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  res.json(skillAverages);
});

module.exports = router;
