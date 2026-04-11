router.post('/exam', authMiddleware, async (req, res) => {
  try {
    const { role, difficulty = 'medium' } = req.body;

    askedQuestions.clear();
    askedMCQs.clear();

    const questions = [];

    // 7 MCQ
    for (let i = 0; i < 7; i++) {
      try {
        const q = await getUniqueMCQ(role, difficulty);
        questions.push({ ...q, type: 'mcq', skill: role, difficulty });
      } catch (err) {
        console.error("MCQ ERROR:", err.message);

        // ✅ fallback
        questions.push({
          question: "What is time complexity of binary search?",
          options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
          answer: "B",
          type: "mcq",
          skill: role,
          difficulty
        });
      }
    }

    // 2 THEORY
    for (let i = 0; i < 2; i++) {
      try {
        const q = await getUniqueQuestion(role, difficulty);
        questions.push({ ...q, type: 'text' });
      } catch (err) {
        console.error("THEORY ERROR:", err.message);

        // ✅ fallback
        questions.push({
          question: "Explain binary search.",
          type: "text",
          skill: role,
          difficulty
        });
      }
    }

    res.json({ questions });

  } catch (error) {
    console.error("EXAM ROUTE FAILED:", error);

    // ✅ NEVER FAIL FRONTEND
    res.json({
      questions: [
        {
          question: "Explain binary search.",
          type: "text"
        }
      ]
    });
  }
});
