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

// ================= TOPICS FOR VARIATION =================
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
Generate a completely NEW and DIFFERENT multiple choice question.

Topic: ${topic}
Role: ${role}
Difficulty: ${difficulty}

Rules:
- Do NOT repeat previous questions
- Avoid generic questions
- Make it specific and practical
- Use different concepts each time

Return JSON:
{
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A"
}
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

  // fallback
  if (!mcq || askedMCQs.has(mcq.question)) {
    mcq = {
      question: `Which concept is important in ${role}?`,
      options: [
        "A. Abstraction",
        "B. Compilation",
        "C. Networking",
        "D. Storage"
      ],
      answer: "A"
    };
  }

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
        question: `Explain a key concept in ${role}`,
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
        question: `Basic concept in ${role}?`,
        options: ["A", "B", "C", "D"],
        answer: "A",
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
        question: `Explain ${role} concept`,
        skill: role,
        difficulty
      });
    }
  }

  res.json({ questions });
});

// ================= EVALUATION =================
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
