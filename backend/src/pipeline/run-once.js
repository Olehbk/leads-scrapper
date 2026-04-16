// Run the pipeline manually: npm run scrape
require('../config').validate();
const { runPipeline } = require('./pipeline.runner');

runPipeline('reddit')
  .then(result => {
    console.log('[run-once] Complete:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('[run-once] Failed:', err.message);
    process.exit(1);
  });
