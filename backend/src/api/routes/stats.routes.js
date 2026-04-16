const express = require('express');
const db = require('../../db/database');

const router = express.Router();

// GET /api/stats?source=reddit|twitter
router.get('/', (req, res) => {
  try {
    const { source } = req.query;
    res.json(db.getStats(source));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
