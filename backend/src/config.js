require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  scrapeIntervalHours: parseInt(process.env.SCRAPE_INTERVAL_HOURS || '4', 10),
  maxPostAgeHours: parseInt(process.env.MAX_POST_AGE_HOURS || '48', 10),
  claudeBatchSize: parseInt(process.env.CLAUDE_BATCH_SIZE || '8', 10),

  geminiApiKey: process.env.GEMINI_API_KEY,
  apifyApiKey: process.env.APIFY_API_KEY,

  validate() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[config] GEMINI_API_KEY not set — AI qualification will be disabled');
    }
    if (!process.env.APIFY_API_KEY) {
      console.warn('[config] APIFY_API_KEY not set — Twitter scrape will be skipped');
    }
  },
};
