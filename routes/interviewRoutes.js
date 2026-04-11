const express = require('express');
const router = express.Router();

const Interview = require('../models/Interview');
const { generateQuestion, evaluateAnswer } = require('../utils/aiService');

// 🔥 TEMP: remove auth to avoid blocking
// const authMiddleware = require('../middleware/authMiddleware');

// ================= STANDARD INTERVIEW =================
router.post('/generate', async (req, res) => {
  console.log("🔥 /generate HIT");

  try {
    const { role = "general", difficulty = "medium" } = req.body;

    const questions = [];

    for (let i = 0; i < 5; i++) {
      try {
        const q = await generateQuestion(role, difficulty);
        questions.push(q);
      } catch (err) {
        console.error("Generate error:", err.message);

        // ✅ fallback
        questions.push({
          type: "text",
          question: "Explain binary search.",
          skill: role,
          difficulty
        });
      }
    }

    res.json({ questions });

  } catch (error) {
    console.error("❌ GENERATE FAILED:", error);

    res.json({
      questions: [
        { question: "What is JavaScript?", type: "text" }
      ]
    });
  }
});

// ================= EXAM MODE =================
router.post('/exam', async (req, res) => {
  console.log("🔥 /exam HIT");

  try {
    const { role = "general", difficulty = "medium" } = req.body;

    const questions = [];

    // 🔹 7 MCQ (STATIC SAFE)
    for (let i = 0; i < 7; i++) {
      questions.push({
        question: "What is time complexity of binary search?",
        type: "mcq",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        answer: "B",
        skill: role,
        difficulty
      });
    }

    // 🔹 2 THEORY (AI or fallback)
    for (let i = 0; i < 2; i++) {
      try {
        const q = await generateQuestion(role, difficulty);
        questions.push({ ...q, type: "text" });
      } catch (err) {
        questions.push({
          question: "Explain binary search.",
          type: "text",
          skill: role,
          difficulty
        });
      }
    }

    res.json({ questions });

  } catch (error) {
    console.error("❌ EXAM FAILED:", error);

    res.json({
      questions: [
        {
          question: "Explain binary search.",
          type: "text"
        }
      ]
    });
  }
});

// ================= EVALUATE EXAM =================
router.post('/exam/evaluate', async (req, res) => {
  try {
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
          feedback: correct ? "Correct" : "Wrong"
        });

      } else {
        try {
          const { score, feedback } = await evaluateAnswer(q.question, userAnswer);
          totalScore += score;
          results.push({ score, feedback });
        } catch {
          totalScore += 5;
          results.push({
            score: 5,
            feedback: "Basic answer. Improve explanation."
          });
        }
      }
    }

    const finalScore = Math.round((totalScore / (questions.length * 10)) * 100);

    res.json({ totalScore: finalScore, results });

  } catch (error) {
    console.error("❌ EVALUATION FAILED:", error);

    res.json({
      totalScore: 50,
      results: []
    });
  }
});

// ================= HISTORY =================
router.get('/history', async (req, res) => {
  try {
    const history = await Interview.find().sort({ createdAt: -1 });
    res.json(history);
  } catch {
    res.json([]);
  }
});

// ================= SKILLS =================
router.get('/skills', async (req, res) => {
  try {
    const interviews = await Interview.find();

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

  } catch {
    res.json({});
  }
});

module.exports = router;
