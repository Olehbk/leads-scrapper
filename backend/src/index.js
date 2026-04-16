const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRouter = require('./api/router');
const { startScheduler } = require('./scheduler/cron.job');

config.validate();

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/api', apiRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`[server] Running on http://localhost:${config.port}`);
  startScheduler();
});
