console.log('✅ LOADED AI‑ONLY INTERVIEW ROUTES');
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const User = require('../models/User');
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const { generateQuestion, evaluateAnswer } = require('../utils/aiService');

const router = express.Router();

// ----------------------------- FALLBACK ANSWER EVALUATION -----------------------------
function evaluateAnswerFallback(answer, keywords = [], minLength = 20) {
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
      feedback.push('Your answer missed key technical terms.');
    } else if (matchedCount < keywords.length / 2) {
      feedback.push('Good start but missed some important points.');
    } else {
      feedback.push('You covered most key concepts.');
    }
  }

  if (answer.length < minLength) {
    feedback.push('Your answer is short. Try explaining more.');
  }

  if (sentences.length < 2) {
    feedback.push('Structure your answer using clear sentences.');
  }

  return { score: totalScore, feedback };
}

// ================= GENERATE QUESTIONS (AI ONLY) =================
router.post('/generate', authMiddleware, async (req, res) => {
  const { role, difficulty = 'medium' } = req.body;

  const questions = [];
  const numberOfQuestions = 5;

  for (let i = 0; i < numberOfQuestions; i++) {
    try {
      const q = await generateQuestion(role, difficulty);
      questions.push(q);
    } catch (error) {
      console.error("AI question generation failed:", error.message);
      questions.push({
        type: 'text',
        question: `Explain a key concept related to ${role}.`,
        skill: role,
        difficulty: difficulty,
        keywords: [],
        hint: `Think about important fundamentals in ${role}.`
      });
    }
  }

  res.json({ questions });
});

// ================= GET HINT =================
router.get('/hint', authMiddleware, (req, res) => {
  res.json({
    hint: "Think about the core concepts and explain step by step."
  });
});

// ================= EVALUATE ANSWER =================
router.post('/evaluate', authMiddleware, async (req, res) => {
  const { answer, questionObj } = req.body;

  try {
    const { score, feedback } = await evaluateAnswer(
      questionObj.question,
      answer
    );
    res.json({
      score,
      feedback: [feedback]
    });
  } catch (error) {
    console.error('AI evaluation failed, using fallback');
    const result = evaluateAnswerFallback(answer, questionObj.keywords);
    res.json(result);
  }
});

// ================= SAVE INTERVIEW =================
router.post('/save', authMiddleware, async (req, res) => {
  const { role, difficulty, totalScore, answers } = req.body;

  const newInterview = new Interview({
    userId: req.user.id,
    role,
    difficulty,
    totalScore,
    answers
  });

  await newInterview.save();

  res.json({
    message: "Interview saved successfully"
  });
});

// ================= HISTORY =================
router.get('/history', authMiddleware, async (req, res) => {
  const history = await Interview
    .find({ userId: req.user.id })
    .sort({ createdAt: -1 });
  res.json(history);
});

// ================= SKILL ANALYTICS =================
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