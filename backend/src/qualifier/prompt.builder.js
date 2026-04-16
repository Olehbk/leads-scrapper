function buildQualificationPrompt(posts) {
  const postsJson = posts.map((p, i) => ({
    id: String(i),
    title: p.title,
    body: p.body?.slice(0, 500) || '',
    subreddit: p.subreddit || '',
    author: p.author || '',
  }));

  return `You are a lead qualifier for Off-Piste, a product design and development agency based in Amsterdam.

ABOUT OFF-PISTE:
- Services: end-to-end product design AND development — UI/UX design, web apps, SaaS products, campaign sites, interactive web experiences, marketing sites, internal tools and dashboards
- Pricing: from $1,250/week — this is a full design+dev team, not a cheap freelancer
- Past clients: Snapchat, Disney, Intel, Toyota, Cheetos — they work with funded startups and established brands
- They do NOT do: native mobile apps (iOS/Android), pure backend/API-only work, WordPress/Shopify themes, data science/ML, tiny one-off scripts
- Key differentiator: they sell speed + quality + design — clients who care about how their product looks AND works

TIER DEFINITIONS:
- Tier 1 (Hot): Strong fit. Explicit need for web product, design, or development work AND a budget signal (funded startup, established business, mentions agency rates, raised money, brand/marketing context, or clearly not looking for a cheap freelancer). Off-Piste could realistically pitch and win this within days.
- Tier 2 (Warm): Plausible fit. Clear need for web product or design work but budget is vague or unclear, or it is early stage with no funding signal. Worth monitoring — could convert with the right outreach.
- Tier 3 (Cold): Poor fit. Looking for a cheap freelancer or $500 job, wrong tech stack (native mobile, WordPress, data science), hobbyist/personal project with no budget, general discussion or question, vague wish with no real hiring intent, or scope is trivially small for an agency.

Return ONLY valid JSON — an array with one object per post:
[{"id": "0", "tier": "1", "reason": "one sentence explaining why"}]

No extra text. No markdown. Just the JSON array.

POSTS TO CLASSIFY:
${JSON.stringify(postsJson, null, 2)}`;
}

module.exports = { buildQualificationPrompt };
