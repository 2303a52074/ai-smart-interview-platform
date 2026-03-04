const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Challenge = require('../models/Challenge'); // we'll create this model
const User = require('../models/User');

const router = express.Router();

// For simplicity, we'll use a fixed question pool and rotate daily.
// In production, store challenges in DB with a date field.

const challengePool = [
    { type: 'text', question: 'What is a closure in JavaScript?', skill: 'javascript', answerHint: 'Function with access to outer scope' },
    { type: 'text', question: 'Explain the box model in CSS.', skill: 'css', answerHint: 'Margin, border, padding, content' },
    { type: 'coding', question: 'Write a function that reverses a string.', skill: 'javascript', initialCode: 'function reverse(str) {\n  // your code\n}' },
    // ... add more
];

let currentChallengeIndex = 0;
let lastDate = new Date().toDateString();

// Rotate challenge daily
function getTodaysChallenge() {
    const today = new Date().toDateString();
    if (today !== lastDate) {
        currentChallengeIndex = (currentChallengeIndex + 1) % challengePool.length;
        lastDate = today;
    }
    return challengePool[currentChallengeIndex];
}

// Get today's challenge
router.get('/today', authMiddleware, (req, res) => {
    res.json(getTodaysChallenge());
});

// Submit challenge answer
router.post('/submit', authMiddleware, async (req, res) => {
    const { answer } = req.body;
    const challenge = getTodaysChallenge();
    // Simple evaluation (you can improve)
    const score = answer.length > 20 ? 10 : 5;
    const xpEarned = score * 2;
    const user = await User.findById(req.user.id);
    user.xp += xpEarned;
    user.level = Math.floor(user.xp / 100) + 1;
    await user.save();
    res.json({ score, xpEarned, newLevel: user.level, message: 'Challenge completed!' });
});

module.exports = router;