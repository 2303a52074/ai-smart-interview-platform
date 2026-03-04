const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');

const router = express.Router();

/* ================= TECHNOLOGY QUESTIONS WITH DIFFICULTY ================= */
const technicalQuestions = {
  frontend: [
    { question: "What is Virtual DOM in React?", keywords: ["virtual dom", "react", "update"], difficulty: "easy" },
    { question: "Explain Flexbox in CSS.", keywords: ["flexbox", "layout", "css"], difficulty: "easy" },
    { question: "What is event bubbling?", keywords: ["event", "bubbling", "javascript"], difficulty: "medium" },
    { question: "Difference between var let const.", keywords: ["scope", "var", "let", "const"], difficulty: "medium" },
    { question: "Explain responsive design.", keywords: ["responsive", "media", "css"], difficulty: "hard" }
  ],
  backend: [
    { question: "What is REST API?", keywords: ["http", "api", "rest"], difficulty: "easy" },
    { question: "Explain middleware in Express.", keywords: ["middleware", "express", "request"], difficulty: "easy" },
    { question: "What is JWT authentication?", keywords: ["jwt", "token", "authentication"], difficulty: "medium" },
    { question: "What is MongoDB?", keywords: ["nosql", "database", "collection"], difficulty: "medium" },
    { question: "Explain MVC architecture.", keywords: ["mvc", "model", "view"], difficulty: "hard" }
  ],
  react: [
    { question: "What is JSX?", keywords: ["javascript", "xml", "react"], difficulty: "easy" },
    { question: "Explain useEffect hook.", keywords: ["useeffect", "hook", "react"], difficulty: "easy" },
    { question: "What is React state?", keywords: ["state", "component", "data"], difficulty: "medium" },
    { question: "Difference between props and state.", keywords: ["props", "state"], difficulty: "medium" },
    { question: "What is React Router?", keywords: ["router", "navigation"], difficulty: "hard" }
  ],
  node: [
    { question: "What is Node.js?", keywords: ["node", "runtime", "javascript"], difficulty: "easy" },
    { question: "Explain Express.js.", keywords: ["express", "framework"], difficulty: "easy" },
    { question: "What is asynchronous programming?", keywords: ["async", "callback"], difficulty: "medium" },
    { question: "What is event loop?", keywords: ["event", "loop"], difficulty: "medium" },
    { question: "What is npm?", keywords: ["package", "node"], difficulty: "hard" }
  ],
  python: [
    { question: "What is Python?", keywords: ["python", "programming"], difficulty: "easy" },
    { question: "Explain list comprehension.", keywords: ["list", "python"], difficulty: "easy" },
    { question: "What is PEP8?", keywords: ["pep8", "style"], difficulty: "medium" },
    { question: "Explain Python decorators.", keywords: ["decorator"], difficulty: "medium" },
    { question: "Difference between list and tuple.", keywords: ["list", "tuple"], difficulty: "hard" }
  ],
  java: [
    { question: "Explain OOP in Java.", keywords: ["oop", "inheritance", "polymorphism"], difficulty: "easy" },
    { question: "What is JVM?", keywords: ["jvm", "java"], difficulty: "easy" },
    { question: "What is exception handling?", keywords: ["exception", "try", "catch"], difficulty: "medium" },
    { question: "Difference between interface and class.", keywords: ["interface"], difficulty: "medium" },
    { question: "What is multithreading?", keywords: ["thread"], difficulty: "hard" }
  ],
  dsa: [
    { question: "What is Data Structure?", keywords: ["data", "structure"], difficulty: "easy" },
    { question: "Explain stack and queue.", keywords: ["stack", "queue"], difficulty: "easy" },
    { question: "What is recursion?", keywords: ["recursion"], difficulty: "medium" },
    { question: "Explain Big O notation.", keywords: ["complexity", "big o"], difficulty: "medium" },
    { question: "What is binary search?", keywords: ["binary", "search"], difficulty: "hard" }
  ]
};

/* ================= ENGLISH MCQ ================= */
const englishMCQ = [
  { question: "Choose synonym of Rapid", options: ["Slow", "Fast", "Heavy", "Late"], answer: 1 },
  { question: "Fill blank: She ___ to school daily.", options: ["go", "goes", "gone", "going"], answer: 1 },
  { question: "Antonym of Honest", options: ["Truthful", "Loyal", "Dishonest", "Kind"], answer: 2 },
  { question: "Correct spelling", options: ["Definately", "Definitely", "Definetly", "Definatly"], answer: 1 },
  { question: "One who writes poems", options: ["Poet", "Painter", "Singer", "Writer"], answer: 0 }
];

/* ================= APTITUDE MCQ ================= */
const aptitudeMCQ = [
  { question: "2x = 10 find x", options: ["2", "5", "10", "20"], answer: 1 },
  { question: "15% of 200", options: ["20", "25", "30", "40"], answer: 2 },
  { question: "Average of 10 and 20", options: ["15", "20", "10", "25"], answer: 0 },
  { question: "Speed formula", options: ["Distance/Time", "Time/Distance", "Distance*Time", "None"], answer: 0 },
  { question: "2^3 equals", options: ["6", "8", "9", "4"], answer: 1 }
];

/* ================= GENERATE QUESTIONS ================= */
router.post('/generate', authMiddleware, (req, res) => {
  const { role, type, difficulty = 'medium' } = req.body; // default to medium

  if (type === "english") {
    return res.json({ questions: englishMCQ });
  }
  if (type === "aptitude") {
    return res.json({ questions: aptitudeMCQ });
  }

  const allQuestions = technicalQuestions[role] || technicalQuestions.frontend;
  // Filter by difficulty
  const filtered = allQuestions.filter(q => q.difficulty === difficulty);
  // Fallback to all if none match (shouldn't happen with our data)
  res.json({ questions: filtered.length ? filtered : allQuestions });
});

/* ================= EVALUATE DESCRIPTIVE ================= */
router.post('/evaluate', authMiddleware, async (req, res) => {
  const { answer } = req.body;
  let score = Math.floor(Math.random() * 4) + 6;
  let feedback = [];
  if (answer.length > 120) feedback.push("Good explanation length");
  else feedback.push("Try giving more detailed explanation");
  if (answer.includes("example")) feedback.push("Nice example used");
  else feedback.push("Include a practical example");
  if (answer.split(" ").length < 15) feedback.push("Add more technical details");
  res.json({ score, feedback });
});

/* ================= EVALUATE MCQ ================= */
router.post('/evaluate-mcq', authMiddleware, (req, res) => {
  const { type, questionIndex, selectedOption } = req.body;
  const set = type === "english" ? englishMCQ : aptitudeMCQ;
  const correct = set[questionIndex]?.answer;
  if (correct === undefined) return res.json({ score: 0 });
  const score = selectedOption === correct ? 20 : 0;
  res.json({ score, correctAnswer: correct });
});

/* ================= SAVE INTERVIEW ================= */
router.post('/save', authMiddleware, async (req, res) => {
  const { role, totalScore } = req.body;
  const newInterview = new Interview({
    userId: req.user.id,
    role,
    totalScore
  });
  await newInterview.save();
  res.json({ message: "Interview saved" });
});

/* ================= HISTORY ================= */
router.get('/history', authMiddleware, async (req, res) => {
  const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(history);
});

/* ================= DELETE ================= */
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  await Interview.findByIdAndDelete(req.params.id);
  res.json({ message: "Interview deleted" });
});

module.exports = router;