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

// ----------------------------- FALLBACK ANSWER EVALUATION -----------------------------
function evaluateAnswerFallback(answer, keywords = [], minLength = 20) {
  // ... (keep your existing function, not shown for brevity)
}

// ================= STANDARD INTERVIEW (AI ONLY) =================
router.post('/generate', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;
  const questions = [];
  const numberOfQuestions = 5;
  for (let i = 0; i < numberOfQuestions; i++) {
    try {
      const q = await generateQuestion(role, difficulty);
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

// ================= EXAM (7 MCQ + 2 THEORY) =================
router.post('/exam', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;
  const questions = [];

  // Generate 7 MCQs
  for (let i = 0; i < 7; i++) {
    try {
      const prompt = `Generate a multiple choice question for a ${difficulty} level ${role} developer. Provide the question, four options (A, B, C, D), and the correct answer letter. Output JSON: {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A"}`;
      const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const jsonMatch = raw.match(/\{.*\}/s);
      if (jsonMatch) {
        const q = JSON.parse(jsonMatch[0]);
        questions.push({ ...q, type: 'mcq', skill: role, difficulty });
      } else {
        // Fallback MCQ
        questions.push({
          type: 'mcq',
          question: `What is a key concept in ${role}?`,
          options: ['A. Concept1', 'B. Concept2', 'C. Concept3', 'D. Concept4'],
          answer: 'A',
          skill: role,
          difficulty
        });
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

  // Generate 2 theory questions
  for (let i = 0; i < 2; i++) {
    try {
      const q = await generateQuestion(role, difficulty);
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
      results.push({ correct, score, feedback: correct ? 'Correct' : 'Wrong' });
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

  // Save exam result as an interview
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

// ================= VIDEO INTERVIEW SAVE =================
router.post('/video/save', authMiddleware, async (req, res) => {
  const { role, difficulty, question, answer, confidenceScore, timeSpent } = req.body;
  const newInterview = new Interview({
    userId: req.user.id,
    role,
    difficulty,
    totalScore: confidenceScore,
    answers: [{
      question,
      answer,
      score: confidenceScore,
      skill: role,
      timeSpent
    }]
  });
  await newInterview.save();
  res.json({ message: 'Video interview saved' });
});

// ================= GET HINT =================
router.get('/hint', authMiddleware, (req, res) => {
  res.json({ hint: "Think about the core concepts and explain step by step." });
});

// ================= EVALUATE STANDARD ANSWER =================
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

// ================= SAVE STANDARD INTERVIEW =================
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

// ================= HISTORY =================
router.get('/history', authMiddleware, async (req, res) => {
  const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(history);
});

// ================= SKILL ANALYTICS =================
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