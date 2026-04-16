const express = require('express');
const db = require('../../db/database');

const router = express.Router();

// GET /api/analysis — leads with fit scores, sorted by score desc
router.get('/', (req, res) => {
  try {
    const source = req.query.source || undefined;
    const minScore = req.query.minScore ? Number(req.query.minScore) : 1;
    const leads = db.getAnalysisLeads({ source, minScore });
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
