const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const { generateQuestion, evaluateAnswer } = require('../utils/aiService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const router = express.Router();

// ================= UNIQUE TRACKERS =================
const askedQuestions = new Set();
const askedMCQs = new Set();

// ================= UNIQUE THEORY =================
async function getUniqueQuestion(role, difficulty) {
  let newQ;

  do {
    newQ = await generateQuestion(role, difficulty);
  } while (askedQuestions.has(newQ.question));

  askedQuestions.add(newQ.question);
  return newQ;
}

// ================= UNIQUE MCQ =================
async function getUniqueMCQ(role, difficulty) {
  let mcq;

  do {
    const prompt = `
Generate a UNIQUE multiple choice question for a ${difficulty} ${role} developer.

Requirements:
- Do NOT repeat common questions
- Make it different from previous ones
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
      mcq = JSON.parse(jsonMatch[0]);
    } else {
      mcq = {
        question: `What is a key concept in ${role}?`,
        options: ['A. Concept1', 'B. Concept2', 'C. Concept3', 'D. Concept4'],
        answer: 'A'
      };
    }

  } while (askedMCQs.has(mcq.question));

  askedMCQs.add(mcq.question);
  return mcq;
}

// ================= STANDARD INTERVIEW =================
router.post('/generate', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;

  askedQuestions.clear();

  const questions = [];

  for (let i = 0; i < 5; i++) {
    try {
      const q = await getUniqueQuestion(role, difficulty);
      questions.push(q);
    } catch {
      questions.push({
        type: 'text',
        question: `Explain a key concept related to ${role}.`,
        skill: role,
        difficulty
      });
    }
  }

  res.json({ questions });
});

// ================= EXAM MODE =================
router.post('/exam', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;

  askedQuestions.clear();
  askedMCQs.clear();

  const questions = [];

  // 7 MCQs
  for (let i = 0; i < 7; i++) {
    try {
      const q = await getUniqueMCQ(role, difficulty);
      questions.push({ ...q, type: 'mcq', skill: role, difficulty });
    } catch {
      questions.push({
        type: 'mcq',
        question: `What is a key concept in ${role}?`,
        options: ['A', 'B', 'C', 'D'],
        answer: 'A',
        skill: role,
        difficulty
      });
    }
  }

  // 2 THEORY
  for (let i = 0; i < 2; i++) {
    try {
      const q = await getUniqueQuestion(role, difficulty);
      questions.push({ ...q, type: 'text' });
    } catch {
      questions.push({
        type: 'text',
        question: `Explain an important ${role} concept.`,
        skill: role,
        difficulty
      });
    }
  }

  res.json({ questions });
});

// ================= EVALUATE =================
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

  res.json({ totalScore, results });
});

module.exports = router;
