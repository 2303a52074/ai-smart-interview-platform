const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const User = require('../models/User');
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

// Import AI service functions
const { generateQuestion, evaluateAnswer } = require('../utils/aiService');

// ----------------------------- Helper: Evaluate answer with keywords (fallback) -----------------------------
function evaluateAnswerFallback(answer, keywords, minLength = 20) {
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
      feedback.push('Your answer missed key technical terms. Try to include specific concepts.');
    } else if (matchedCount < keywords.length / 2) {
      feedback.push('Good start, but you missed several important points.');
    } else {
      feedback.push('You covered most of the key concepts well.');
    }
  }

  if (answer.length < minLength) {
    feedback.push('Your answer is quite short – elaborate more for a better score.');
  } else {
    feedback.push('Good detail in your explanation.');
  }

  if (sentences.length < 2) {
    feedback.push('Try structuring your answer into clear sentences.');
  }

  return { score: totalScore, feedback };
}

// ----------------------------- XP calculation -----------------------------
function calculateXP(score, difficulty) {
  const base = score * 10;
  const multiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
  return Math.round(base * multiplier);
}

/* ================= FULL STATIC QUESTION BANKS (FALLBACK) ================= */
const technicalQuestions = {
  frontend: [
    { type: "text", question: "What is the Virtual DOM in React?", keywords: ["virtual dom", "react", "update"], skill: "react", difficulty: "easy", hint: "A lightweight copy of the real DOM for performance." },
    { type: "text", question: "Explain the difference between '==' and '===' in JavaScript.", keywords: ["equality", "strict", "type"], skill: "javascript", difficulty: "easy", hint: "Equality vs strict equality." },
    { type: "mcq", question: "Which CSS property is used to create a flex container?", options: ["display: flex", "position: flex", "flex-container: true", "flex-box: inline"], answer: 0, skill: "css", difficulty: "easy" },
    { type: "text", question: "What is event delegation in JavaScript?", keywords: ["event", "delegation", "bubbling"], skill: "javascript", difficulty: "medium", hint: "Attaching an event listener to a parent to handle events on children." },
    { type: "mcq", question: "In React, what is the purpose of the 'useEffect' hook?", options: ["To handle side effects", "To create state", "To render JSX", "To handle routing"], answer: 0, skill: "react", difficulty: "medium" },
    { type: "text", question: "Explain the box model in CSS.", keywords: ["content", "padding", "border", "margin"], skill: "css", difficulty: "medium", hint: "Content, padding, border, margin." },
    { type: "mcq", question: "Which of the following is a JavaScript framework?", options: ["React", "Laravel", "Django", "Flask"], answer: 0, skill: "javascript", difficulty: "easy" },
    { type: "text", question: "What is a Promise in JavaScript?", keywords: ["async", "future", "then", "catch"], skill: "javascript", difficulty: "medium", hint: "An object representing eventual completion of an async operation." },
    { type: "mcq", question: "What does 'npm' stand for?", options: ["Node Package Manager", "New Project Manager", "Node Project Module", "Never Publish Modules"], answer: 0, skill: "node", difficulty: "easy" },
    { type: "text", question: "Explain the concept of 'hoisting' in JavaScript.", keywords: ["variable", "function", "declaration", "scope"], skill: "javascript", difficulty: "hard", hint: "Variables and function declarations are moved to the top." }
  ],
  backend: [
    { type: "text", question: "What is RESTful API design?", keywords: ["http", "stateless", "resource"], skill: "api", difficulty: "easy", hint: "Uses HTTP methods and stateless communication." },
    { type: "mcq", question: "Which HTTP method is used to update a resource?", options: ["GET", "POST", "PUT", "DELETE"], answer: 2, skill: "api", difficulty: "easy" },
    { type: "text", question: "Explain middleware in Express.js.", keywords: ["request", "response", "next"], skill: "node", difficulty: "easy", hint: "Functions that have access to request and response objects." },
    { type: "mcq", question: "What is the primary purpose of JWT?", options: ["Authentication", "Encryption", "Data compression", "Caching"], answer: 0, skill: "security", difficulty: "medium" },
    { type: "text", question: "What is the difference between SQL and NoSQL databases?", keywords: ["relational", "schema", "document"], skill: "database", difficulty: "medium", hint: "Relational vs non‑relational." },
    { type: "mcq", question: "Which of the following is a NoSQL database?", options: ["MySQL", "PostgreSQL", "MongoDB", "SQLite"], answer: 2, skill: "database", difficulty: "easy" },
    { type: "text", question: "Explain the concept of 'load balancing'.", keywords: ["traffic", "distribution", "servers"], skill: "devops", difficulty: "medium", hint: "Distributing network traffic across multiple servers." },
    { type: "mcq", question: "What does the 'cors' package do in Node.js?", options: ["Enables Cross-Origin Resource Sharing", "Compresses responses", "Logs requests", "Manages cookies"], answer: 0, skill: "node", difficulty: "medium" },
    { type: "text", question: "What is a microservice architecture?", keywords: ["independent", "services", "distributed"], skill: "architecture", difficulty: "hard", hint: "Breaking an application into small, independent services." },
    { type: "mcq", question: "Which protocol is used for secure communication over the internet?", options: ["HTTP", "FTP", "HTTPS", "SMTP"], answer: 2, skill: "security", difficulty: "easy" }
  ],
  react: [
    { type: "text", question: "What is JSX?", keywords: ["javascript", "xml", "syntax"], skill: "react", difficulty: "easy", hint: "JavaScript XML – syntax extension for React." },
    { type: "mcq", question: "Which hook is used for state in functional components?", options: ["useState", "useEffect", "useContext", "useReducer"], answer: 0, skill: "react", difficulty: "easy" },
    { type: "text", question: "Explain the purpose of the 'key' prop in lists.", keywords: ["identify", "render", "performance"], skill: "react", difficulty: "easy", hint: "Helps React identify which items have changed." },
    { type: "mcq", question: "What does the 'useEffect' hook return?", options: ["A cleanup function", "A state value", "A JSX element", "Nothing"], answer: 0, skill: "react", difficulty: "medium" },
    { type: "text", question: "What is the difference between props and state?", keywords: ["readonly", "internal", "data"], skill: "react", difficulty: "medium", hint: "Props are read‑only, state is internal." },
    { type: "mcq", question: "Which method is used to render multiple elements in React?", options: ["map()", "forEach()", "filter()", "reduce()"], answer: 0, skill: "react", difficulty: "easy" },
    { type: "text", question: "Explain the concept of 'lifting state up'.", keywords: ["shared", "parent", "common"], skill: "react", difficulty: "medium", hint: "Moving state to a common ancestor." },
    { type: "mcq", question: "What is the purpose of React Router?", options: ["Navigation", "State management", "Styling", "API calls"], answer: 0, skill: "react", difficulty: "easy" },
    { type: "text", question: "What are controlled components?", keywords: ["input", "state", "value"], skill: "react", difficulty: "medium", hint: "Form inputs controlled by React state." },
    { type: "mcq", question: "Which hook is used to access the DOM element?", options: ["useRef", "useState", "useEffect", "useContext"], answer: 0, skill: "react", difficulty: "medium" }
  ],
  node: [
    { type: "text", question: "What is Node.js?", keywords: ["javascript", "runtime", "v8"], skill: "node", difficulty: "easy", hint: "JavaScript runtime built on Chrome's V8." },
    { type: "mcq", question: "Which module is used to create a web server in Node?", options: ["http", "fs", "path", "url"], answer: 0, skill: "node", difficulty: "easy" },
    { type: "text", question: "Explain the event loop in Node.js.", keywords: ["async", "callback", "single-threaded"], skill: "node", difficulty: "medium", hint: "Handles asynchronous callbacks." },
    { type: "mcq", question: "What does the 'express.json()' middleware do?", options: ["Parses JSON bodies", "Serves static files", "Logs requests", "Compresses responses"], answer: 0, skill: "node", difficulty: "medium" },
    { type: "text", question: "What is the difference between 'require' and 'import'?", keywords: ["commonjs", "es6", "module"], skill: "node", difficulty: "medium", hint: "CommonJS vs ES modules." },
    { type: "mcq", question: "Which command is used to install a package globally?", options: ["npm install -g", "npm install --save", "npm install --dev", "npm link"], answer: 0, skill: "node", difficulty: "easy" },
    { type: "text", question: "Explain the concept of 'middleware' in Express.", keywords: ["request", "response", "next"], skill: "node", difficulty: "medium", hint: "Functions that run during request/response cycle." },
    { type: "mcq", question: "What is the purpose of 'package.json'?", options: ["Manage dependencies", "Run scripts", "Both A and B", "Store environment variables"], answer: 2, skill: "node", difficulty: "easy" },
    { type: "text", question: "What is the 'fs' module used for?", keywords: ["file", "system", "read", "write"], skill: "node", difficulty: "easy", hint: "File system operations." },
    { type: "mcq", question: "Which method is used to handle asynchronous errors in Express?", options: ["try/catch", ".catch()", "next(error)", "All of the above"], answer: 3, skill: "node", difficulty: "hard" }
  ],
  python: [
    { type: "text", question: "What is Python?", keywords: ["interpreted", "high-level", "language"], skill: "python", difficulty: "easy", hint: "High‑level interpreted language." },
    { type: "mcq", question: "Which keyword is used to define a function in Python?", options: ["def", "function", "func", "define"], answer: 0, skill: "python", difficulty: "easy" },
    { type: "text", question: "Explain list comprehension.", keywords: ["list", "concise", "iteration"], skill: "python", difficulty: "easy", hint: "Concise way to create lists." },
    { type: "mcq", question: "What is the output of 'print(2**3)'?", options: ["6", "8", "9", "5"], answer: 1, skill: "python", difficulty: "easy" },
    { type: "text", question: "What is the difference between a list and a tuple?", keywords: ["mutable", "immutable", "sequence"], skill: "python", difficulty: "medium", hint: "Mutable vs immutable." },
    { type: "mcq", question: "Which module is used for regular expressions in Python?", options: ["re", "regex", "regexp", "pyregex"], answer: 0, skill: "python", difficulty: "medium" },
    { type: "text", question: "Explain decorators in Python.", keywords: ["function", "modify", "syntax"], skill: "python", difficulty: "hard", hint: "Functions that modify other functions." },
    { type: "mcq", question: "What is a virtual environment in Python?", options: ["Isolated Python environment", "A cloud IDE", "A debugger", "A package manager"], answer: 0, skill: "python", difficulty: "medium" },
    { type: "text", question: "What is PEP 8?", keywords: ["style", "guide", "conventions"], skill: "python", difficulty: "easy", hint: "Python style guide." },
    { type: "mcq", question: "Which statement is used to handle exceptions in Python?", options: ["try/except", "try/catch", "throw/catch", "error/handle"], answer: 0, skill: "python", difficulty: "easy" }
  ],
  java: [
    { type: "text", question: "Explain OOP principles in Java.", keywords: ["encapsulation", "inheritance", "polymorphism", "abstraction"], skill: "java", difficulty: "easy", hint: "Encapsulation, inheritance, polymorphism, abstraction." },
    { type: "mcq", question: "Which keyword is used to inherit a class in Java?", options: ["extends", "implements", "inherits", "super"], answer: 0, skill: "java", difficulty: "easy" },
    { type: "text", question: "What is the JVM?", keywords: ["java", "virtual", "machine"], skill: "java", difficulty: "easy", hint: "Java Virtual Machine – runs bytecode." },
    { type: "mcq", question: "What is the default value of a boolean in Java?", options: ["true", "false", "null", "0"], answer: 1, skill: "java", difficulty: "medium" },
    { type: "text", question: "Explain the difference between an interface and an abstract class.", keywords: ["abstract", "interface", "methods"], skill: "java", difficulty: "medium", hint: "Interfaces have only abstract methods (before Java 8)." },
    { type: "mcq", question: "Which collection is synchronized in Java?", options: ["ArrayList", "HashSet", "Vector", "HashMap"], answer: 2, skill: "java", difficulty: "hard" },
    { type: "text", question: "What is multithreading in Java?", keywords: ["thread", "concurrent", "parallel"], skill: "java", difficulty: "medium", hint: "Running multiple threads concurrently." },
    { type: "mcq", question: "Which package contains the 'Scanner' class?", options: ["java.util", "java.io", "java.lang", "java.net"], answer: 0, skill: "java", difficulty: "easy" },
    { type: "text", question: "Explain the 'finally' block in exception handling.", keywords: ["exception", "finally", "always"], skill: "java", difficulty: "medium", hint: "Always executes, regardless of exception." },
    { type: "mcq", question: "What does the 'static' keyword mean?", options: ["Belongs to class, not instance", "Cannot be changed", "Only one instance", "Final variable"], answer: 0, skill: "java", difficulty: "easy" }
  ],
  dsa: [
    { type: "text", question: "What is a data structure?", keywords: ["organize", "store", "data"], skill: "dsa", difficulty: "easy", hint: "A way to store and organize data." },
    { type: "mcq", question: "Which data structure uses LIFO?", options: ["Queue", "Stack", "Array", "LinkedList"], answer: 1, skill: "dsa", difficulty: "easy" },
    { type: "text", question: "Explain the difference between an array and a linked list.", keywords: ["contiguous", "memory", "nodes"], skill: "dsa", difficulty: "easy", hint: "Contiguous vs non‑contiguous memory." },
    { type: "mcq", question: "What is the time complexity of binary search on a sorted array?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], answer: 1, skill: "dsa", difficulty: "medium" },
    { type: "text", question: "What is recursion?", keywords: ["function", "calls", "itself"], skill: "dsa", difficulty: "easy", hint: "Function calling itself." },
    { type: "mcq", question: "Which sorting algorithm has the best average time complexity?", options: ["Bubble sort", "Quick sort", "Insertion sort", "Selection sort"], answer: 1, skill: "dsa", difficulty: "medium" },
    { type: "text", question: "Explain Big O notation.", keywords: ["complexity", "upper bound", "performance"], skill: "dsa", difficulty: "medium", hint: "Describes upper bound of complexity." },
    { type: "mcq", question: "What is a hash table?", options: ["Key‑value store", "Sorted list", "Tree structure", "Graph"], answer: 0, skill: "dsa", difficulty: "medium" },
    { type: "text", question: "What is a binary search tree?", keywords: ["left", "right", "sorted"], skill: "dsa", difficulty: "hard", hint: "Tree where left child < parent < right child." },
    { type: "mcq", question: "Which data structure is used for BFS?", options: ["Queue", "Stack", "Heap", "Graph"], answer: 0, skill: "dsa", difficulty: "medium" }
  ]
};

// MCQ banks
const englishMCQ = [
  { type: "mcq", question: "Choose synonym of Rapid", options: ["Slow", "Fast", "Heavy", "Late"], answer: 1, skill: "english" },
  { type: "mcq", question: "Fill blank: She ___ to school daily.", options: ["go", "goes", "gone", "going"], answer: 1, skill: "english" },
  { type: "mcq", question: "Antonym of Honest", options: ["Truthful", "Loyal", "Dishonest", "Kind"], answer: 2, skill: "english" },
  { type: "mcq", question: "Correct spelling", options: ["Definately", "Definitely", "Definetly", "Definatly"], answer: 1, skill: "english" },
  { type: "mcq", question: "One who writes poems", options: ["Poet", "Painter", "Singer", "Writer"], answer: 0, skill: "english" }
];

const aptitudeMCQ = [
  { type: "mcq", question: "2x = 10 find x", options: ["2", "5", "10", "20"], answer: 1, skill: "aptitude" },
  { type: "mcq", question: "15% of 200", options: ["20", "25", "30", "40"], answer: 2, skill: "aptitude" },
  { type: "mcq", question: "Average of 10 and 20", options: ["15", "20", "10", "25"], answer: 0, skill: "aptitude" },
  { type: "mcq", question: "Speed formula", options: ["Distance/Time", "Time/Distance", "Distance*Time", "None"], answer: 0, skill: "aptitude" },
  { type: "mcq", question: "2^3 equals", options: ["6", "8", "9", "4"], answer: 1, skill: "aptitude" }
];

const router = express.Router();

/* ================= GENERATE QUESTIONS ================= */
router.post('/generate', authMiddleware, async (req, res) => {
  const { role, type, difficulty = 'medium' } = req.body;

  // If English or Aptitude, use static banks
  if (type === "english") return res.json({ questions: englishMCQ });
  if (type === "aptitude") return res.json({ questions: aptitudeMCQ });

  try {
    // Try to generate 5 AI questions
    const questions = [];
    for (let i = 0; i < 5; i++) {
      const q = await generateQuestion(role, difficulty);
      questions.push(q);
    }
    res.json({ questions });
  } catch (error) {
    console.error('AI generation failed, using fallback questions:', error);
    // Fallback to static bank
    const allQuestions = technicalQuestions[role] || technicalQuestions.frontend;
    const filtered = allQuestions.filter(q => q.difficulty === difficulty);
    res.json({ questions: filtered.length ? filtered : allQuestions });
  }
});

/* ================= GET HINT ================= */
router.get('/hint', authMiddleware, (req, res) => {
  const { role, difficulty, index } = req.query;
  const roleQuestions = technicalQuestions[role] || technicalQuestions.frontend;
  const filtered = roleQuestions.filter(q => q.difficulty === difficulty);
  const question = filtered[index] || roleQuestions[index];
  res.json({ hint: question?.hint || "No hint available." });
});

/* ================= EVALUATE ANSWER ================= */
router.post('/evaluate', authMiddleware, async (req, res) => {
  const { answer, questionObj, timeSpent } = req.body;

  // For MCQ, handle directly
  if (questionObj.type === 'mcq') {
    const isCorrect = (parseInt(answer) === questionObj.answer);
    const score = isCorrect ? 10 : 0;
    const feedback = isCorrect ? ['Correct!'] : ['Wrong answer.'];
    return res.json({ score, feedback });
  }

  // For text questions, use AI evaluation
  try {
    const { score, feedback } = await evaluateAnswer(questionObj.question, answer);
    res.json({ score, feedback: [feedback] }); // keep array format for frontend
  } catch (error) {
    console.error('AI evaluation failed, using fallback:', error);
    // Fallback to keyword‑based evaluation
    const keywords = questionObj.keywords || [];
    const result = evaluateAnswerFallback(answer, keywords);
    res.json(result);
  }
});

/* ================= SAVE INTERVIEW ================= */
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

  user.xp += xpEarned;
  user.lastPractice = new Date();
  user.level = Math.floor(user.xp / 100) + 1;
  await user.save();

  res.json({ message: "Interview saved", xpEarned, newLevel: user.level });
});

/* ================= HISTORY ================= */
router.get('/history', authMiddleware, async (req, res) => {
  const history = await Interview.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(history);
});

/* ================= SKILL ANALYTICS ================= */
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