const { pipeline } = require('@xenova/transformers');

let generator = null;

async function getGenerator() {
  if (!generator) {
    console.log('Loading AI model... (first time may take a few seconds)');
    generator = await pipeline('text2text-generation', 'Xenova/t5-small');
    console.log('Model loaded.');
  }
  return generator;
}

/**
 * Generate an interview question based on role and difficulty
 */
async function generateQuestion(role, difficulty) {
  const gen = await getGenerator();

  // Add randomness
  const topics = ["conceptual", "coding", "scenario-based", "debugging"];
  const styles = ["direct", "tricky", "real-world"];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];

  // Improved prompt
  const prompt = `
Generate ONE ${difficulty} level ${randomTopic} technical interview question 
for a ${role} developer.

Style: ${randomStyle}
Avoid repeating common questions.
Make it clear and specific.
Only output the question.
`;

  const result = await gen(prompt, {
    max_length: 80,
    temperature: 0.9,     // 🔥 increased for creativity
    top_k: 50,            // 🔥 adds variation
    top_p: 0.95,
    do_sample: true,
  });

  let questionText = result[0].generated_text.trim();

  // Clean text
  questionText = questionText
    .replace(/^question:/i, '')
    .replace(/\n/g, ' ')
    .trim();

  // Retry if output is too short or bad
  if (!questionText || questionText.length < 15) {
    return generateQuestion(role, difficulty);
  }

  return {
    type: 'text',
    question: questionText,
    skill: role,
    difficulty: difficulty,
    keywords: [],
    hint: `Think about ${role} fundamentals.`,
  };
}

module.exports = { generateQuestion };
