const express = require('express');
const db = require('../../db/database');

const router = express.Router();

// GET /api/leads?tier=1&source=reddit&contacted=false&search=MVP&limit=50&offset=0
router.get('/', (req, res) => {
  try {
    const { tier, source, subreddit, search, since, limit, offset } = req.query;
    const contacted = req.query.contacted !== undefined
      ? req.query.contacted === 'true'
      : undefined;

    const leads = db.getLeads({
      tier,
      source,
      subreddit,
      contacted,
      search,
      since: since ? parseInt(since, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/:id — update contacted, notes, tier
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    if (fields.contacted === true && !fields.contacted_at) {
      fields.contacted_at = Math.floor(Date.now() / 1000);
    }

    db.updateLead(parseInt(id, 10), fields);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
