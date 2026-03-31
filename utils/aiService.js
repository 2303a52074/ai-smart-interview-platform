const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate Interview Question (WITH RANDOMNESS)
 */
async function generateQuestion(role, difficulty) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

  // Random topics to avoid repetition
  const topics = [
    "performance",
    "optimization",
    "debugging",
    "real-world scenario",
    "design",
    "edge cases"
  ];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const prompt = `
You are a technical interviewer.

Generate ONE ${difficulty} level interview question for a ${role}.

Focus on ${randomTopic}.

Rules:
- Keep it SHORT (max 2-3 lines)
- No explanations
- No quotes
- No extra text
- Ask a DIFFERENT question every time
- Avoid repeating previous questions

Output only the question.
`;

  try {
    const result = await model.generateContent(prompt);
    let questionText = result.response.text().trim();

    // Clean output
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
      hint: `Think about ${randomTopic} and core ${role} concepts.`
    };
  } catch (error) {
    console.error('Gemini API error (generateQuestion):', error.message);
    throw new Error('AI generation failed');
  }
}

/**
 * Evaluate Text Answer
 */
async function evaluateAnswer(question, answer) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

  const prompt = `
You are a strict technical interviewer.

Evaluate the answer.

Question:
${question}

Answer:
${answer}

Rules:
- Give score from 1 to 10
- Be strict but fair
- Mention correct points
- Mention missing points
- Keep feedback short (2-3 lines)

IMPORTANT:
Return ONLY valid JSON.

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
        feedback: "Basic answer. Improve explanation and coverage."
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
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

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
Return ONLY valid JSON.

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
        feedback: "Code partially correct. Needs optimization."
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
