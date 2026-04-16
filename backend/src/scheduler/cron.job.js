const cron = require('node-cron');
const { runPipeline } = require('../pipeline/pipeline.runner');
const config = require('../config');

function startScheduler() {
  const hours = config.scrapeIntervalHours;
  const schedule = `0 */${hours} * * *`;

  console.log(`[scheduler] Reddit scraper scheduled every ${hours} hours`);

  cron.schedule(schedule, async () => {
    console.log('[scheduler] Running scheduled scrape...');
    for (const source of ['reddit']) {
      try {
        const result = await runPipeline(source);
        console.log(`[scheduler] ${source} done:`, result);
      } catch (err) {
        console.error(`[scheduler] ${source} failed:`, err.message);
      }
    }
  });
}

module.exports = { startScheduler };
