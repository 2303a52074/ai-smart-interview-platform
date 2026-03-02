require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const videoRoutes = require('./routes/videoRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/video', videoRoutes);

if (!process.env.MONGO_URI) {
    console.log("MONGO_URI not found!");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("Mongo URI:", process.env.MONGO_URI);;
});
