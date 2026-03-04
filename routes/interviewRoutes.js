const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const User = require('../models/User');
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const router = express.Router();

// ----------------------------- Helper: Evaluate answer with keywords -----------------------------
function evaluateAnswer(answer, keywords, minLength = 20) {
  if (!answer || answer.trim().length === 0) {
    return { score: 0, feedback: 'No answer provided.' };
  }

  // Tokenize and stem the answer
  const answerTokens = tokenizer.tokenize(answer.toLowerCase());
  const stemmedAnswer = answerTokens.map(t => PorterStemmer.stem(t));

  // Stem the keywords as well
  const stemmedKeywords = keywords.map(k => PorterStemmer.stem(k.toLowerCase()));

  // Count how many keywords are present in the answer
  let matchedCount = 0;
  stemmedKeywords.forEach(sk => {
    if (stemmedAnswer.includes(sk)) matchedCount++;
  });

  // Calculate base score (percentage of keywords matched)
  const keywordScore = (matchedCount / keywords.length) * 10; // scale to 10

  // Bonus for answer length (encourages elaboration)
  const lengthBonus = answer.length > minLength ? 1 : 0;

  // Bonus for good grammar/sentence structure (simple heuristic: number of sentences)
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const structureBonus = sentences.length >= 3 ? 1 : 0;

  // Total score, capped at 10
  let totalScore = Math.min(10, Math.round(keywordScore + lengthBonus + structureBonus));

  // Generate feedback
  let feedback = [];
  if (matchedCount === 0) {
    feedback.push('Your answer missed key technical terms. Try to include specific concepts.');
  } else if (matchedCount < keywords.length / 2) {
    feedback.push('Good start, but you missed several important points.');
  } else {
    feedback.push('You covered most of the key concepts well.');
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

// ----------------------------- Helper: XP calculation -----------------------------
function calculateXP(score, difficulty) {
  const base = score * 10;
  const multiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
  return Math.round(base * multiplier);
}

/* ================= TECHNICAL QUESTIONS (with keywords) ================= */
// (Keep your existing technicalQuestions object exactly as before – it already has keywords)
// For brevity, I'm not repeating the whole object here, but make sure you include it.
// It should be identical to the one you've been using.
const technicalQuestions = { /* ... your existing questions ... */ };

/* ================= ENGLISH MCQ ================= */
const englishMCQ = [ /* ... your existing ... */ ];

/* ================= APTITUDE MCQ ================= */
const aptitudeMCQ = [ /* ... your existing ... */ ];

/* ================= GENERATE QUESTIONS ================= */
router.post('/generate', authMiddleware, (req, res) => {
  const { role, type, difficulty = 'medium' } = req.body;
  if (type === "english") return res.json({ questions: englishMCQ });
  if (type === "aptitude") return res.json({ questions: aptitudeMCQ });
  const allQuestions = technicalQuestions[role] || technicalQuestions.frontend;
  const filtered = allQuestions.filter(q => q.difficulty === difficulty);
  res.json({ questions: filtered.length ? filtered : allQuestions });
});

/* ================= GET HINT ================= */
router.get('/hint', authMiddleware, (req, res) => {
  const { role, difficulty, index } = req.query;
  const roleQuestions = technicalQuestions[role] || technicalQuestions.frontend;
  const filtered = roleQuestions.filter(q => q.difficulty === difficulty);
  const question = filtered[index] || roleQuestions[index];
  res.json({ hint: question?.hint || "No hint available." });
});

/* ================= EVALUATE ANSWER (Enhanced with keyword matching) ================= */
router.post('/evaluate', authMiddleware, async (req, res) => {
  const { answer, questionObj, timeSpent } = req.body;

  let score = 0;
  let feedback = [];

  if (questionObj.type === 'mcq') {
    // MCQ evaluation (unchanged)
    const isCorrect = (parseInt(answer) === questionObj.answer);
    score = isCorrect ? 10 : 0;
    feedback = isCorrect ? ['Correct!'] : ['Wrong answer.'];
  } else if (questionObj.type === 'coding') {
    // Coding questions: we can't easily evaluate without a full judge, so keep simple
    score = answer.length > 50 ? 8 : 5;
    feedback = ['Code evaluated (simulated).'];
  } else {
    // Text answer: use keyword‑based evaluation
    const keywords = questionObj.keywords || [];
    const result = evaluateAnswer(answer, keywords);
    score = result.score;
    feedback = result.feedback;
  }

  res.json({ score, feedback });
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