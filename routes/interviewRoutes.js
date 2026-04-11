const express = require('express');
const router = express.Router();
const { generateAIQuestions } = require('../utils/aiService');
const Interview = require('../models/Interview'); // Create this model
const History = require('../models/History'); // Create this model

// ================= GENERATE AI QUESTIONS =================
router.post('/generate', async (req, res) => {
  console.log("🤖 GENERATE AI QUESTIONS");
  
  try {
    const { skill, difficulty, count = 5 } = req.body;
    
    // Call AI service
    const questions = await generateAIQuestions(skill, difficulty, count);
    
    // Store in database
    const interview = new Interview({
      userId: req.user?.id || 'anonymous',
      questions: questions,
      createdAt: new Date(),
      type: 'standard'
    });
    
    await interview.save();
    
    res.json({ 
      success: true, 
      questions: questions,
      interviewId: interview._id
    });
    
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate questions",
      details: error.message 
    });
  }
});

// ================= EXAM MODE WITH AI =================
router.post('/exam', async (req, res) => {
  console.log("📝 EXAM MODE WITH AI");
  
  try {
    const { skill, difficulty } = req.body;
    
    // Generate 10 questions for exam (7 MCQ + 3 Theory)
    const questions = await generateAIQuestions(skill, difficulty, 10);
    
    res.json({ 
      success: true, 
      questions: questions 
    });
    
  } catch (error) {
    console.error("Exam Generation Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate exam questions" 
    });
  }
});

// ================= GET DASHBOARD STATS =================
router.get('/dashboard/stats', async (req, res) => {
  console.log("📊 FETCHING DASHBOARD STATS");
  
  try {
    const userId = req.user?.id || 'anonymous';
    
    // Get all interviews for this user
    const interviews = await Interview.find({ userId });
    
    // Calculate statistics
    const totalInterviews = interviews.length;
    const totalQuestions = interviews.reduce((sum, i) => sum + (i.questions?.length || 0), 0);
    
    // Average score (if you have scores stored)
    const averageScore = interviews.reduce((sum, i) => sum + (i.score || 0), 0) / totalInterviews || 0;
    
    // Recent interviews (last 5)
    const recentInterviews = await Interview.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Skill breakdown
    const skillStats = {};
    interviews.forEach(interview => {
      const skill = interview.skill || 'general';
      if (!skillStats[skill]) skillStats[skill] = 0;
      skillStats[skill]++;
    });
    
    res.json({
      success: true,
      stats: {
        totalInterviews,
        totalQuestions,
        averageScore: Math.round(averageScore),
        skillBreakdown: skillStats,
        recentInterviews: recentInterviews.map(i => ({
          id: i._id,
          date: i.createdAt,
          score: i.score,
          skill: i.skill
        }))
      }
    });
    
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to load dashboard stats" 
    });
  }
});

// ================= GET HISTORY =================
router.get('/history', async (req, res) => {
  console.log("📜 FETCHING INTERVIEW HISTORY");
  
  try {
    const userId = req.user?.id || 'anonymous';
    const { page = 1, limit = 10 } = req.query;
    
    const interviews = await Interview.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Interview.countDocuments({ userId });
    
    res.json({
      success: true,
      history: interviews.map(i => ({
        id: i._id,
        date: i.createdAt,
        type: i.type,
        skill: i.skill,
        difficulty: i.difficulty,
        score: i.score,
        questionsCount: i.questions?.length || 0
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
    
  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to load history" 
    });
  }
});

// ================= GET SPECIFIC INTERVIEW DETAILS =================
router.get('/:interviewId', async (req, res) => {
  console.log("🔍 FETCHING INTERVIEW DETAILS");
  
  try {
    const interview = await Interview.findById(req.params.interviewId);
    
    if (!interview) {
      return res.status(404).json({ success: false, error: "Interview not found" });
    }
    
    res.json({
      success: true,
      interview: {
        id: interview._id,
        questions: interview.questions,
        answers: interview.answers,
        score: interview.score,
        feedback: interview.feedback,
        createdAt: interview.createdAt
      }
    });
    
  } catch (error) {
    console.error("Details Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to load interview details" 
    });
  }
});

// ================= SUBMIT ANSWERS & EVALUATE =================
router.post('/evaluate/:interviewId', async (req, res) => {
  console.log("📝 EVALUATING ANSWERS");
  
  try {
    const { answers } = req.body;
    const interview = await Interview.findById(req.params.interviewId);
    
    if (!interview) {
      return res.status(404).json({ success: false, error: "Interview not found" });
    }
    
    // Simple evaluation logic (you can enhance with AI)
    let totalScore = 0;
    const evaluationResults = [];
    
    interview.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      let score = 0;
      let feedback = "";
      
      if (question.type === 'mcq') {
        score = userAnswer === question.correctAnswer ? 10 : 0;
        feedback = score === 10 ? "Correct!" : "Incorrect";
      } else {
        // Basic scoring for theory questions
        const length = userAnswer?.length || 0;
        if (length > 100) score = 10;
        else if (length > 50) score = 7;
        else if (length > 20) score = 4;
        else score = 1;
        
        feedback = score > 7 ? "Good answer!" : "Need more detail";
      }
      
      totalScore += score;
      evaluationResults.push({ question, userAnswer, score, feedback });
    });
    
    const percentage = Math.round((totalScore / (interview.questions.length * 10)) * 100);
    
    interview.answers = answers;
    interview.score = percentage;
    interview.feedback = evaluationResults;
    await interview.save();
    
    res.json({
      success: true,
      score: percentage,
      results: evaluationResults,
      totalScore: totalScore,
      maxScore: interview.questions.length * 10
    });
    
  } catch (error) {
    console.error("Evaluation Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to evaluate answers" 
    });
  }
});

module.exports = router;
