const { GoogleGenerativeAI } = require('@google/generative-ai');
const { fetchPage, getRedditHistory } = require('./tools');
const { setStatus } = require('../pipeline/pipeline.status');
const config = require('../config');

// ── Stage 1: quick batch triage — no context fetching, 15 posts per call ─────

const QUICK_PROMPT_PREFIX = `You are a lead qualifier for Off-Piste, a product design and development agency in Amsterdam.

ABOUT OFF-PISTE:
- Services: product design + development — UI/UX, web apps, SaaS, campaign sites, interactive experiences, marketing sites, internal tools
- Pricing: from $1,250/week — a full design+dev team, not a freelancer
- Does NOT do: native mobile apps, pure backend/API-only, WordPress/Shopify themes, data science/ML

TIER DEFINITIONS:
- Tier 1 (Hot): Actively seeking to hire/engage for web, design or product work AND shows a budget signal (raised funding, established brand, mentions agency rates, recognisable company, explicitly not looking cheap).
- Tier 2 (Warm): Clear real need for web/design/product work, no budget signal yet. This is the DEFAULT for genuine hiring intent — when unsure between Tier 2 and 3, pick Tier 2.
- Tier 3 (Cold): Clearly wrong fit ONLY — explicitly cheap (under $500), wrong tech stack (native mobile, WordPress, data science/ML), obvious hobbyist with zero budget, or pure discussion with no hiring intent. Do NOT use Tier 3 just because budget is unknown.

Return ONLY a JSON array — no markdown, no extra text:
[{"id":"0","tier":"2","reason":"one sentence why"}]

POSTS:
`;

// ── Stage 2: deep analysis — only runs on Tier 1 and Tier 2 posts ─────────────

const DEEP_TEMPLATE = `You are a senior lead qualifier for Off-Piste, a product design and development agency in Amsterdam.

ABOUT OFF-PISTE:
- Services: end-to-end product design AND development — UI/UX, web apps, SaaS products, campaign sites, interactive experiences, marketing sites, internal tools
- Pricing: from $1,250/week — a full design+dev team, not a cheap freelancer
- Past clients: Snapchat, Disney, Intel, Toyota, Cheetos
- They do NOT do: native mobile apps, pure backend/API-only, WordPress/Shopify themes, data science/ML
- Key differentiator: speed + quality + design — clients who care how their product looks AND works

TIER DEFINITIONS:
- Tier 1 (Hot): Person or company actively looking to hire for web/design/product work AND shows at least one budget signal: raising funding, established brand, references agency rates, recognisable company, or explicitly not looking for cheap. Off-Piste can pitch and win this.
- Tier 2 (Warm): Clear real need for web/design/product work but no budget signal yet. DEFAULT for genuine hiring intent.
- Tier 3 (Cold): Clearly wrong fit only — explicitly cheap, wrong tech, hobbyist, or no real hiring intent.

FIT SCORE BREAKDOWN (1–10 each):
- budget: signals they can afford $1,250+/week
- scope_fit: how well the work matches Off-Piste's skills
- urgency: how time-sensitive their need appears
- company_stage: how mature/serious the company seems

POST:
Title: {{title}}
Body: {{body}}
Author: {{author}}
Source: {{source}}
URL: {{url}}

{{context}}

Return ONLY this JSON — no markdown, no extra text:
{"tier":"2","tier_reason":"one concise sentence","fit_score":7,"fit_breakdown":{"budget":5,"scope_fit":9,"urgency":6,"company_stage":5},"demo_suggestion":"specific actionable demo idea","outreach_angle":"sharpest hook for outreach"}`;

const MODEL = process.env.GEMINI_MODEL || 'gemma-4-31b-it';

function getModel() {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  return genAI.getGenerativeModel({ model: MODEL });
}

// ── Stage 1 ───────────────────────────────────────────────────────────────────

async function quickClassify(posts) {
  const model = getModel();
  // Map from array index → {tier, tier_reason}
  const tierMap = new Map();

  for (let i = 0; i < posts.length; i += 15) {
    const batch = posts.slice(i, i + 15);
    const postsJson = batch.map((p, idx) => ({
      id: String(idx),
      title: p.title || '',
      body: (p.body || '').slice(0, 300),
      subreddit: p.subreddit || '',
    }));

    const prompt = QUICK_PROMPT_PREFIX + JSON.stringify(postsJson, null, 2);

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      // Strip markdown code fences if present
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error(`No JSON array in response: ${text.slice(0, 100)}`);
      const parsed = JSON.parse(jsonMatch[0]);

      for (const item of parsed) {
        const globalIdx = i + parseInt(item.id, 10);
        if (!isNaN(globalIdx)) {
          const tier = String(item.tier);
          tierMap.set(globalIdx, { tier, tier_reason: item.reason || '' });
          const post = posts[globalIdx];
          console.log(`[agent] Stage 1: [Tier ${tier}] "${(post?.title || '').slice(0, 60)}" — ${item.reason || ''}`);
        }
      }
    } catch (err) {
      console.error(`[agent] Quick classify batch ${i}–${i + batch.length} failed: ${err.message}`);
      for (let j = 0; j < batch.length; j++) {
        tierMap.set(i + j, { tier: 'unqualified', tier_reason: 'Classification failed' });
      }
    }

    setStatus(`Stage 1: classifying posts ${Math.min(i + 15, posts.length)}/${posts.length}...`);
    console.log(`[agent] Stage 1: classified ${Math.min(i + 15, posts.length)}/${posts.length}`);
  }

  return tierMap;
}

// ── Stage 2 ───────────────────────────────────────────────────────────────────

async function deepAnalyse(post) {
  const model = getModel();

  const username = (post.author || '').replace(/^u\//, '');
  const urlMatch = (post.body || '').match(/https?:\/\/[^\s)"']+/);

  const [history, pageContent] = await Promise.all([
    (username && username !== '[deleted]' && username !== 'unknown')
      ? getRedditHistory(username)
      : Promise.resolve(null),
    urlMatch ? fetchPage(urlMatch[0]) : Promise.resolve(null),
  ]);

  const parts = [];
  if (history) parts.push(`AUTHOR REDDIT HISTORY:\n${history}`);
  if (pageContent) parts.push(`LINKED PAGE CONTENT:\n${pageContent}`);
  const context = parts.length > 0 ? `ADDITIONAL CONTEXT:\n${parts.join('\n\n')}` : '';

  const prompt = DEEP_TEMPLATE
    .replace('{{title}}', post.title || '')
    .replace('{{body}}', (post.body || '').slice(0, 1000))
    .replace('{{author}}', post.author || '')
    .replace('{{source}}', `${post.source}${post.subreddit ? ` · r/${post.subreddit}` : ''}`)
    .replace('{{url}}', post.url || '')
    .replace('{{context}}', context);

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

// ── Main export: two-stage qualification ──────────────────────────────────────

async function qualifyPosts(posts) {
  if (!config.geminiApiKey) {
    console.warn('[agent] No Gemini API key — skipping qualification');
    return posts.map(p => ({
      ...p, tier: 'unqualified', tier_reason: 'No API key configured',
      fit_score: null, fit_breakdown: null, demo_suggestion: null, outreach_angle: null,
    }));
  }

  // Stage 1: quick-classify all posts in batches of 15
  console.log(`[agent] Stage 1: quick-classifying ${posts.length} posts...`);
  const tierMap = await quickClassify(posts);

  const toDeep = [];
  posts.forEach((post, i) => {
    const t = tierMap.get(i);
    if (t && (t.tier === '1' || t.tier === '2')) toDeep.push({ post, quick: t, idx: i });
  });

  const counts = { '1': 0, '2': 0, '3': 0, unqualified: 0 };
  tierMap.forEach(t => { counts[t.tier] = (counts[t.tier] || 0) + 1; });
  console.log(`[agent] Stage 1 results → Tier 1: ${counts['1']}, Tier 2: ${counts['2']}, Tier 3: ${counts['3']}, failed: ${counts['unqualified'] || 0}`);

  // Stage 2: deep-analyse only Tier 1 and Tier 2
  const deepResults = new Map();
  if (toDeep.length > 0) {
    console.log(`[agent] Stage 2: deep-analysing ${toDeep.length} warm/hot posts...`);
    for (let i = 0; i < toDeep.length; i += 3) {
      const batch = toDeep.slice(i, i + 3);
      setStatus(`Stage 2: deep analysis ${i + 1}–${Math.min(i + 3, toDeep.length)} of ${toDeep.length}...`);
      console.log(`[agent] Stage 2: ${i + 1}–${Math.min(i + 3, toDeep.length)} of ${toDeep.length}`);
      const results = await Promise.all(batch.map(async ({ post }) => {
        try {
          const analysis = await deepAnalyse(post);
          console.log(`[agent] ${post.external_id} → Tier ${analysis.tier}, fit ${analysis.fit_score}/10`);
          return { external_id: post.external_id, ...analysis };
        } catch (err) {
          console.error(`[agent] Deep analyse failed for ${post.external_id}: ${err.message}`);
          return null;
        }
      }));
      results.forEach(r => { if (r) deepResults.set(r.external_id, r); });
    }
  }

  // Combine stage 1 + stage 2 results
  return posts.map((post, i) => {
    const quick = tierMap.get(i);
    const deep = deepResults.get(post.external_id);

    if (!quick || quick.tier === 'unqualified') {
      return { ...post, tier: 'unqualified', tier_reason: 'Not classified', fit_score: null, fit_breakdown: null, demo_suggestion: null, outreach_angle: null };
    }

    if (deep) {
      return {
        ...post,
        tier: deep.tier || quick.tier,
        tier_reason: deep.tier_reason || quick.tier_reason,
        fit_score: deep.fit_score || null,
        fit_breakdown: deep.fit_breakdown || null,
        demo_suggestion: deep.demo_suggestion || null,
        outreach_angle: deep.outreach_angle || null,
      };
    }

    // Tier 3 posts, or deep analysis failed — use quick result, no fit scores
    return {
      ...post,
      tier: quick.tier,
      tier_reason: quick.tier_reason,
      fit_score: null,
      fit_breakdown: null,
      demo_suggestion: null,
      outreach_angle: null,
    };
  });
}

module.exports = { qualifyPosts };
