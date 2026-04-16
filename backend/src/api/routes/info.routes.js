const express = require('express');
const { enrichLeads } = require('../../qualifier/profile.agent');
const db = require('../../db/database');

const router = express.Router();

// GET /api/info — enriched tier 1/2 leads sorted by contact confidence
router.get('/', (req, res) => {
  try {
    const leads = db.getInfoLeads();
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/info/enrich — run profile enrichment on all tier 1/2 leads
router.post('/enrich', async (req, res) => {
  try {
    const allLeads = db.getDb().get('leads').value();
    const targets = allLeads.filter(l => l.tier === '1' || l.tier === '2');

    console.log(`[profile] Starting enrichment for ${targets.length} tier 1/2 leads...`);
    const results = await enrichLeads(targets);

    let enriched = 0;
    for (const { lead, profile } of results) {
      if (!profile) continue;
      db.updateLeadProfile(lead.external_id, {
        company_name: profile.company_name,
        role: profile.role,
        email: profile.email,
        website: profile.website,
        linkedin: profile.linkedin,
        twitter: profile.twitter,
        summary: profile.summary,
        contact_confidence: profile.contact_confidence,
      });
      enriched++;
    }

    console.log(`[profile] Done — ${enriched} profiles enriched`);
    res.json({ ok: true, enriched });
  } catch (err) {
    console.error('[profile] Enrichment failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
