const express = require('express');
const { runPipeline } = require('../../pipeline/pipeline.runner');
const { qualifyPosts } = require('../../qualifier/agent.qualifier');
const { getStatus } = require('../../pipeline/pipeline.status');
const db = require('../../db/database');

const router = express.Router();

// GET /api/scrape/status — current pipeline status message
router.get('/status', (req, res) => {
  res.json({ status: getStatus() });
});

// POST /api/scrape/run — trigger a scrape, waits for completion
router.post('/run', async (req, res) => {
  const source = req.body?.source || 'reddit';
  const maxPostAgeHours = req.body?.maxPostAgeHours ? Number(req.body.maxPostAgeHours) : undefined;
  const fromDate = req.body?.fromDate || undefined;
  const toDate = req.body?.toDate || undefined;
  try {
    const result = await runPipeline(source, { maxPostAgeHours, fromDate, toDate });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[scrape route] Scrape failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/scrape/requalify — re-run agent on all existing leads, remove ones that fail
router.post('/requalify', async (req, res) => {
  try {
    let leads = db.getDb().get('leads').value();
    console.log(`[requalify] Requalifying ${leads.length} leads...`);

    const qualified = await qualifyPosts(leads);
    const validTiers = new Set(['1', '2', '3']);
    let saved = 0, removed = 0;

    for (const lead of qualified) {
      if (!validTiers.has(lead.tier)) {
        db.getDb().get('leads').remove({ external_id: lead.external_id }).write();
        removed++;
      } else {
        db.updateLeadAnalysis(lead.external_id, {
          tier: lead.tier,
          tier_reason: lead.tier_reason,
          fit_score: lead.fit_score,
          fit_breakdown: lead.fit_breakdown,
          demo_suggestion: lead.demo_suggestion,
          outreach_angle: lead.outreach_angle,
        });
        saved++;
      }
    }

    console.log(`[requalify] Done — ${saved} kept, ${removed} removed`);
    res.json({ ok: true, requalified: saved, removed });
  } catch (err) {
    console.error('[requalify] Failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/scrape/unqualified — purge all unqualified leads from DB
router.delete('/unqualified', (req, res) => {
  try {
    const before = db.getDb().get('leads').size().value();
    db.getDb().get('leads').remove({ tier: 'unqualified' }).write();
    const after = db.getDb().get('leads').size().value();
    console.log(`[purge] Removed ${before - after} unqualified leads`);
    res.json({ ok: true, removed: before - after });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/scrape/runs — recent run history
router.get('/runs', (req, res) => {
  try {
    const runs = db.getRecentRuns(20);
    res.json({ runs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
