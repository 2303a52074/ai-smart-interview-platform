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
 * @param {string} role - e.g., 'frontend', 'backend', 'react'
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {Promise<Object>} - { type: 'text', question: string, skill: string, difficulty, keywords: [] }
 */
async function generateQuestion(role, difficulty) {
  const gen = await getGenerator();

  // Construct a prompt for the model
  const prompt = `Generate a technical interview question for a ${difficulty} level ${role} developer. The question should be clear and specific.`;

  const result = await gen(prompt, {
    max_length: 60,
    temperature: 0.7,
    do_sample: true,
  });

  let questionText = result[0].generated_text.trim();

  // Basic cleaning: remove possible prefixes
  questionText = questionText.replace(/^question:/i, '').trim();

  // For now, we'll return a text-type question with placeholder keywords
  // In a more advanced version, you could ask the model to also generate keywords.
  return {
    type: 'text',
    question: questionText,
    skill: role,
    difficulty: difficulty,
    keywords: [], // we'll leave empty for now; evaluation will be simple
    hint: `Think about the core concepts of ${role}.`,
  };
}

module.exports = { generateQuestion };