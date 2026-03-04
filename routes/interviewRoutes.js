const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const User = require('../models/User');
const axios = require('axios'); // for code execution via Piston API

const router = express.Router();

// ----------------------------- Helper: XP calculation -----------------------------
function calculateXP(score, difficulty) {
    const base = score * 10;
    const multiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
    return Math.round(base * multiplier);
}

// ----------------------------- Technical questions with hints & skills -----------------------------
const technicalQuestions = {
  frontend: [
    { type: "text", question: "What is Virtual DOM in React?", skill: "react", difficulty: "easy", hint: "It's a lightweight copy of the real DOM that React uses for performance." },
    { type: "text", question: "Explain Flexbox in CSS.", skill: "css", difficulty: "easy", hint: "A one‑dimensional layout model for distributing space along a main axis." },
    { type: "text", question: "What is event bubbling?", skill: "javascript", difficulty: "medium", hint: "Events propagate from the target element up to the root." },
    { type: "text", question: "Difference between var let const.", skill: "javascript", difficulty: "medium", hint: "Scope and reassignability differences." },
    { type: "text", question: "Explain responsive design.", skill: "css", difficulty: "hard", hint: "Design that adapts to different screen sizes using fluid grids and media queries." }
  ],
  backend: [
    { type: "text", question: "What is REST API?", skill: "api", difficulty: "easy", hint: "Architectural style using HTTP methods for CRUD." },
    { type: "text", question: "Explain middleware in Express.", skill: "node", difficulty: "easy", hint: "Functions that have access to request/response objects in the pipeline." },
    { type: "text", question: "What is JWT authentication?", skill: "security", difficulty: "medium", hint: "JSON Web Tokens – a compact, URL‑safe means of representing claims." },
    { type: "text", question: "What is MongoDB?", skill: "database", difficulty: "medium", hint: "A NoSQL document database." },
    { type: "text", question: "Explain MVC architecture.", skill: "architecture", difficulty: "hard", hint: "Model‑View‑Controller separates data, presentation, and user interaction." }
  ],
  react: [
    { type: "text", question: "What is JSX?", skill: "react", difficulty: "easy", hint: "A syntax extension that looks like HTML and compiles to JavaScript." },
    { type: "text", question: "Explain useEffect hook.", skill: "react", difficulty: "easy", hint: "Handles side effects in functional components." },
    { type: "text", question: "What is React state?", skill: "react", difficulty: "medium", hint: "An object that holds data that may change over time." },
    { type: "text", question: "Difference between props and state.", skill: "react", difficulty: "medium", hint: "Props are read‑only from parent; state is internal." },
    { type: "text", question: "What is React Router?", skill: "react", difficulty: "hard", hint: "Library for handling navigation in React apps." }
  ],
  node: [
    { type: "text", question: "What is Node.js?", skill: "node", difficulty: "easy", hint: "JavaScript runtime built on Chrome's V8 engine." },
    { type: "text", question: "Explain Express.js.", skill: "node", difficulty: "easy", hint: "Minimal web framework for Node." },
    { type: "text", question: "What is asynchronous programming?", skill: "node", difficulty: "medium", hint: "Allows code to run without blocking." },
    { type: "text", question: "What is event loop?", skill: "node", difficulty: "medium", hint: "Mechanism that handles asynchronous callbacks." },
    { type: "text", question: "What is npm?", skill: "node", difficulty: "hard", hint: "Node Package Manager." }
  ],
  python: [
    { type: "text", question: "What is Python?", skill: "python", difficulty: "easy", hint: "High‑level interpreted language." },
    { type: "text", question: "Explain list comprehension.", skill: "python", difficulty: "easy", hint: "Concise way to create lists." },
    { type: "text", question: "What is PEP8?", skill: "python", difficulty: "medium", hint: "Python's official style guide." },
    { type: "text", question: "Explain Python decorators.", skill: "python", difficulty: "medium", hint: "Functions that modify behaviour of another function." },
    { type: "text", question: "Difference between list and tuple.", skill: "python", difficulty: "hard", hint: "Lists mutable, tuples immutable." }
  ],
  java: [
    { type: "text", question: "Explain OOP in Java.", skill: "java", difficulty: "easy", hint: "Encapsulation, inheritance, polymorphism, abstraction." },
    { type: "text", question: "What is JVM?", skill: "java", difficulty: "easy", hint: "Java Virtual Machine – runs bytecode." },
    { type: "text", question: "What is exception handling?", skill: "java", difficulty: "medium", hint: "Try, catch, finally." },
    { type: "text", question: "Difference between interface and class.", skill: "java", difficulty: "medium", hint: "Interfaces are contracts; classes implement them." },
    { type: "text", question: "What is multithreading?", skill: "java", difficulty: "hard", hint: "Executing multiple threads simultaneously." }
  ],
  dsa: [
    { type: "text", question: "What is Data Structure?", skill: "dsa", difficulty: "easy", hint: "Way of organising data." },
    { type: "text", question: "Explain stack and queue.", skill: "dsa", difficulty: "easy", hint: "LIFO vs FIFO." },
    { type: "text", question: "What is recursion?", skill: "dsa", difficulty: "medium", hint: "Function that calls itself." },
    { type: "text", question: "Explain Big O notation.", skill: "dsa", difficulty: "medium", hint: "Describes upper bound of complexity." },
    { type: "text", question: "What is binary search?", skill: "dsa", difficulty: "hard", hint: "Search algorithm for sorted arrays by dividing interval." }
  ]
};

// MCQ banks (unchanged)
const englishMCQ = [ /* ... keep your existing ... */ ];
const aptitudeMCQ = [ /* ... keep your existing ... */ ];

// ----------------------------- Generate questions -----------------------------
router.post('/generate', authMiddleware, (req, res) => {
    const { role, type, difficulty = 'medium' } = req.body;
    if (type === "english") return res.json({ questions: englishMCQ });
    if (type === "aptitude") return res.json({ questions: aptitudeMCQ });
    const allQuestions = technicalQuestions[role] || technicalQuestions.frontend;
    const filtered = allQuestions.filter(q => q.difficulty === difficulty);
    res.json({ questions: filtered.length ? filtered : allQuestions });
});

// ----------------------------- Get hint -----------------------------
router.get('/hint', authMiddleware, (req, res) => {
    const { role, difficulty, index } = req.query;
    const roleQuestions = technicalQuestions[role] || technicalQuestions.frontend;
    const filtered = roleQuestions.filter(q => q.difficulty === difficulty);
    const question = filtered[index] || roleQuestions[index];
    res.json({ hint: question?.hint || "No hint available." });
});

// ----------------------------- Code execution (Piston API) -----------------------------
router.post('/execute', authMiddleware, async (req, res) => {
    const { language, code } = req.body;
    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: language,
            version: '*',
            files: [{ content: code }]
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Execution failed' });
    }
});

// ----------------------------- Evaluate answer (with skill tracking) -----------------------------
router.post('/evaluate', authMiddleware, async (req, res) => {
    const { answer, questionObj, timeSpent } = req.body; // questionObj includes skill, difficulty, etc.
    let score = 0;
    let feedback = [];

    // Simple evaluation logic (replace with AI later)
    if (questionObj.type === 'mcq') {
        const isCorrect = (parseInt(answer) === questionObj.answer);
        score = isCorrect ? 10 : 0;
        feedback = isCorrect ? ['Correct!'] : ['Wrong answer.'];
    } else if (questionObj.type === 'coding') {
        // Placeholder – in reality you'd run tests
        score = answer.length > 50 ? 8 : 5;
        feedback = ['Code evaluated (simulated).'];
    } else {
        // Text answer
        score = answer.length > 50 ? 7 : 4;
        feedback = answer.length > 50 ? ['Good detail.'] : ['Try to elaborate.'];
    }

    res.json({ score, feedback });
});

// ----------------------------- Save interview -----------------------------
router.post('/save', authMiddleware, async (req, res) => {
    const { role, difficulty, totalScore, answers } = req.body;
    const user = await User.findById(req.user.id);
    const xpEarned = calculateXP(totalScore, difficulty);

    const newInterview = new Interview({
        userId: req.user.id,
        role,
        difficulty,
        totalScore,
        xpEarned,
        answers
    });
    await newInterview.save();

    // Update user XP and level
    user.xp += xpEarned;
    user.lastPractice = new Date();
    // Simple level formula: level = floor(xp/100) + 1
    user.level = Math.floor(user.xp / 100) + 1;
    await user.save();

    res.json({ message: "Interview saved", xpEarned, newLevel: user.level });
});

// ----------------------------- History -----------------------------
router.get('/history', authMiddleware, async (req, res) => {
    const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(history);
});

// ----------------------------- Skill analytics -----------------------------
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
        skillAverages[skill] = scores.reduce((a,b)=>a+b,0) / scores.length;
    }
    res.json(skillAverages);
});

module.exports = router;