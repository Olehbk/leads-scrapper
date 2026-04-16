const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/leads.json');

let db;

function getDb() {
  if (!db) {
    const adapter = new FileSync(DB_PATH);
    db = low(adapter);
    db.defaults({ leads: [], scrapeRuns: [], nextId: 1, nextRunId: 1 }).write();
  }
  return db;
}

// --- Leads ---

function insertLead(lead) {
  const store = getDb();
  const exists = store.get('leads').find({ external_id: lead.external_id }).value();
  if (exists) return false;

  const id = store.get('nextId').value();
  store.get('leads').push({
    ...lead,
    id,
    tier: 'unqualified',
    tier_reason: null,
    fit_score: null,
    fit_breakdown: null,
    demo_suggestion: null,
    outreach_angle: null,
    contacted: 0,
    contacted_at: null,
    notes: null,
    scraped_at: Math.floor(Date.now() / 1000),
    // Profile enrichment fields
    profile_summary: null,
    company_name: null,
    role: null,
    email: null,
    website: null,
    linkedin: null,
    twitter: null,
    contact_confidence: null,
    profile_enriched_at: null,
  }).write();
  store.set('nextId', id + 1).write();
  return true;
}

function updateLeadTier(externalId, tier, reason) {
  getDb().get('leads')
    .find({ external_id: externalId })
    .assign({ tier, tier_reason: reason })
    .write();
}

function updateLeadAnalysis(externalId, { tier, tier_reason, fit_score, fit_breakdown, demo_suggestion, outreach_angle }) {
  getDb().get('leads')
    .find({ external_id: externalId })
    .assign({
      tier,
      tier_reason,
      fit_score: fit_score || null,
      fit_breakdown: fit_breakdown ? JSON.stringify(fit_breakdown) : null,
      demo_suggestion: demo_suggestion || null,
      outreach_angle: outreach_angle || null,
    })
    .write();
}

function updateLead(id, fields) {
  const allowed = ['contacted', 'contacted_at', 'notes', 'tier', 'tier_reason', 'fit_score', 'fit_breakdown', 'demo_suggestion', 'outreach_angle'];
  const filtered = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowed.includes(k))
  );
  if (Object.keys(filtered).length === 0) return;
  // Normalize contacted to integer so filter comparisons stay consistent
  if ('contacted' in filtered) filtered.contacted = filtered.contacted ? 1 : 0;
  getDb().get('leads').find({ id }).assign(filtered).write();
}

function getLeads({ tier, source, subreddit, contacted, search, since, limit = 50, offset = 0 } = {}) {
  let chain = getDb().get('leads');
  let results = chain.value();

  if (tier) results = results.filter(l => l.tier === tier);
  if (source) results = results.filter(l => l.source === source);
  if (subreddit) results = results.filter(l => l.subreddit?.toLowerCase() === subreddit.toLowerCase());
  if (contacted !== undefined) results = results.filter(l => !!l.contacted === contacted);
  if (since) results = results.filter(l => (l.scraped_at || 0) >= since);
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(l =>
      (l.title || '').toLowerCase().includes(s) ||
      (l.body || '').toLowerCase().includes(s) ||
      (l.author || '').toLowerCase().includes(s)
    );
  }

  // Sort by scraped_at desc
  results.sort((a, b) => (b.scraped_at || 0) - (a.scraped_at || 0));

  return results.slice(offset, offset + limit);
}

function getStats(source) {
  let leads = getDb().get('leads').value();
  if (source) leads = leads.filter(l => l.source === source);
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

  const byTier = {};
  const bySource = {};
  let newToday = 0;

  for (const lead of leads) {
    byTier[lead.tier] = (byTier[lead.tier] || 0) + 1;
    bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    if ((lead.scraped_at || 0) >= todayStart) newToday++;
  }

  return {
    total: leads.length,
    byTier: Object.entries(byTier).map(([tier, count]) => ({ tier, count })),
    bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
    newToday,
  };
}

function updateLeadProfile(externalId, { company_name, role, email, website, linkedin, twitter, summary, contact_confidence }) {
  getDb().get('leads')
    .find({ external_id: externalId })
    .assign({
      company_name: company_name || null,
      role: role || null,
      email: email || null,
      website: website || null,
      linkedin: linkedin || null,
      twitter: twitter || null,
      profile_summary: summary || null,
      contact_confidence: contact_confidence || null,
      profile_enriched_at: Math.floor(Date.now() / 1000),
    })
    .write();
}

function getInfoLeads() {
  let leads = getDb().get('leads').value();
  leads = leads.filter(l => (l.tier === '1' || l.tier === '2') && l.profile_enriched_at !== null);
  leads = leads.map(l => ({
    ...l,
    fit_breakdown: l.fit_breakdown ? JSON.parse(l.fit_breakdown) : null,
  }));
  leads.sort((a, b) => (b.contact_confidence || 0) - (a.contact_confidence || 0));
  return leads;
}

function getAnalysisLeads({ source, minScore = 1 } = {}) {
  let leads = getDb().get('leads').value();
  if (source) leads = leads.filter(l => l.source === source);
  leads = leads.filter(l => l.fit_score !== null && l.fit_score >= minScore);
  leads = leads.map(l => ({
    ...l,
    fit_breakdown: l.fit_breakdown ? JSON.parse(l.fit_breakdown) : null,
  }));
  leads.sort((a, b) => (b.scraped_at || 0) - (a.scraped_at || 0));
  return leads;
}

// --- Scrape runs ---

function startScrapeRun(source) {
  const store = getDb();
  const id = store.get('nextRunId').value();
  store.get('scrapeRuns').push({
    id,
    source,
    started_at: Math.floor(Date.now() / 1000),
    finished_at: null,
    posts_found: 0,
    posts_new: 0,
    status: 'running',
  }).write();
  store.set('nextRunId', id + 1).write();
  return id;
}

function finishScrapeRun(id, { postsFound, postsNew }) {
  getDb().get('scrapeRuns').find({ id }).assign({
    finished_at: Math.floor(Date.now() / 1000),
    posts_found: postsFound,
    posts_new: postsNew,
    status: 'success',
  }).write();
}

function failScrapeRun(id) {
  getDb().get('scrapeRuns').find({ id }).assign({
    finished_at: Math.floor(Date.now() / 1000),
    status: 'error',
  }).write();
}

function getRecentRuns(limit = 20) {
  return getDb().get('scrapeRuns').value()
    .sort((a, b) => (b.started_at || 0) - (a.started_at || 0))
    .slice(0, limit);
}

module.exports = {
  getDb,
  insertLead,
  updateLeadTier,
  updateLeadAnalysis,
  updateLeadProfile,
  updateLead,
  getLeads,
  getAnalysisLeads,
  getInfoLeads,
  getStats,
  startScrapeRun,
  finishScrapeRun,
  failScrapeRun,
  getRecentRuns,
};
