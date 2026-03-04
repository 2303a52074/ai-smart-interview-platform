const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "user" },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    lastPractice: Date,
    theme: { type: String, default: 'dark' },        // for advanced themes
    publicProfile: { type: Boolean, default: false }, // for leaderboard
    github: {                                          // for GitHub integration
        username: String,
        repos: Array,
        languages: Object
    },
    googleCalendarConnected: Boolean,                  // for calendar integration
    calendarRefreshToken: String
});

module.exports = mongoose.model('User', UserSchema);