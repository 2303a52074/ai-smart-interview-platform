const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const User = require('../models/User');
const Interview = require('../models/Interview');

const router = express.Router();

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {

    const users = await User.find().select('-password');
    res.json(users);
});

router.get('/interviews', authMiddleware, adminMiddleware, async (req, res) => {

    const interviews = await Interview.find().populate('userId', 'name email');
    res.json(interviews);
});

module.exports = router;