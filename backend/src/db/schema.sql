CREATE TABLE IF NOT EXISTS leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source        TEXT NOT NULL DEFAULT 'reddit',
  external_id   TEXT UNIQUE NOT NULL,
  title         TEXT,
  body          TEXT,
  author        TEXT,
  url           TEXT,
  subreddit     TEXT,
  score         INTEGER DEFAULT 0,
  created_at    INTEGER,
  scraped_at    INTEGER DEFAULT (unixepoch()),
  tier          TEXT CHECK(tier IN ('1', '2', '3', 'unqualified')) DEFAULT 'unqualified',
  tier_reason   TEXT,
  contacted     INTEGER DEFAULT 0,
  contacted_at  INTEGER,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_tier       ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_source     ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_scraped_at ON leads(scraped_at);
CREATE INDEX IF NOT EXISTS idx_leads_contacted  ON leads(contacted);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      TEXT NOT NULL,
  started_at  INTEGER DEFAULT (unixepoch()),
  finished_at INTEGER,
  posts_found INTEGER DEFAULT 0,
  posts_new   INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'running'
);
