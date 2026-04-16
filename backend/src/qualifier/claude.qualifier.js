const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildQualificationPrompt } = require('./prompt.builder');
const config = require('../config');

let client;

function getClient() {
  if (!client) {
    if (!config.geminiApiKey) return null;
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    client = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
  }
  return client;
}

async function qualifyBatch(posts) {
  const ai = getClient();
  if (!ai) {
    console.warn('[qualifier] No Gemini API key — skipping AI qualification');
    return posts.map(p => ({ ...p, tier: 'unqualified', tier_reason: 'No API key configured' }));
  }

  const prompt = buildQualificationPrompt(posts);

  try {
    const result = await ai.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON array even if Gemini wraps it in markdown or adds extra text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const results = JSON.parse(jsonMatch[0]);

    return posts.map((post, i) => {
      const match = results.find(r => r.id === String(i));
      return {
        ...post,
        tier: match?.tier || 'unqualified',
        tier_reason: match?.reason || '',
      };
    });
  } catch (err) {
    console.error(`[qualifier] Gemini API error: ${err.message}`);
    return posts.map(p => ({ ...p, tier: 'unqualified', tier_reason: 'Qualification failed' }));
  }
}

async function qualifyPosts(posts) {
  const batchSize = config.claudeBatchSize;
  const results = [];

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    console.log(`[qualifier] Qualifying batch ${Math.floor(i / batchSize) + 1} (${batch.length} posts)`);
    const qualified = await qualifyBatch(batch);
    results.push(...qualified);
  }

  return results;
}

module.exports = { qualifyPosts };
