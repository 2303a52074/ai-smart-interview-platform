const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate Interview Question (CLEAN & SHORT)
 */
async function generateQuestion(role, difficulty) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

  const prompt = `
You are a technical interviewer.

Generate ONE ${difficulty} level interview question for a ${role}.

Rules:
- Keep it SHORT (max 2-3 lines)
- No explanations
- No quotes
- No extra text
- Only the question

Output only the question.
`;

  try {
    const result = await model.generateContent(prompt);
    let questionText = result.response.text().trim();

    // Clean unwanted quotes and formatting
    questionText = questionText.replace(/["']/g, '').replace(/\n+/g, ' ').trim();

    return {
      type: 'text',
      question: questionText,
      skill: role,
      difficulty: difficulty,
      keywords: [],
      hint: `Think about core ${role} concepts and real-world usage.`
    };
  } catch (error) {
    console.error('Gemini API error (generateQuestion):', error.message);
    throw new Error('AI generation failed');
  }
}

/**
 * Evaluate Text Answer (STRICT JSON OUTPUT)
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
- Mention what is correct
- Mention what is missing
- Keep feedback short (2-3 lines)

IMPORTANT:
Return ONLY valid JSON. No text outside JSON.

Format:
{
  "score": number,
  "feedback": "string"
}
`;

  try {
    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    // Extract JSON safely
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      return {
        score: 5,
        feedback: "Basic answer. Could be improved with more details."
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
 * Evaluate Coding Answer (AI CODING ROUND)
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
        feedback: "Code partially correct. Needs improvement."
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
