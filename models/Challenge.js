const mongoose = require('mongoose');
const ChallengeSchema = new mongoose.Schema({
    date: Date,
    question: String,
    type: String,
    skill: String
});
module.exports = mongoose.model('Challenge', ChallengeSchema);