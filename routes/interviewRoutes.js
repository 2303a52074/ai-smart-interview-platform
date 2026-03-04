const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');

const router = express.Router();

/* ================= ENHANCED QUESTION BANKS (10 each, mix of text & MCQ) ================= */
const technicalQuestions = {
  frontend: [
    { type: "text", question: "What is the Virtual DOM in React?", skill: "react", difficulty: "easy", hint: "A lightweight copy of the real DOM for performance." },
    { type: "text", question: "Explain the difference between '==' and '===' in JavaScript.", skill: "javascript", difficulty: "easy", hint: "Equality vs strict equality." },
    { type: "mcq", question: "Which CSS property is used to create a flex container?", skill: "css", difficulty: "easy", options: ["display: flex", "position: flex", "flex-container: true", "flex-box: inline"], answer: 0 },
    { type: "text", question: "What is event delegation in JavaScript?", skill: "javascript", difficulty: "medium", hint: "Attaching an event listener to a parent to handle events on children." },
    { type: "mcq", question: "In React, what is the purpose of the 'useEffect' hook?", skill: "react", difficulty: "medium", options: ["To handle side effects", "To create state", "To render JSX", "To handle routing"], answer: 0 },
    { type: "text", question: "Explain the box model in CSS.", skill: "css", difficulty: "medium", hint: "Content, padding, border, margin." },
    { type: "mcq", question: "Which of the following is a JavaScript framework?", skill: "javascript", difficulty: "easy", options: ["React", "Laravel", "Django", "Flask"], answer: 0 },
    { type: "text", question: "What is a Promise in JavaScript?", skill: "javascript", difficulty: "medium", hint: "An object representing eventual completion of an async operation." },
    { type: "mcq", question: "What does 'npm' stand for?", skill: "node", difficulty: "easy", options: ["Node Package Manager", "New Project Manager", "Node Project Module", "Never Publish Modules"], answer: 0 },
    { type: "text", question: "Explain the concept of 'hoisting' in JavaScript.", skill: "javascript", difficulty: "hard", hint: "Variables and function declarations are moved to the top." }
  ],
  backend: [
    { type: "text", question: "What is RESTful API design?", skill: "api", difficulty: "easy", hint: "Uses HTTP methods and stateless communication." },
    { type: "mcq", question: "Which HTTP method is used to update a resource?", skill: "api", difficulty: "easy", options: ["GET", "POST", "PUT", "DELETE"], answer: 2 },
    { type: "text", question: "Explain middleware in Express.js.", skill: "node", difficulty: "easy", hint: "Functions that have access to request and response objects." },
    { type: "mcq", question: "What is the primary purpose of JWT?", skill: "security", difficulty: "medium", options: ["Authentication", "Encryption", "Data compression", "Caching"], answer: 0 },
    { type: "text", question: "What is the difference between SQL and NoSQL databases?", skill: "database", difficulty: "medium", hint: "Relational vs non‑relational." },
    { type: "mcq", question: "Which of the following is a NoSQL database?", skill: "database", difficulty: "easy", options: ["MySQL", "PostgreSQL", "MongoDB", "SQLite"], answer: 2 },
    { type: "text", question: "Explain the concept of 'load balancing'.", skill: "devops", difficulty: "medium", hint: "Distributing network traffic across multiple servers." },
    { type: "mcq", question: "What does the 'cors' package do in Node.js?", skill: "node", difficulty: "medium", options: ["Enables Cross-Origin Resource Sharing", "Compresses responses", "Logs requests", "Manages cookies"], answer: 0 },
    { type: "text", question: "What is a microservice architecture?", skill: "architecture", difficulty: "hard", hint: "Breaking an application into small, independent services." },
    { type: "mcq", question: "Which protocol is used for secure communication over the internet?", skill: "security", difficulty: "easy", options: ["HTTP", "FTP", "HTTPS", "SMTP"], answer: 2 }
  ],
  react: [
    { type: "text", question: "What is JSX?", skill: "react", difficulty: "easy", hint: "JavaScript XML – syntax extension for React." },
    { type: "mcq", question: "Which hook is used for state in functional components?", skill: "react", difficulty: "easy", options: ["useState", "useEffect", "useContext", "useReducer"], answer: 0 },
    { type: "text", question: "Explain the purpose of the 'key' prop in lists.", skill: "react", difficulty: "easy", hint: "Helps React identify which items have changed." },
    { type: "mcq", question: "What does the 'useEffect' hook return?", skill: "react", difficulty: "medium", options: ["A cleanup function", "A state value", "A JSX element", "Nothing"], answer: 0 },
    { type: "text", question: "What is the difference between props and state?", skill: "react", difficulty: "medium", hint: "Props are read‑only, state is internal." },
    { type: "mcq", question: "Which method is used to render multiple elements in React?", skill: "react", difficulty: "easy", options: ["map()", "forEach()", "filter()", "reduce()"], answer: 0 },
    { type: "text", question: "Explain the concept of 'lifting state up'.", skill: "react", difficulty: "medium", hint: "Moving state to a common ancestor." },
    { type: "mcq", question: "What is the purpose of React Router?", skill: "react", difficulty: "easy", options: ["Navigation", "State management", "Styling", "API calls"], answer: 0 },
    { type: "text", question: "What are controlled components?", skill: "react", difficulty: "medium", hint: "Form inputs controlled by React state." },
    { type: "mcq", question: "Which hook is used to access the DOM element?", skill: "react", difficulty: "medium", options: ["useRef", "useState", "useEffect", "useContext"], answer: 0 }
  ],
  node: [
    { type: "text", question: "What is Node.js?", skill: "node", difficulty: "easy", hint: "JavaScript runtime built on Chrome's V8." },
    { type: "mcq", question: "Which module is used to create a web server in Node?", skill: "node", difficulty: "easy", options: ["http", "fs", "path", "url"], answer: 0 },
    { type: "text", question: "Explain the event loop in Node.js.", skill: "node", difficulty: "medium", hint: "Handles asynchronous callbacks." },
    { type: "mcq", question: "What does the 'express.json()' middleware do?", skill: "node", difficulty: "medium", options: ["Parses JSON bodies", "Serves static files", "Logs requests", "Compresses responses"], answer: 0 },
    { type: "text", question: "What is the difference between 'require' and 'import'?", skill: "node", difficulty: "medium", hint: "CommonJS vs ES modules." },
    { type: "mcq", question: "Which command is used to install a package globally?", skill: "node", difficulty: "easy", options: ["npm install -g", "npm install --save", "npm install --dev", "npm link"], answer: 0 },
    { type: "text", question: "Explain the concept of 'middleware' in Express.", skill: "node", difficulty: "medium", hint: "Functions that run during request/response cycle." },
    { type: "mcq", question: "What is the purpose of 'package.json'?", skill: "node", difficulty: "easy", options: ["Manage dependencies", "Run scripts", "Both A and B", "Store environment variables"], answer: 2 },
    { type: "text", question: "What is the 'fs' module used for?", skill: "node", difficulty: "easy", hint: "File system operations." },
    { type: "mcq", question: "Which method is used to handle asynchronous errors in Express?", skill: "node", difficulty: "hard", options: ["try/catch", ".catch()", "next(error)", "All of the above"], answer: 3 }
  ],
  python: [
    { type: "text", question: "What is Python?", skill: "python", difficulty: "easy", hint: "High‑level interpreted language." },
    { type: "mcq", question: "Which keyword is used to define a function in Python?", skill: "python", difficulty: "easy", options: ["def", "function", "func", "define"], answer: 0 },
    { type: "text", question: "Explain list comprehension.", skill: "python", difficulty: "easy", hint: "Concise way to create lists." },
    { type: "mcq", question: "What is the output of 'print(2**3)'?", skill: "python", difficulty: "easy", options: ["6", "8", "9", "5"], answer: 1 },
    { type: "text", question: "What is the difference between a list and a tuple?", skill: "python", difficulty: "medium", hint: "Mutable vs immutable." },
    { type: "mcq", question: "Which module is used for regular expressions in Python?", skill: "python", difficulty: "medium", options: ["re", "regex", "regexp", "pyregex"], answer: 0 },
    { type: "text", question: "Explain decorators in Python.", skill: "python", difficulty: "hard", hint: "Functions that modify other functions." },
    { type: "mcq", question: "What is a virtual environment in Python?", skill: "python", difficulty: "medium", options: ["Isolated Python environment", "A cloud IDE", "A debugger", "A package manager"], answer: 0 },
    { type: "text", question: "What is PEP 8?", skill: "python", difficulty: "easy", hint: "Python style guide." },
    { type: "mcq", question: "Which statement is used to handle exceptions in Python?", skill: "python", difficulty: "easy", options: ["try/except", "try/catch", "throw/catch", "error/handle"], answer: 0 }
  ],
  java: [
    { type: "text", question: "Explain OOP principles in Java.", skill: "java", difficulty: "easy", hint: "Encapsulation, inheritance, polymorphism, abstraction." },
    { type: "mcq", question: "Which keyword is used to inherit a class in Java?", skill: "java", difficulty: "easy", options: ["extends", "implements", "inherits", "super"], answer: 0 },
    { type: "text", question: "What is the JVM?", skill: "java", difficulty: "easy", hint: "Java Virtual Machine – runs bytecode." },
    { type: "mcq", question: "What is the default value of a boolean in Java?", skill: "java", difficulty: "medium", options: ["true", "false", "null", "0"], answer: 1 },
    { type: "text", question: "Explain the difference between an interface and an abstract class.", skill: "java", difficulty: "medium", hint: "Interfaces have only abstract methods (before Java 8)." },
    { type: "mcq", question: "Which collection is synchronized in Java?", skill: "java", difficulty: "hard", options: ["ArrayList", "HashSet", "Vector", "HashMap"], answer: 2 },
    { type: "text", question: "What is multithreading in Java?", skill: "java", difficulty: "medium", hint: "Running multiple threads concurrently." },
    { type: "mcq", question: "Which package contains the 'Scanner' class?", skill: "java", difficulty: "easy", options: ["java.util", "java.io", "java.lang", "java.net"], answer: 0 },
    { type: "text", question: "Explain the 'finally' block in exception handling.", skill: "java", difficulty: "medium", hint: "Always executes, regardless of exception." },
    { type: "mcq", question: "What does the 'static' keyword mean?", skill: "java", difficulty: "easy", options: ["Belongs to class, not instance", "Cannot be changed", "Only one instance", "Final variable"], answer: 0 }
  ],
  dsa: [
    { type: "text", question: "What is a data structure?", skill: "dsa", difficulty: "easy", hint: "A way to store and organize data." },
    { type: "mcq", question: "Which data structure uses LIFO?", skill: "dsa", difficulty: "easy", options: ["Queue", "Stack", "Array", "LinkedList"], answer: 1 },
    { type: "text", question: "Explain the difference between an array and a linked list.", skill: "dsa", difficulty: "easy", hint: "Contiguous vs non‑contiguous memory." },
    { type: "mcq", question: "What is the time complexity of binary search on a sorted array?", skill: "dsa", difficulty: "medium", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], answer: 1 },
    { type: "text", question: "What is recursion?", skill: "dsa", difficulty: "easy", hint: "Function calling itself." },
    { type: "mcq", question: "Which sorting algorithm has the best average time complexity?", skill: "dsa", difficulty: "medium", options: ["Bubble sort", "Quick sort", "Insertion sort", "Selection sort"], answer: 1 },
    { type: "text", question: "Explain Big O notation.", skill: "dsa", difficulty: "medium", hint: "Describes upper bound of complexity." },
    { type: "mcq", question: "What is a hash table?", skill: "dsa", difficulty: "medium", options: ["Key‑value store", "Sorted list", "Tree structure", "Graph"], answer: 0 },
    { type: "text", question: "What is a binary search tree?", skill: "dsa", difficulty: "hard", hint: "Tree where left child < parent < right child." },
    { type: "mcq", question: "Which data structure is used for BFS?", skill: "dsa", difficulty: "medium", options: ["Queue", "Stack", "Heap", "Graph"], answer: 0 }
  ]
};

// MCQ banks (English, Aptitude) already have 5 each; we'll keep them as is.

/* ================= ENGLISH MCQ ================= */
const englishMCQ = [
  { type: "mcq", question: "Choose synonym of Rapid", options: ["Slow", "Fast", "Heavy", "Late"], answer: 1 },
  { type: "mcq", question: "Fill blank: She ___ to school daily.", options: ["go", "goes", "gone", "going"], answer: 1 },
  { type: "mcq", question: "Antonym of Honest", options: ["Truthful", "Loyal", "Dishonest", "Kind"], answer: 2 },
  { type: "mcq", question: "Correct spelling", options: ["Definately", "Definitely", "Definetly", "Definatly"], answer: 1 },
  { type: "mcq", question: "One who writes poems", options: ["Poet", "Painter", "Singer", "Writer"], answer: 0 }
];

/* ================= APTITUDE MCQ ================= */
const aptitudeMCQ = [
  { type: "mcq", question: "2x = 10 find x", options: ["2", "5", "10", "20"], answer: 1 },
  { type: "mcq", question: "15% of 200", options: ["20", "25", "30", "40"], answer: 2 },
  { type: "mcq", question: "Average of 10 and 20", options: ["15", "20", "10", "25"], answer: 0 },
  { type: "mcq", question: "Speed formula", options: ["Distance/Time", "Time/Distance", "Distance*Time", "None"], answer: 0 },
  { type: "mcq", question: "2^3 equals", options: ["6", "8", "9", "4"], answer: 1 }
];

/* ================= GENERATE QUESTIONS ================= */
router.post('/generate', authMiddleware, (req, res) => {
  const { role, type, difficulty = 'medium' } = req.body;

  if (type === "english") {
    return res.json({ questions: englishMCQ });
  }
  if (type === "aptitude") {
    return res.json({ questions: aptitudeMCQ });
  }

  const allQuestions = technicalQuestions[role] || technicalQuestions.frontend;
  // Filter by difficulty (if needed)
  const filtered = allQuestions.filter(q => q.difficulty === difficulty);
  // Return filtered, or all if none match (but we have 10 each, so filtered will have ~3-4)
  res.json({ questions: filtered.length ? filtered : allQuestions });
});

// ----------------------------- HINT endpoint (unchanged) -----------------------------
router.get('/hint', authMiddleware, (req, res) => {
  const { role, difficulty, index } = req.query;
  const roleQuestions = technicalQuestions[role] || technicalQuestions.frontend;
  const filtered = roleQuestions.filter(q => q.difficulty === difficulty);
  const question = filtered[index] || roleQuestions[index];
  res.json({ hint: question?.hint || "No hint available." });
});

// ----------------------------- EVALUATE (unchanged) -----------------------------
router.post('/evaluate', authMiddleware, async (req, res) => {
  const { answer, questionObj, timeSpent } = req.body;
  let score = 0;
  let feedback = [];

  if (questionObj.type === 'mcq') {
    const isCorrect = (parseInt(answer) === questionObj.answer);
    score = isCorrect ? 10 : 0;
    feedback = isCorrect ? ['Correct!'] : ['Wrong answer.'];
  } else if (questionObj.type === 'coding') {
    score = answer.length > 50 ? 8 : 5;
    feedback = ['Code evaluated (simulated).'];
  } else {
    score = answer.length > 50 ? 7 : 4;
    feedback = answer.length > 50 ? ['Good detail.'] : ['Try to elaborate.'];
  }

  res.json({ score, feedback });
});

// ----------------------------- SAVE INTERVIEW (unchanged) -----------------------------
router.post('/save', authMiddleware, async (req, res) => {
  const { role, difficulty, totalScore, answers } = req.body;
  const user = await User.findById(req.user.id);
  const xpEarned = Math.round(totalScore * 10); // simple formula

  const newInterview = new Interview({
    userId: req.user.id,
    role,
    difficulty,
    totalScore,
    xpEarned,
    answers
  });
  await newInterview.save();

  user.xp += xpEarned;
  user.lastPractice = new Date();
  user.level = Math.floor(user.xp / 100) + 1;
  await user.save();

  res.json({ message: "Interview saved", xpEarned, newLevel: user.level });
});

// ----------------------------- HISTORY (unchanged) -----------------------------
router.get('/history', authMiddleware, async (req, res) => {
  const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(history);
});

// ----------------------------- SKILL ANALYTICS (unchanged) -----------------------------
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