const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { type: String, enum: ['interview_started', 'interview_completed', 'exam_taken'] },
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', historySchema);
