const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a question using Google Gemini
 */
async function generateQuestion(role, difficulty) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

  // Add randomness for better variety
  const topics = ["conceptual", "coding", "real-world scenario", "debugging"];
  const styles = ["direct", "tricky", "application-based"];

  const prompt = `
Generate ONE unique ${difficulty} level technical interview question for a ${role} developer.

Requirements:
- Make it ${topics[Math.floor(Math.random() * topics.length)]}
- Style should be ${styles[Math.floor(Math.random() * styles.length)]}
- Avoid repeating common questions
- Focus on core concepts
- Keep it clear and concise

Output ONLY the question.
`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 100
      }
    });

    let questionText = result.response.text().trim();

    // Retry if bad/empty response
    if (!questionText || questionText.length < 10) {
      return generateQuestion(role, difficulty);
    }

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

  const prompt = `
You are an expert technical interviewer.

Evaluate the following answer:

Question: "${question}"
Answer: "${answer}"

Give:
- Score (1 to 10)
- Short feedback (2-3 lines)

Output strictly in JSON format:
{"score": number, "feedback": "string"}
`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 200
      }
    });

    const raw = result.response.text();

    // Extract JSON safely
    const jsonMatch = raw.match(/\{.*\}/s);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      // fallback if JSON fails
      const scoreMatch = raw.match(/(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[0]) : 5;

      return {
        score,
        feedback: raw
      };
    }
  } catch (error) {
    console.error('Gemini API error (evaluateAnswer):', error.message);
    throw new Error('Evaluation failed');
  }
}

module.exports = { generateQuestion, evaluateAnswer };
