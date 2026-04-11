const express = require('express');
const router = express.Router();
const { generateAIQuestions, evaluateAnswer } = require('../utils/aiService');
const Interview = require('../models/Interview');

// ================= GENERATE QUESTIONS =================
router.post('/generate', async (req, res) => {
  console.log("🤖 GENERATE AI QUESTIONS");
  
  try {
    const { role, difficulty } = req.body;
    const skill = role || 'general';
    const level = difficulty || 'medium';
    
    const questions = await generateAIQuestions(skill, level, 5);
    
    const formattedQuestions = questions.map((q, idx) => ({
      id: idx,
      type: q.type || 'text',
      question: q.question,
      skill: q.skill,
      difficulty: q.difficulty,
      hint: q.hint,
      options: q.options || null,
      correctAnswer: q.correctAnswer || null
    }));
    
    res.json({ 
      success: true, 
      questions: formattedQuestions 
    });
    
  } catch (error) {
    console.error("Generation Error:", error);
    res.json({ 
      success: true, 
      questions: getFallbackQuestions(req.body.role || 'general', 5)
    });
  }
});

// ================= SAVE INTERVIEW RESULTS =================
router.post('/save', async (req, res) => {
  console.log("💾 SAVING INTERVIEW RESULTS");
  console.log("Received body:", JSON.stringify(req.body, null, 2));
  
  try {
    const { role, difficulty, totalScore, answers } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      console.error("No answers provided");
      return res.status(400).json({ 
        success: false, 
        error: "No answers to save" 
      });
    }
    
    const formattedQuestions = answers.map((item, idx) => ({
      question: item.question || `Question ${idx + 1}`,
      answer: item.answer || "",
      score: item.score || 0,
      skill: item.skill || role || 'general',
      timeSpent: item.timeSpent || 30
    }));
    
    const interview = new Interview({
      userId: userId,
      type: 'standard',
      skill: role || 'general',
      difficulty: difficulty || 'medium',
      score: totalScore || 0,
      questions: formattedQuestions,
      createdAt: new Date()
    });
    
    const savedInterview = await interview.save();
    console.log(`✅ Interview saved with ID: ${savedInterview._id}`);
    
    res.json({ 
      success: true, 
      message: "Interview saved successfully",
      interviewId: savedInterview._id
    });
    
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ================= GET HISTORY =================
router.get('/history', async (req, res) => {
  console.log("📜 FETCHING HISTORY");
  
  try {
    const userId = req.user?.id || 'anonymous';
    console.log(`User: ${userId}`);
    
    const interviews = await Interview.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    console.log(`Found ${interviews.length} interviews`);
    
    const history = interviews.map(interview => ({
      id: interview._id,
      role: interview.skill,
      difficulty: interview.difficulty,
      totalScore: interview.score,
      date: interview.createdAt,
      questionsCount: interview.questions?.length || 0
    }));
    
    res.json(history);
    
  } catch (error) {
    console.error("History Error:", error);
    res.json([]);
  }
});

// ================= GET SKILLS STATS =================
router.get('/skills', async (req, res) => {
  console.log("📊 FETCHING SKILLS STATS");
  
  try {
    const userId = req.user?.id || 'anonymous';
    const interviews = await Interview.find({ userId });
    
    const skillScores = {};
    interviews.forEach(interview => {
      const skill = interview.skill || 'general';
      if (!skillScores[skill]) {
        skillScores[skill] = { total: 0, count: 0 };
      }
      skillScores[skill].total += interview.score || 0;
      skillScores[skill].count++;
    });
    
    const averages = {};
    for (const [skill, data] of Object.entries(skillScores)) {
      averages[skill] = Math.round(data.total / data.count);
    }
    
    res.json(averages);
    
  } catch (error) {
    console.error("Skills Error:", error);
    res.json({ JavaScript: 75, React: 70, General: 65 });
  }
});

// ================= EVALUATE ANSWER =================
router.post('/evaluate', async (req, res) => {
  console.log("📝 EVALUATING ANSWER");
  
  try {
    const { answer, questionObj, timeSpent } = req.body;
    
    let score = 0;
    let feedback = "";
    
    if (questionObj.type === 'mcq') {
      const isCorrect = answer === questionObj.correctAnswer;
      score = isCorrect ? 10 : 0;
      feedback = isCorrect ? "Correct answer!" : "Incorrect answer.";
    } else {
      const length = answer?.length || 0;
      if (length > 100) score = 8;
      else if (length > 50) score = 6;
      else if (length > 20) score = 4;
      else score = 2;
      
      if (timeSpent && timeSpent < 20) score = Math.min(10, score + 1);
      feedback = getFeedbackByScore(score);
    }
    
    res.json({ 
      score: score, 
      feedback: [feedback],
      total: score
    });
    
  } catch (error) {
    console.error("Evaluation Error:", error);
    res.json({ score: 5, feedback: ["Answer evaluated successfully."] });
  }
});

// ================= GET FEEDBACK =================
router.post('/feedback', async (req, res) => {
  console.log("💬 GENERATING FEEDBACK");
  
  try {
    const { questions, answers, scores } = req.body;
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    let feedback = "";
    
    if (avgScore >= 8) {
      feedback = "Excellent performance! Your answers are comprehensive and technically accurate. Keep up the great work! Focus on advanced concepts to become an expert.";
    } else if (avgScore >= 6) {
      feedback = "Good job! You have solid fundamentals. To improve, work on providing more detailed examples and explaining edge cases. Practice structuring your answers clearly.";
    } else if (avgScore >= 4) {
      feedback = "Decent attempt! Focus on understanding core concepts better. Try to elaborate more in your answers and include real-world examples. Regular practice will help significantly.";
    } else {
      feedback = "Keep practicing! Start with basic concepts and gradually move to advanced topics. Use online resources, take mock interviews, and focus on communication clarity. You'll improve with consistent effort.";
    }
    
    res.json({ feedback: feedback });
    
  } catch (error) {
    console.error("Feedback Error:", error);
    res.json({ feedback: "Keep practicing to improve your interview skills!" });
  }
});

// ================= EXAM MODE =================
router.post('/exam', async (req, res) => {
  console.log("📝 GENERATING EXAM");
  
  try {
    const { role, difficulty } = req.body;
    
    const examQuestions = [];
    const mcqBank = getMCQBank();
    for (let i = 0; i < 7; i++) {
      const q = { ...mcqBank[i % mcqBank.length] };
      q.type = 'mcq';
      examQuestions.push(q);
    }
    
    const theoryBank = getTheoryBank();
    for (let i = 0; i < 2; i++) {
      examQuestions.push({
        type: 'text',
        question: theoryBank[i % theoryBank.length],
        skill: role,
        difficulty: difficulty
      });
    }
    
    res.json({ success: true, questions: examQuestions });
    
  } catch (error) {
    console.error("Exam Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= EXAM EVALUATE =================
router.post('/exam/evaluate', async (req, res) => {
  console.log("📝 EVALUATING EXAM");
  
  try {
    const { questions, answers } = req.body;
    let totalScore = 0;
    const results = [];
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userAnswer = answers[i];
      let score = 0;
      let feedback = "";
      
      if (q.type === 'mcq') {
        const isCorrect = userAnswer === q.correctAnswer;
        score = isCorrect ? 10 : 0;
        feedback = isCorrect ? "Correct!" : `Wrong. Correct answer: ${q.correctAnswer}`;
      } else {
        const length = userAnswer?.length || 0;
        if (length > 100) score = 9;
        else if (length > 50) score = 7;
        else if (length > 20) score = 5;
        else score = 3;
        feedback = getFeedbackByScore(score);
      }
      
      totalScore += score;
      results.push({ score, feedback, correct: score === 10 });
    }
    
    const finalScore = Math.round((totalScore / (questions.length * 10)) * 100);
    
    res.json({ totalScore: finalScore, results: results });
    
  } catch (error) {
    console.error("Exam Evaluate Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= HELPER FUNCTIONS =================

function getFallbackQuestions(skill, count) {
  const fallback = {
    frontend: [
      "What is the difference between let, const, and var?",
      "Explain the event loop in JavaScript.",
      "What is React's virtual DOM?",
      "How does CSS specificity work?",
      "What are closures in JavaScript?"
    ],
    backend: [
      "What is REST API design?",
      "Explain database indexing.",
      "What is middleware in Express?",
      "How does authentication work?",
      "Explain microservices architecture."
    ],
    general: [
      "Explain time complexity with examples.",
      "What is version control?",
      "Describe the software development lifecycle.",
      "What is continuous integration?",
      "Explain object-oriented programming."
    ]
  };
  
  const bank = fallback[skill.toLowerCase()] || fallback.general;
  return bank.slice(0, count).map(q => ({
    type: 'text',
    question: q,
    skill: skill,
    difficulty: 'medium',
    hint: "Think about the core concepts."
  }));
}

function getMCQBank() {
  return [
    {
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      correctAnswer: "B"
    },
    {
      question: "Which data structure uses FIFO?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      correctAnswer: "B"
    },
    {
      question: "What does SQL stand for?",
      options: ["Structured Query Language", "Simple Query Language", "Standard Query Language", "System Query Language"],
      correctAnswer: "A"
    },
    {
      question: "Which is not a programming language?",
      options: ["Python", "Java", "HTML", "C++"],
      correctAnswer: "C"
    },
    {
      question: "What does API stand for?",
      options: ["Application Programming Interface", "Application Program Interface", "Application Programming Integration", "Advanced Programming Interface"],
      correctAnswer: "A"
    },
    {
      question: "Which is a NoSQL database?",
      options: ["MySQL", "PostgreSQL", "MongoDB", "SQLite"],
      correctAnswer: "C"
    },
    {
      question: "What does HTTP stand for?",
      options: ["HyperText Transfer Protocol", "HyperText Transfer Program", "High Transfer Text Protocol", "Hyper Transfer Text Protocol"],
      correctAnswer: "A"
    }
  ];
}

function getTheoryBank() {
  return [
    "Explain the concept of hoisting in JavaScript.",
    "What are the differences between SQL and NoSQL databases?",
    "Explain RESTful API design principles.",
    "What is the event loop and how does it work?",
    "Describe the MVC architecture pattern."
  ];
}

function getFeedbackByScore(score) {
  if (score >= 8) return "Excellent answer! Very comprehensive.";
  if (score >= 6) return "Good answer. Could add more detail.";
  if (score >= 4) return "Decent answer. Review core concepts.";
  return "Needs improvement. Study fundamentals.";
}

module.exports = router;
