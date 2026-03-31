const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate Interview Question
 */
async function generateQuestion(role, difficulty) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

  const prompt = `
You are an experienced technical interviewer.

Generate ONE ${difficulty} level interview question for a ${role} role.

Requirements:
- Real-world and interview-relevant
- Tests core concepts and problem-solving
- Prefer scenario-based questions
- Avoid generic definitions

Output only the question.
`;

  try {
    const result = await model.generateContent(prompt);
    const questionText = result.response.text().trim();

    return {
      type: 'text',
      question: questionText,
      skill: role,
      difficulty: difficulty,
      keywords: [],
      hint: `Think about real-world use of ${role} concepts and edge cases.`
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

Evaluate the candidate's answer based on:
- Correctness
- Depth
- Clarity
- Coverage of key points

Question:
"${question}"

Answer:
"${answer}"

Instructions:
- Give score from 1 to 10
- Mention correct parts
- Mention missing points
- Keep feedback professional

Output strictly in JSON:
{
  "score": number,
  "feedback": "string"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    const jsonMatch = raw.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      const scoreMatch = raw.match(/(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[0]) : 5;
      return { score, feedback: raw };
    }
  } catch (error) {
    console.error('Gemini API error (evaluateAnswer):', error.message);
    throw new Error('Evaluation failed');
  }
}

/**
 * 💻 Evaluate Coding Answer (NEW FEATURE)
 */
async function evaluateCode(question, code) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

  const prompt = `
You are an expert coding interviewer.

Evaluate the candidate's code for the given problem.

Problem:
"${question}"

Code:
"${code}"

Evaluate based on:
- Correctness
- Logic
- Efficiency
- Code quality

Instructions:
- Give score from 1 to 10
- Explain if logic is correct or not
- Suggest improvements
- Mention if edge cases are handled

Output strictly in JSON:
{
  "score": number,
  "feedback": "string"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    const jsonMatch = raw.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      const scoreMatch = raw.match(/(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[0]) : 5;
      return { score, feedback: raw };
    }
  } catch (error) {
    console.error('Gemini API error (evaluateCode):', error.message);
    throw new Error('Code evaluation failed');
  }
}

module.exports = {
  generateQuestion,
  evaluateAnswer,
  evaluateCode
};
