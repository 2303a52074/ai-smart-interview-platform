const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/* ---------------- MULTER CONFIG ---------------- */

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

/* ---------------- JOB LINKS ---------------- */

const jobLinks = {
    "Frontend Developer":
        "https://www.linkedin.com/jobs/search/?keywords=Frontend%20Developer",
    "Backend Developer":
        "https://www.linkedin.com/jobs/search/?keywords=Backend%20Developer",
    "Full Stack Developer":
        "https://www.linkedin.com/jobs/search/?keywords=Full%20Stack%20Developer",
    "Data Analyst":
        "https://www.linkedin.com/jobs/search/?keywords=Data%20Analyst",
    "Machine Learning Engineer":
        "https://www.linkedin.com/jobs/search/?keywords=Machine%20Learning%20Engineer"
};

/* ---------------- RESUME ANALYSIS ---------------- */

router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {

    try {

        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text.toLowerCase();

        let matchedSkills = [];
        let suggestedJobs = [];

        /* FRONTEND */
        if (text.includes("react") || text.includes("javascript")) {
            matchedSkills.push("javascript");
            suggestedJobs.push("Frontend Developer");
        }

        /* BACKEND */
        if (text.includes("node") || text.includes("express")) {
            matchedSkills.push("node");
            suggestedJobs.push("Backend Developer");
        }

        /* FULL STACK */
        if (
            (text.includes("react") || text.includes("javascript")) &&
            (text.includes("node") || text.includes("express"))
        ) {
            suggestedJobs.push("Full Stack Developer");
        }

        /* DATA */
        if (text.includes("python") && text.includes("sql")) {
            matchedSkills.push("python", "sql");
            suggestedJobs.push("Data Analyst");
        }

        /* ML */
        if (text.includes("machine learning")) {
            matchedSkills.push("machine learning");
            suggestedJobs.push("Machine Learning Engineer");
        }

        matchedSkills = [...new Set(matchedSkills)];
        suggestedJobs = [...new Set(suggestedJobs)];

        const score = Math.min(matchedSkills.length * 20, 100);

        const jobResults = suggestedJobs.map(job => ({
            title: job,
            link: jobLinks[job]
        }));

        res.json({
            score,
            matchedSkills,
            suggestedJobs: jobResults
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Resume analysis failed" });
    }
});

module.exports = router;