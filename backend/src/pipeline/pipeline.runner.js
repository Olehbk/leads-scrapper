const RedditScraper = require('../scrapers/reddit/reddit.scraper');
const { qualifyPosts } = require('../qualifier/agent.qualifier');
const { setStatus, clearStatus } = require('./pipeline.status');
const db = require('../db/database');
const config = require('../config');

const scrapers = {
  reddit: new RedditScraper(),
};

async function runPipeline(source = 'reddit', { maxPostAgeHours, fromDate, toDate } = {}) {
  const scraper = scrapers[source];
  if (!scraper) throw new Error(`Unknown scraper: ${source}`);

  const isDateRange = !!(fromDate && toDate);
  const fromTs = isDateRange ? Math.floor(new Date(fromDate).getTime() / 1000) : null;
  const toTs   = isDateRange ? Math.floor(new Date(toDate).getTime() / 1000) : null;
  const ageLimit = maxPostAgeHours ?? config.maxPostAgeHours;

  console.log(isDateRange
    ? `[pipeline] Starting ${source} scrape (date range: ${fromDate} → ${toDate})`
    : `[pipeline] Starting ${source} scrape (max age: ${ageLimit}h)`
  );
  const runId = db.startScrapeRun(source);

  try {
    // 1. Fetch
    setStatus('Fetching posts from Reddit...');
    const rawPosts = isDateRange
      ? await scraper.fetchPostsInRange(fromTs)
      : await scraper.fetchPosts(ageLimit);
    const normalised = rawPosts.map(p => scraper.normalisePost(p));

    // 2. Filter
    setStatus('Filtering posts...');
    const filtered = isDateRange
      ? scraper.filterByDateRange(normalised, fromTs, toTs)
      : scraper.filterPosts(normalised, ageLimit);
    console.log(`[pipeline] ${filtered.length} posts passed age/keyword filter`);

    // 3. Deduplicate against DB — only keep posts we haven't seen before
    setStatus(`Found ${filtered.length} posts — checking for duplicates...`);
    const existingIds = new Set(db.getDb().get('leads').map(l => l.external_id).value());
    const newPosts = filtered.filter(p => !existingIds.has(p.external_id));
    console.log(`[pipeline] ${newPosts.length} new posts (${filtered.length - newPosts.length} duplicates skipped)`);

    if (newPosts.length === 0) {
      db.finishScrapeRun(runId, { postsFound: filtered.length, postsNew: 0 });
      clearStatus();
      return { postsFound: filtered.length, postsNew: 0 };
    }

    // 4. Qualify first — before touching the DB
    setStatus(`Qualifying ${newPosts.length} new posts...`);
    const allQualified = await qualifyPosts(newPosts);

    // 5. Only insert posts that got a real tier — discard anything that failed
    setStatus('Saving results...');
    const validTiers = new Set(['1', '2', '3']);
    let savedCount = 0;
    for (const post of allQualified) {
      if (!validTiers.has(post.tier)) {
        console.log(`[pipeline] Discarding ${post.external_id} — qualification failed`);
        continue;
      }
      db.insertLead(post);
      db.updateLeadAnalysis(post.external_id, {
        tier: post.tier,
        tier_reason: post.tier_reason,
        fit_score: post.fit_score,
        fit_breakdown: post.fit_breakdown,
        demo_suggestion: post.demo_suggestion,
        outreach_angle: post.outreach_angle,
      });
      savedCount++;
    }

    const tier1Count = allQualified.filter(p => p.tier === '1').length;
    console.log(`[pipeline] Done. ${savedCount} leads saved (${tier1Count} Tier 1, ${newPosts.length - savedCount} discarded)`);

    db.finishScrapeRun(runId, { postsFound: filtered.length, postsNew: savedCount });
    clearStatus();
    return { postsFound: filtered.length, postsNew: savedCount, tier1Count };

  } catch (err) {
    console.error(`[pipeline] Error: ${err.message}`);
    db.failScrapeRun(runId);
    clearStatus();
    throw err;
  }
}

module.exports = { runPipeline };
