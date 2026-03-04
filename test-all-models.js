require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// List of models that support generateContent (from your available list)
// Prioritize models that may have higher free quotas
const modelsToTest = [
  "gemini-2.0-flash",        // Often has generous free tier
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash",        // Your original, may be rate-limited
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-lite-preview-09-2025",
  "gemma-3-4b-it",           // Gemma models are also available
  "gemma-3-12b-it"
];

async function testModel(modelName) {
  console.log(`\n🔍 Testing model: ${modelName}...`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    return false;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const prompt = "Generate a technical interview question for a frontend developer. Reply with just the question.";
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log(`✅ SUCCESS with ${modelName}!`);
    console.log('Generated question:', text.trim());
    return true;
  } catch (error) {
    console.log(`❌ Failed with ${modelName}: ${error.message}`);
    if (error.message.includes('429')) {
      console.log('   (Rate limit – try this model later or with billing)');
    }
    return false;
  }
}

async function testAllModels() {
  console.log('Starting model tests...');
  let success = false;
  
  for (const modelName of modelsToTest) {
    success = await testModel(modelName);
    if (success) {
      console.log(`\n🎉 First working model: ${modelName}`);
      console.log('You can now use this model in your aiService.js');
      break;
    }
  }
  
  if (!success) {
    console.log('\n❌ No models worked. Possible reasons:');
    console.log('- All models are rate-limited (wait and try again later)');
    console.log('- API key is invalid or missing permissions');
    console.log('- Billing not enabled (free tier may have very low limits)');
  }
}

testAllModels();