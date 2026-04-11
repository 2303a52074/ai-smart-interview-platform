require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate Interview Question (SAFE VERSION)
 */
async function generateQuestion(role, difficulty) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const topics = [
      "performance",
      "optimization",
      "debugging",
      "real-world scenario",
      "design",
      "edge cases",
      "scalability",
      "security"
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const uniqueSeed = Date.now() + Math.random();

    const prompt = `
You are a technical interviewer.

Generate ONE UNIQUE ${difficulty} level interview question for a ${role}.

Focus on ${randomTopic}.
Seed: ${uniqueSeed}

Rules:
- MUST be different every time
- Keep it SHORT (max 2 lines)
- No explanations
- No quotes
- Only the question

Output only the question.
`;

    const result = await model.generateContent(prompt);
    let questionText = result.response.text().trim();

    // Clean text
    questionText = questionText
      .replace(/["']/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    // 🔥 Safety check
    if (!questionText || questionText.length < 5) {
      throw new Error("Empty response");
    }

    return {
      type: 'text',
      question: questionText,
      skill: role,
      difficulty: difficulty,
      keywords: [],
      hint: `Think about ${randomTopic} and ${role} fundamentals.`
    };

  } catch (error) {
    console.error('Gemini ERROR (generateQuestion):', error.message);

    // ✅ FALLBACK (VERY IMPORTANT)
    return {
      type: 'text',
      question: "Explain time complexity of binary search.",
      skill: role,
      difficulty: difficulty,
      keywords: [],
      hint: "Think about efficiency and divide & conquer."
    };
  }
}

/**
 * Evaluate Text Answer (SAFE JSON)
 */
async function evaluateAnswer(question, answer) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a strict technical interviewer.

Evaluate the answer.

Question:
${question}

Answer:
${answer}

Rules:
- Give score from 1 to 10
- Mention correct points
- Mention missing points
- Keep feedback short (2 lines)

IMPORTANT:
Return ONLY JSON.

Format:
{
  "score": number,
  "feedback": "string"
}
`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed) throw new Error("Invalid JSON");

    return parsed;

  } catch (error) {
    console.error('Gemini ERROR (evaluateAnswer):', error.message);

    return {
      score: 5,
      feedback: "Basic answer. Add more depth and clarity."
    };
  }
}

/**
 * Evaluate Coding Answer (SAFE JSON)
 */
async function evaluateCode(question, code) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an expert coding interviewer.

Evaluate the code.

Problem:
${question}

Code:
${code}

Rules:
- Give score from 1 to 10
- Check correctness
- Check logic
- Suggest improvements
- Mention edge cases
- Keep feedback short

IMPORTANT:
Return ONLY JSON.

Format:
{
  "score": number,
  "feedback": "string"
}
`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed) throw new Error("Invalid JSON");

    return parsed;

  } catch (error) {
    console.error('Gemini ERROR (evaluateCode):', error.message);

    return {
      score: 5,
      feedback: "Code needs improvement. Handle edge cases better."
    };
  }
}

module.exports = {
  generateQuestion,
  evaluateAnswer,
  evaluateCode
};
