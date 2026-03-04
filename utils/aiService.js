const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a question using Google Gemini
 */
async function generateQuestion(role, difficulty) {
  // Use the model that worked in your test
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
  
  const prompt = `Generate a technical interview question for a ${difficulty} level ${role} developer. The question should be clear, specific, and test knowledge of core concepts. Output only the question.`;

  try {
    const result = await model.generateContent(prompt);
    const questionText = result.response.text().trim();

    return {
      type: 'text',
      question: questionText,
      skill: role,
      difficulty: difficulty,
      keywords: [],
      hint: `Think about ${role} fundamentals.`
    };
  } catch (error) {
    console.error('Gemini API error (generateQuestion):', error.message);
    throw new Error('AI generation failed');
  }
}

/**
 * Evaluate an answer using Google Gemini
 */
async function evaluateAnswer(question, answer) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
  
  const prompt = `You are an expert interviewer. Evaluate this answer to the question: "${question}". The answer: "${answer}". Provide a score from 1 to 10 and brief feedback. Output as JSON: {"score": number, "feedback": "string"}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    
    // Try to parse JSON from the response
    const jsonMatch = raw.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: extract score roughly
      const scoreMatch = raw.match(/(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[0]) : 5;
      return { score, feedback: raw };
    }
  } catch (error) {
    console.error('Gemini API error (evaluateAnswer):', error.message);
    throw new Error('Evaluation failed');
  }
}

module.exports = { generateQuestion, evaluateAnswer };