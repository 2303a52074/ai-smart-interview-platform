const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/* Storage Config */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/videos/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

/* Upload Video */
router.post('/upload', authMiddleware, upload.single('video'), (req, res) => {
    res.json({
        message: "Video uploaded successfully",
        filePath: req.file.path
    });
});

module.exports = router;