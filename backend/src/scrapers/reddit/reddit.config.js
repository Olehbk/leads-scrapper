const SUBREDDITS = [
  // Startup & entrepreneur communities
  'startups',
  'SaaS',
  'Entrepreneur',
  'indiehackers',
  'smallbusiness',

  // Design & development hiring
  'forhire',
  'webdev',
  'web_design',
  'webdesign',

  // Tech communities with hiring activity
  'nextjs',
  'reactjs',

  // Marketing & brand work (campaign sites, interactive experiences)
  'marketing',
  'digital_marketing',
];

const KEYWORDS = [
  // Hire intent — developer
  'looking for a developer',
  'need a developer',
  'hire a developer',
  'need a dev',
  'looking for a dev',
  'need someone to build',
  'looking for someone to build',
  'looking to hire',
  'hire someone to build',
  'can anyone build',
  'need help building',
  'who can build',

  // Hire intent — design
  'looking for a designer',
  'need a designer',
  'hire a designer',
  'looking for a design agency',
  'need a design agency',
  'product design',
  'ui/ux',
  'ux designer',
  'ui designer',
  'design and development',
  'design agency',
  'development agency',
  'product agency',
  'design partner',
  'dev partner',

  // Build categories — web apps & SaaS
  'build a web app',
  'build an MVP',
  'build a SaaS',
  'saas mvp',
  'web app',
  'MVP',
  'need a prototype',
  'build a prototype',
  'need a demo built',
  'Next.js',
  'react developer',
  'frontend developer',

  // Build categories — marketing & campaign sites
  'landing page',
  'landing pages',
  'marketing site',
  'campaign site',
  'need a website',
  'need a website built',
  'build a landing page',
  'build my website',
  'website redesign',
  'redesign my website',
  'interactive experience',
  'interactive website',

  // Build categories — internal tools & dashboards
  'dashboard',
  'internal tool',
  'admin dashboard',
  'build a dashboard',
  'data dashboard',
  'reporting tool',

  // Budget & seriousness signals
  'willing to pay',
  'paid project',
  'just raised',
  'seed round',
  'pre-seed',
  'series a',
  'funded',
  'agency rates',
  'looking for an agency',
  'need an agency',
];

// High-signal phrases — posts containing these get auto-Tier-1 without AI call.
// Kept tight to Off-Piste's actual sweet spot — funded companies, agency-level briefs.
const HIGH_SIGNAL_PHRASES = [
  // Agency-level intent (exactly what Off-Piste is)
  'looking for an agency',
  'need an agency',
  'looking for a design agency',
  'looking for a development agency',
  'looking for a product agency',
  'design and development agency',
  'design partner',

  // Funded company signals — strong budget indicator
  'just raised',
  'seed round',
  'series a',
  'pre-seed funding',
  'we are funded',
  'recently funded',

  // Explicit high-value build intent
  'build our product',
  'build our web app',
  'build our SaaS',
  'build our MVP',
  'build our platform',
  'redesign our product',
  'need a product team',

  // Design + dev together (Off-Piste's positioning)
  'design and development',
  'design and build',
  'designer and developer',
];

module.exports = { SUBREDDITS, KEYWORDS, HIGH_SIGNAL_PHRASES };
