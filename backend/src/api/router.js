const express = require('express');
const leadsRoutes = require('./routes/leads.routes');
const scrapeRoutes = require('./routes/scrape.routes');
const statsRoutes = require('./routes/stats.routes');
const analysisRoutes = require('./routes/analysis.routes');
const infoRoutes = require('./routes/info.routes');

const router = express.Router();

router.use('/leads', leadsRoutes);
router.use('/scrape', scrapeRoutes);
router.use('/stats', statsRoutes);
router.use('/analysis', analysisRoutes);
router.use('/info', infoRoutes);

module.exports = router;
