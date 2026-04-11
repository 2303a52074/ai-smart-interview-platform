const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['standard', 'exam'], default: 'standard' },
  skill: { type: String, default: 'general' },
  difficulty: { type: String, default: 'medium' },
  score: { type: Number, default: 0 },
  questions: [{
    question: String,
    answer: String,
    score: Number,
    skill: String,
    timeSpent: Number
  }],
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Interview', interviewSchema);
