require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate MULTIPLE AI Questions at once (for routes)
 */
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
- Vary difficulty within ${difficulty}
`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    
    // Clean markdown if present
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    let questions;
    try {
      questions = JSON.parse(raw);
    } catch (e) {
      console.error("JSON Parse Error, using fallback");
      questions = generateFallbackQuestions(skill, difficulty, count);
    }
    
    // Ensure we have the right count
    if (!questions || questions.length === 0) {
      questions = generateFallbackQuestions(skill, difficulty, count);
    }
    
    // Trim to requested count
    questions = questions.slice(0, count);
    
    console.log(`✅ Generated ${questions.length} questions successfully`);
    return questions;
    
  } catch (error) {
    console.error('AI Batch Generation Error:', error.message);
    return generateFallbackQuestions(skill, difficulty, count);
  }
}

/**
 * Generate Single Question (Keep your original)
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

    questionText = questionText
      .replace(/["']/g, '')
      .replace(/\n+/g, ' ')
      .trim();

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
 * FALLBACK Questions (when AI fails)
 */
function generateFallbackQuestions(skill, difficulty, count) {
  console.log(`📚 Using fallback questions for ${skill}`);
  
  const fallbackBank = {
    javascript: [
      "What is closure in JavaScript? Explain with example.",
      "Explain event delegation in JavaScript.",
      "What is the difference between == and ===?",
      "How does prototypal inheritance work?",
      "Explain promise vs callback.",
      "What is event loop in JavaScript?",
      "Explain map, filter, and reduce.",
      "What is hoisting in JavaScript?"
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
      "Explain CI/CD pipeline.",
      "What is version control?",
      "Explain load balancing.",
      "What is caching and why use it?"
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

/**
 * Generate MCQ Questions (for exam mode)
 */
async function generateMCQQuestions(skill, difficulty, count = 7) {
  console.log(`📝 Generating ${count} MCQ questions`);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Generate ${count} multiple choice questions for ${skill} (${difficulty} level).

Return ONLY valid JSON array.

Format:
[
  {
    "type": "mcq",
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "skill": "${skill}",
    "difficulty": "${difficulty}"
  }
]

Rules:
- 4 options each
- One clearly correct answer
- Real interview questions
- No explanations in output
`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    let questions = JSON.parse(raw);
    return questions;
    
  } catch (error) {
    console.error("MCQ Generation Error:", error);
    // Return simple fallback MCQ
    return [
      {
        type: "mcq",
        question: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
        correctAnswer: "B",
        skill: skill,
        difficulty: difficulty
      }
    ];
  }
}

/**
 * Keep your original evaluation functions
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
  generateAIQuestions,  // NEW - for batch generation
  generateQuestion,      // Original - single question
  generateMCQQuestions,  // NEW - for exam mode
  evaluateAnswer,
  evaluateCode
};
