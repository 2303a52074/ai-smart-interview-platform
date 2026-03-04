const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Interview = require('../models/Interview');
const { Parser } = require('json2csv');

const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
});

// Update profile (name, email, theme, publicProfile)
router.put('/profile', authMiddleware, async (req, res) => {
    const { name, email, theme, publicProfile } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (theme) updates.theme = theme;
    if (publicProfile !== undefined) updates.publicProfile = publicProfile;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
});

// Export interview history as CSV
router.get('/export', authMiddleware, async (req, res) => {
    const interviews = await Interview.find({ userId: req.user.id }).lean();
    if (interviews.length === 0) {
        return res.status(404).json({ message: 'No data to export' });
    }
    const fields = ['role', 'difficulty', 'totalScore', 'xpEarned', 'date'];
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(interviews);
    res.header('Content-Type', 'text/csv');
    res.attachment('interviews.csv');
    res.send(csv);
});

// Leaderboard (top 10 users by XP, public profiles only)
router.get('/leaderboard', async (req, res) => {
    const users = await User.find({ publicProfile: true })
        .sort({ xp: -1 })
        .limit(10)
        .select('name xp level');
    res.json(users);
});

module.exports = router;