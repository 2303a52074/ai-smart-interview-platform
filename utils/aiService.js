const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate Interview Question (NO REPEAT + RANDOM)
 */
async function generateQuestion(role, difficulty) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

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

  // Strong randomness
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

  try {
    const result = await model.generateContent(prompt);
    let questionText = result.response.text().trim();

    questionText = questionText
      .replace(/["']/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    return {
      type: 'text',
      question: questionText,
      skill: role,
      difficulty: difficulty,
      keywords: [],
      hint: `Think about ${randomTopic} and ${role} fundamentals.`
    };
  } catch (error) {
    console.error('Gemini API error (generateQuestion):', error.message);
    throw new Error('AI generation failed');
  }
}

/**
 * Evaluate Text Answer (ALWAYS RETURNS JSON)
 */
async function evaluateAnswer(question, answer) {
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

  try {
    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      return {
        score: 5,
        feedback: "Answer is basic. Needs more explanation and depth."
      };
    }
  } catch (error) {
    console.error('Gemini API error (evaluateAnswer):', error.message);

    return {
      score: 5,
      feedback: "Evaluation failed. Try again."
    };
  }
}

/**
 * Evaluate Coding Answer
 */
async function evaluateCode(question, code) {
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

  try {
    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      return {
        score: 5,
        feedback: "Code is partially correct. Improve logic and edge cases."
      };
    }
  } catch (error) {
    console.error('Gemini API error (evaluateCode):', error.message);

    return {
      score: 5,
      feedback: "Code evaluation failed."
    };
  }
}

module.exports = {
  generateQuestion,
  evaluateAnswer,
  evaluateCode
};
