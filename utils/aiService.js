// utils/aiService.js
const axios = require('axios');

const HF_TOKEN = process.env.HF_TOKEN;
const HF_API_URL = 'https://api-inference.huggingface.co/models/google/flan-t5-small'; // you can change to a larger model later

/**
 * Generate a question using Hugging Face's free API
 */
async function generateQuestion(role, difficulty) {
  const prompt = `Generate a technical interview question for a ${difficulty} level ${role} developer. The question should be clear, specific, and test knowledge of core concepts. Output only the question.`;

  try {
    const response = await axios.post(
      HF_API_URL,
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HF_TOKEN}` } }
    );

    // The API returns an array with generated text
    const questionText = response.data[0]?.generated_text || response.data.generated_text;
    // Remove the prompt if it's echoed
    const cleanQuestion = questionText.replace(prompt, '').trim();

    return {
      type: 'text',
      question: cleanQuestion,
      skill: role,
      difficulty: difficulty,
      keywords: [], // no keywords for AI‑generated questions
      hint: `Think about ${role} fundamentals.`
    };
  } catch (error) {
    console.error('Hugging Face API error:', error.response?.data || error.message);
    throw new Error('AI generation failed');
  }
}

/**
 * Evaluate an answer using Hugging Face
 */
async function evaluateAnswer(question, answer) {
  const prompt = `You are an expert interviewer. Evaluate this answer to the question: "${question}". The answer: "${answer}". Provide a score from 1 to 10 and brief feedback. Output as JSON: {"score": number, "feedback": "string"}`;

  try {
    const response = await axios.post(
      HF_API_URL,
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HF_TOKEN}` } }
    );

    const raw = response.data[0]?.generated_text || response.data.generated_text;
    // Try to extract JSON from the response
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
    console.error('Evaluation API error:', error.response?.data || error.message);
    throw new Error('Evaluation failed');
  }
}

module.exports = { generateQuestion, evaluateAnswer };