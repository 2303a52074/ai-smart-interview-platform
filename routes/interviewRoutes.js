const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');

const router = express.Router();

/* ---------------- TECHNICAL QUESTIONS ---------------- */

const technicalQuestions = {
    frontend: [
        { question: "Explain Virtual DOM.", keywords: ["virtual dom","react","update"] },
        { question: "What is JSX?", keywords: ["javascript","xml","react"] },
        { question: "What is state in React?", keywords: ["state","data","component"] },
        { question: "Explain useEffect hook.", keywords: ["useeffect","side effect","hook"] },
        { question: "What is component lifecycle?", keywords: ["mount","update","unmount"] }
    ],
    backend: [
        { question: "What is REST API?", keywords: ["http","api","stateless"] },
        { question: "Explain middleware in Express.", keywords: ["middleware","request","response"] },
        { question: "What is JWT?", keywords: ["token","authentication","jwt"] },
        { question: "What is MongoDB?", keywords: ["nosql","database","collection"] },
        { question: "Difference between SQL and NoSQL?", keywords: ["sql","nosql","difference"] }
    ],
    general: [
        { question: "Explain OOPS concepts.", keywords: ["encapsulation","inheritance","polymorphism","abstraction"] },
        { question: "What is Data Structure?", keywords: ["data","structure","algorithm"] },
        { question: "Explain time complexity.", keywords: ["time","complexity","big o"] },
        { question: "What is recursion?", keywords: ["function","call","recursion"] },
        { question: "What is algorithm?", keywords: ["steps","procedure","problem"] }
    ]
};

/* ---------------- ENGLISH MCQ ---------------- */

const englishMCQ = [
    { question: "Choose synonym of Rapid", options: ["Slow","Fast","Heavy","Late"], answer: 1 },
    { question: "Fill: She ___ to school daily.", options: ["go","goes","gone","going"], answer: 1 },
    { question: "Antonym of Honest?", options: ["Truthful","Loyal","Dishonest","Kind"], answer: 2 },
    { question: "Choose correct spelling", options: ["Definately","Definitely","Definetly","Definatly"], answer: 1 },
    { question: "One who writes poems?", options: ["Poet","Painter","Singer","Writer"], answer: 0 }
];

/* ---------------- APTITUDE MCQ ---------------- */

const aptitudeMCQ = [
    { question: "If 2x=10, find x", options: ["2","5","10","20"], answer: 1 },
    { question: "15% of 200?", options: ["20","25","30","40"], answer: 2 },
    { question: "Average of 10 and 20?", options: ["15","20","10","25"], answer: 0 },
    { question: "Speed = ?", options: ["Distance/Time","Time/Distance","Distance*Time","None"], answer: 0 },
    { question: "2^3 = ?", options: ["6","8","9","4"], answer: 1 }
];

/* ---------------- GENERATE QUESTIONS ---------------- */

router.post('/generate', authMiddleware, (req, res) => {

    const { role, type } = req.body;

    if(type === "english"){
        return res.json({ questions: englishMCQ });
    }

    if(type === "aptitude"){
        return res.json({ questions: aptitudeMCQ });
    }

    const selected = technicalQuestions[role] || technicalQuestions.general;

    return res.json({ questions: selected });
});

/* ---------------- EVALUATE TECHNICAL ---------------- */

router.post('/evaluate', authMiddleware, (req, res) => {

    const { role, questionIndex, answer } = req.body;

    const selected = technicalQuestions[role] || technicalQuestions.general;
    const questionData = selected[questionIndex];

    if(!questionData){
        return res.json({ score: 0, feedback: "Invalid Question" });
    }

    let score = 0;
    const lower = answer.toLowerCase();

    questionData.keywords.forEach(k=>{
        if(lower.includes(k)) score += 20;
    });

    score = Math.min(score,100);

    res.json({
        score,
        feedback: score >= 60 ? "Good Answer" : "Needs Improvement"
    });
});

/* ---------------- EVALUATE MCQ ---------------- */

router.post('/evaluate-mcq', authMiddleware, (req, res) => {

    const { type, questionIndex, selectedOption } = req.body;

    const set = type === "english" ? englishMCQ : aptitudeMCQ;

    const correct = set[questionIndex]?.answer;

    if(correct === undefined){
        return res.json({ score:0, correctAnswer:null });
    }

    const score = selectedOption === correct ? 20 : 0;

    res.json({
        score,
        correctAnswer: correct
    });
});

/* ---------------- SAVE INTERVIEW ---------------- */

router.post('/save', authMiddleware, async (req,res)=>{

    const { role, totalScore } = req.body;

    const newInterview = new Interview({
        userId: req.user.id,
        role,
        totalScore
    });

    await newInterview.save();

    res.json({ message:"Saved" });
});

/* ---------------- HISTORY ---------------- */

router.get('/history', authMiddleware, async (req,res)=>{

    const history = await Interview.find({ userId:req.user.id })
    .sort({ createdAt:-1 });

    res.json(history);
});

/* ---------------- DELETE ---------------- */

router.delete('/delete/:id', authMiddleware, async (req,res)=>{

    await Interview.findByIdAndDelete(req.params.id);

    res.json({ message:"Deleted" });
});

module.exports = router;