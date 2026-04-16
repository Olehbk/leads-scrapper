// Re-run AI qualification on all unqualified leads
// Usage: node src/pipeline/requalify.js
require('../config').validate();

const db = require('../db/database');
const { qualifyPosts } = require('../qualifier/claude.qualifier');
const config = require('../config');

async function requalify() {
  if (!config.geminiApiKey) {
    console.error('No GEMINI_API_KEY set in .env — cannot qualify leads');
    process.exit(1);
  }

  const leads = db.getLeads({ tier: 'unqualified', limit: 500 });
  console.log(`Found ${leads.length} unqualified leads`);

  if (leads.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  const qualified = await qualifyPosts(leads);

  for (const lead of qualified) {
    db.updateLeadTier(lead.external_id, lead.tier, lead.tier_reason);
  }

  const counts = qualified.reduce((acc, l) => {
    acc[l.tier] = (acc[l.tier] || 0) + 1;
    return acc;
  }, {});

  console.log('Done. Results:', counts);
  process.exit(0);
}

requalify().catch(err => {
  console.error(err.message);
  process.exit(1);
});
