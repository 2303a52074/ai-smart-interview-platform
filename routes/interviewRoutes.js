const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const { generateQuestion, evaluateAnswer } = require('../utils/aiService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const router = express.Router();

// ================= TRACKERS =================
const askedQuestions = new Set();
const askedMCQs = new Set();

// ================= TOPICS =================
const mcqTopics = [
  "arrays", "linked lists", "OOP", "database",
  "operating systems", "networking", "react",
  "nodejs", "javascript", "algorithms"
];

let topicIndex = 0;

// ================= UNIQUE THEORY =================
async function getUniqueQuestion(role, difficulty) {
  let newQ;
  let attempts = 0;

  do {
    newQ = await generateQuestion(role, difficulty);
    attempts++;
  } while (askedQuestions.has(newQ.question) && attempts < 5);

  askedQuestions.add(newQ.question);
  return newQ;
}

// ================= UNIQUE MCQ =================
async function getUniqueMCQ(role, difficulty) {
  let mcq;
  let attempts = 0;

  do {
    const topic = mcqTopics[topicIndex % mcqTopics.length];
    topicIndex++;

    const prompt = `
Generate a UNIQUE multiple choice question.

Topic: ${topic}
Role: ${role}
Difficulty: ${difficulty}

Rules:
- Do NOT repeat questions
- Provide 4 options (A, B, C, D)
- Give correct answer

Return JSON:
{"question":"...", "options":["A...","B...","C...","D..."], "answer":"A"}
`;

    const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        topP: 1.0
      }
    });

    const raw = result.response.text();
    const jsonMatch = raw.match(/\{.*\}/s);

    if (jsonMatch) {
      mcq = JSON.parse(jsonMatch[0]);
    }

    attempts++;

  } while ((!mcq || askedMCQs.has(mcq.question)) && attempts < 5);

  if (!mcq) {
    mcq = {
      question: `Basic concept in ${role}?`,
      options: ["A", "B", "C", "D"],
      answer: "A"
    };
  }

  askedMCQs.add(mcq.question);
  return mcq;
}

// ================= STANDARD =================
router.post('/generate', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;

  askedQuestions.clear();

  const questions = [];

  for (let i = 0; i < 5; i++) {
    const q = await getUniqueQuestion(role, difficulty);
    questions.push(q);
  }

  res.json({ questions });
});

// ================= EXAM =================
router.post('/exam', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;

  askedQuestions.clear();
  askedMCQs.clear();

  const questions = [];

  // 7 MCQ
  for (let i = 0; i < 7; i++) {
    const q = await getUniqueMCQ(role, difficulty);
    questions.push({ ...q, type: 'mcq', skill: role, difficulty });
  }

  // 2 THEORY
  for (let i = 0; i < 2; i++) {
    const q = await getUniqueQuestion(role, difficulty);
    questions.push({ ...q, type: 'text' });
  }

  res.json({ questions });
});

// ================= EVALUATE + SAVE =================
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
      } catch {
        results.push({ score: 5, feedback: "Try to improve your answer." });
      }
    }
  }

  const finalScore = Math.round((totalScore / (questions.length * 10)) * 100);

  // 🔥 SAVE FIX (VERY IMPORTANT)
  const newInterview = new Interview({
    userId: req.user.id,
    role: questions[0]?.skill || 'general',
    difficulty: questions[0]?.difficulty || 'medium',
    totalScore: finalScore,
    answers: questions.map((q, i) => ({
      question: q.question,
      answer: answers[i],
      score: results[i].score,
      skill: q.skill,
      timeSpent: 0
    }))
  });

  await newInterview.save();

  res.json({ totalScore: finalScore, results });
});

// ================= HISTORY =================
router.get('/history', authMiddleware, async (req, res) => {
  const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(history);
});

// ================= SKILLS =================
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
