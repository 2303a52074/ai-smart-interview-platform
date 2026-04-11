require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAIQuestions(skill = 'general', difficulty = 'medium', count = 5) {
  console.log(`🤖 Generating ${count} AI questions for ${skill} (${difficulty})`);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
You are a technical interviewer. Generate ${count} UNIQUE ${difficulty} level interview questions for a ${skill} developer.

Return ONLY valid JSON array. No explanations. No markdown.

Format:
[
  {
    "type": "text",
    "question": "Your question here?",
    "skill": "${skill}",
    "difficulty": "${difficulty}",
    "hint": "Brief hint here"
  }
]

Rules:
- Each question must be unique and different
- Mix of theoretical and practical
- Keep questions short (max 15 words)
- Real-world scenarios
`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    let questions = JSON.parse(raw);
    
    if (!questions || questions.length === 0) {
      questions = generateFallbackQuestions(skill, difficulty, count);
    }
    
    return questions.slice(0, count);
    
  } catch (error) {
    console.error('AI Generation Error:', error.message);
    return generateFallbackQuestions(skill, difficulty, count);
  }
}

function generateFallbackQuestions(skill, difficulty, count) {
  const fallbackBank = {
    javascript: [
      "What is closure in JavaScript? Explain with example.",
      "Explain event delegation in JavaScript.",
      "What is the difference between == and ===?",
      "How does prototypal inheritance work?",
      "Explain promise vs callback."
    ],
    python: [
      "What is list comprehension in Python?",
      "Explain decorators in Python.",
      "What is the difference between list and tuple?",
      "How does garbage collection work in Python?",
      "Explain GIL (Global Interpreter Lock)."
    ],
    react: [
      "What is virtual DOM in React?",
      "Explain useEffect hook.",
      "What is state vs props?",
      "How does React rendering work?",
      "Explain React keys."
    ],
    general: [
      "Explain binary search algorithm.",
      "What is REST API?",
      "Explain OOP concepts.",
      "What is the difference between SQL and NoSQL?",
      "Explain CI/CD pipeline."
    ]
  };
  
  const questionsList = fallbackBank[skill.toLowerCase()] || fallbackBank.general;
  
  const questions = [];
  for (let i = 0; i < count; i++) {
    const questionText = questionsList[i % questionsList.length];
    questions.push({
      type: 'text',
      question: questionText,
      skill: skill,
      difficulty: difficulty,
      hint: `Think about ${skill} fundamentals.`
    });
  }
  
  return questions;
}

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
    console.error('Evaluation Error:', error.message);
    return {
      score: 5,
      feedback: "Basic answer. Add more depth and clarity."
    };
  }
}

module.exports = {
  generateAIQuestions,
  evaluateAnswer
};
