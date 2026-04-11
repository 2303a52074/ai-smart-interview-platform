const express = require('express');
const router = express.Router();

// ================= QUESTION BANK =================

const mcqQuestions = [
  {
    question: "What is time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    answer: "B"
  },
  {
    question: "Which data structure uses FIFO?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    answer: "B"
  },
  {
    question: "Which language runs in browser?",
    options: ["Python", "Java", "C++", "JavaScript"],
    answer: "D"
  },
  {
    question: "What is React?",
    options: ["Framework", "Library", "Language", "Database"],
    answer: "B"
  },
  {
    question: "Which is not a database?",
    options: ["MySQL", "MongoDB", "HTML", "PostgreSQL"],
    answer: "C"
  }
];

const theoryQuestions = [
  "Explain binary search.",
  "What is REST API?",
  "Explain OOP concepts.",
  "What is event loop in JavaScript?",
  "Explain difference between SQL and NoSQL."
];

// ================= RANDOM HELPER =================

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ================= STANDARD INTERVIEW =================

router.post('/generate', (req, res) => {
  console.log("🔥 GENERATE STATIC");

  const questions = [];

  for (let i = 0; i < 5; i++) {
    questions.push({
      type: "text",
      question: getRandom(theoryQuestions),
      skill: "general",
      difficulty: "medium"
    });
  }

  res.json({ questions });
});

// ================= EXAM MODE =================

router.post('/exam', (req, res) => {
  console.log("🔥 EXAM STATIC");

  const questions = [];

  // 7 MCQ
  for (let i = 0; i < 7; i++) {
    const q = getRandom(mcqQuestions);
    questions.push({
      ...q,
      type: "mcq"
    });
  }

  // 2 THEORY
  for (let i = 0; i < 2; i++) {
    questions.push({
      question: getRandom(theoryQuestions),
      type: "text"
    });
  }

  res.json({ questions });
});

// ================= EVALUATE =================

router.post('/exam/evaluate', (req, res) => {
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
      const score = userAnswer && userAnswer.length > 20 ? 7 : 4;
      totalScore += score;

      results.push({
        score,
        feedback: "Basic evaluation (static mode)"
      });
    }
  }

  const finalScore = Math.round((totalScore / (questions.length * 10)) * 100);

  res.json({ totalScore: finalScore, results });
});

module.exports = router;
