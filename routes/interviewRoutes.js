router.post('/generate', async (req, res) => {
  console.log("🔥 GENERATE HIT");

  res.json({
    questions: [
      { question: "What is JavaScript?", type: "text" },
      { question: "Explain closures.", type: "text" },
      { question: "What is async/await?", type: "text" },
      { question: "Explain event loop.", type: "text" },
      { question: "What is REST API?", type: "text" }
    ]
  });
});
