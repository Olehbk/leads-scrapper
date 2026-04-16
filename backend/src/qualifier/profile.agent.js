const { GoogleGenerativeAI } = require('@google/generative-ai');
const { fetchPage } = require('./tools');
const config = require('../config');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const PROMPT_TEMPLATE = `You are an analyst extracting contact and company information from a Reddit user's public profile.

The user made a post that may be a lead for Off-Piste, a product design and development agency.
Your job is to find anything useful for reaching out to them.

REDDIT USERNAME: {{username}}

PROFILE BIO:
{{bio}}

RECENT REDDIT ACTIVITY (posts and comments):
{{history}}

{{website_content}}

Extract whatever you can find. Return ONLY this JSON — no markdown, no extra text:
{
  "company_name": "company name or null",
  "role": "their role/title or null",
  "email": "email address if found or null",
  "website": "their website/portfolio URL or null",
  "linkedin": "linkedin URL if found or null",
  "twitter": "twitter/X handle if found or null",
  "summary": "2-3 sentences about who this person is, what they do, and why they might need Off-Piste",
  "contact_confidence": 5
}

contact_confidence is 1–10: how useful is the info found for actually reaching out to this person.`;

async function fetchRedditAbout(username) {
  try {
    const res = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { bio: '', website: '' };
    const json = await res.json();
    const data = json?.data || {};
    const bio = data?.subreddit?.public_description || '';
    const website = data?.subreddit?.url || '';
    return { bio, website };
  } catch {
    return { bio: '', website: '' };
  }
}

async function fetchRedditHistory(username) {
  try {
    const res = await fetch(`https://www.reddit.com/user/${username}/overview.json?limit=25`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return '';
    const json = await res.json();
    const items = json?.data?.children || [];
    return items.map(item => {
      const d = item.data;
      const type = item.kind === 't3' ? 'post' : 'comment';
      const text = (d.title || d.body || '').slice(0, 150);
      return `[${type}] r/${d.subreddit}: ${text}`;
    }).join('\n');
  } catch {
    return '';
  }
}

async function enrichProfile(lead) {
  const username = (lead.author || '').replace(/^u\//, '');
  if (!username || username === '[deleted]' || username === 'unknown') {
    return null;
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemma-4-31b-it' });

  // Gather profile data in parallel
  const [about, history] = await Promise.all([
    fetchRedditAbout(username),
    fetchRedditHistory(username),
  ]);

  // If they have a website in their profile, fetch it too
  let websiteContent = '';
  if (about.website && about.website.startsWith('http')) {
    const content = await fetchPage(about.website);
    websiteContent = `PROFILE WEBSITE CONTENT:\n${content}`;
  }

  const prompt = PROMPT_TEMPLATE
    .replace('{{username}}', username)
    .replace('{{bio}}', about.bio || '(no bio)')
    .replace('{{history}}', history || '(no public activity)')
    .replace('{{website_content}}', websiteContent);

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in profile response: ${text.slice(0, 100)}`);

  return JSON.parse(jsonMatch[0]);
}

async function enrichLeads(leads) {
  const results = [];

  for (let i = 0; i < leads.length; i += 3) {
    const batch = leads.slice(i, i + 3);
    console.log(`[profile] Enriching ${i + 1}–${Math.min(i + 3, leads.length)} of ${leads.length}...`);

    const enriched = await Promise.all(batch.map(async lead => {
      try {
        const profile = await enrichProfile(lead);
        if (profile) {
          console.log(`[profile] ${lead.external_id} → confidence ${profile.contact_confidence}/10`);
        }
        return { lead, profile };
      } catch (err) {
        console.error(`[profile] Failed for ${lead.external_id}: ${err.message}`);
        return { lead, profile: null };
      }
    }));

    results.push(...enriched);
  }

  return results;
}

module.exports = { enrichLeads };
