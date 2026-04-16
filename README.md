# Leads Scrapper

An automated lead generation pipeline built for [Off Piste](https://offpiste.io) — a product design and development agency. It scrapes Reddit for posts where people are looking to hire developers, designers, or agencies, qualifies them with a two-stage AI pipeline (Google Gemini), and surfaces the best opportunities in a dashboard.

---

## How it works

```
Reddit (13 subreddits)
        ↓
  Keyword filter          — drops irrelevant posts
        ↓
  Deduplication           — skips already-seen posts
        ↓
  Stage 1: Quick triage   — Gemini classifies 15 posts at a time → Tier 1 / 2 / 3
        ↓
  Stage 2: Deep analysis  — runs only on Tier 1 & 2; fetches author history + linked URLs
        ↓
  Saved to leads.json     — with fit score, outreach angle, demo suggestion
        ↓
  Dashboard (React)       — review, filter, mark contacted, export CSV
```

---

## Stack

| Layer     | Tech                                          |
|-----------|-----------------------------------------------|
| Backend   | Node.js, Express, CommonJS                    |
| Database  | lowdb v1 (flat JSON file — `leads.json`)      |
| AI        | Google Gemini (`gemma-4-31b-it` by default)   |
| Scheduler | node-cron                                     |
| Frontend  | React, Vite, Tailwind CSS, Zustand            |

---

## Project structure

```
scrapper/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── router.js                   — mounts all route groups
│   │   │   └── routes/
│   │   │       ├── leads.routes.js         — GET /leads, PATCH /leads/:id
│   │   │       ├── scrape.routes.js        — POST /scrape/run, GET /scrape/status, etc.
│   │   │       ├── stats.routes.js         — GET /stats
│   │   │       ├── analysis.routes.js      — GET /analysis
│   │   │       └── info.routes.js          — GET /info, POST /info/enrich
│   │   ├── db/
│   │   │   └── database.js                 — all DB reads/writes via lowdb
│   │   ├── pipeline/
│   │   │   ├── pipeline.runner.js          — orchestrates scrape → filter → qualify → save
│   │   │   ├── pipeline.status.js          — in-memory status string (polled by UI)
│   │   │   ├── requalify.js                — CLI script: re-qualify unqualified leads
│   │   │   └── run-once.js                 — CLI script: trigger a single scrape
│   │   ├── qualifier/
│   │   │   ├── agent.qualifier.js          — two-stage Gemini qualifier (main)
│   │   │   ├── claude.qualifier.js         — legacy single-stage qualifier
│   │   │   ├── profile.agent.js            — profile enrichment (company, email, etc.)
│   │   │   ├── prompt.builder.js           — builds qualification prompts
│   │   │   ├── tier.constants.js           — tier definitions (Hot / Warm / Cold)
│   │   │   └── tools.js                    — fetchPage(), getRedditHistory()
│   │   ├── scrapers/
│   │   │   ├── base.scraper.js
│   │   │   └── reddit/
│   │   │       ├── reddit.scraper.js       — fetches Reddit /new.json, paginates
│   │   │       ├── reddit.config.js        — subreddit list, keywords, high-signal phrases
│   │   │       └── reddit.filter.js        — age filter, keyword match, freelancer detection
│   │   ├── scheduler/
│   │   │   └── cron.job.js                 — runs pipeline on a cron schedule
│   │   ├── config.js                       — loads .env, exposes typed config
│   │   └── index.js                        — Express app entry point
│   ├── data/
│   │   └── leads.json                      — the database
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/leadsApi.js                 — all fetch calls to the backend
    │   ├── store/leadsStore.js             — Zustand global state
    │   ├── hooks/
    │   │   ├── useLeads.js                 — loads leads, exposes markContacted / updateNotes / overrideTier
    │   │   └── useStats.js                 — loads stats, polls every 30s
    │   ├── components/
    │   │   ├── App.jsx                     — root layout, tab routing
    │   │   ├── Tabs.jsx                    — tab bar (All / New / Database / Analysis / Info)
    │   │   ├── FilterBar.jsx               — search, tier, subreddit, contacted filters
    │   │   ├── LeadTable.jsx               — list of LeadCards
    │   │   ├── LeadCard.jsx                — expandable card with notes, tier override, mark contacted
    │   │   ├── LeadsDatabase.jsx           — sortable table, CSV export
    │   │   ├── AnalysisTab.jsx             — fit score breakdown, demo/outreach suggestions
    │   │   ├── InfoTab.jsx                 — enriched profiles (company, email, socials)
    │   │   ├── RunScrapeButton.jsx         — scrape trigger (recent mode / date picker mode)
    │   │   ├── StatsBar.jsx                — total / hot / warm / today counts
    │   │   ├── TierBadge.jsx
    │   │   └── Toast.jsx
    │   └── styles/index.css
    ├── vite.config.js                      — proxies /api → localhost:3001
    └── package.json
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/Olehbk/leads-scrapper.git
cd leads-scrapper
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend (in a separate terminal)
cd frontend && npm install
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

```env
# Google Gemini — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_key_here

# Apify — not currently used, safe to leave blank
APIFY_API_KEY=

# App settings (these defaults work fine out of the box)
PORT=3001
SCRAPE_INTERVAL_HOURS=4
MAX_POST_AGE_HOURS=48
CLAUDE_BATCH_SIZE=8
CORS_ORIGIN=http://localhost:5173
```

> **GEMINI_API_KEY** is the only required key. Without it the pipeline will scrape and filter posts but skip AI qualification — all leads will be saved as `unqualified`.

---

## Running locally

```bash
# Terminal 1 — backend (with auto-reload)
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

The frontend proxies all `/api` requests to the backend, so no CORS issues in dev.

---

## Running a scrape

### From the UI

Click **Scrape Reddit** in the top-right corner. Two modes are available:

- **Recent** — scrapes posts from the last N hours (default: 48). Enter a custom number of hours in the input field.
- **By date** — pick a specific date; fetches and filters all posts from that calendar day.

While running, a live status line appears below the button showing which stage the pipeline is on.

### From the CLI

```bash
cd backend

# Single scrape run (uses MAX_POST_AGE_HOURS from .env)
npm run scrape

# Re-qualify all unqualified leads (useful if you added the API key later)
npm run requalify
```

---

## Lead tiers

Every post that passes the keyword filter goes through two stages of AI classification:

| Tier | Label | Meaning |
|------|-------|---------|
| `1`  | **Hot**  | Actively looking to hire for web/design/product work AND shows a budget signal — raised funding, established brand, mentions agency rates, or explicitly not looking cheap. Ready to pitch. |
| `2`  | **Warm** | Clear real need for web/design/product work but no budget signal yet. Default for genuine hiring intent. Worth monitoring. |
| `3`  | **Cold** | Wrong fit — explicitly cheap, wrong tech stack (native mobile, WordPress, data science), obvious hobbyist, or pure discussion with no hiring intent. |
| `unqualified` | — | AI classification failed or was skipped (no API key). |

### Two-stage qualification

**Stage 1 — Quick triage** batches 15 posts per Gemini call. Each post provides only title, body (first 300 chars), and subreddit. Returns tier + one-sentence reason. Fast and cheap.

**Stage 2 — Deep analysis** runs only on Tier 1 and Tier 2 posts, in batches of 3. For each post it:
1. Fetches the author's recent Reddit activity (last 15 posts/comments)
2. Fetches any URL linked in the post body
3. Sends the full post + context to Gemini

Returns:
- Final tier (may be revised up or down from Stage 1)
- `fit_score` — overall score out of 10
- `fit_breakdown` — four sub-scores: `budget`, `scope_fit`, `urgency`, `company_stage`
- `demo_suggestion` — specific demo idea tailored to this lead
- `outreach_angle` — sharpest hook for a cold outreach message

---

## Profile enrichment

After leads are qualified, you can enrich Tier 1 and Tier 2 leads with contact information.

Click **Enrich profiles** on the **Info** tab. For each lead the agent:
1. Fetches the author's Reddit bio and website
2. Fetches the last 25 items from their Reddit activity
3. Fetches their linked website (if any)
4. Asks Gemini to extract: company name, role, email, website, LinkedIn, Twitter, a 2–3 sentence summary, and a `contact_confidence` score (1–10)

Results are saved to the lead record and surfaced on the **Info** tab, sorted by `contact_confidence` descending.

---

## Dashboard tabs

### All leads
Card-based list of all leads. Filterable by tier, subreddit, contacted status, and free-text search. Each card shows the AI-generated reason, and can be expanded to read the full post body, add notes, override the tier, or mark as contacted.

### New
Same as All leads but filtered to leads discovered in the most recent scrape run. The tab shows a badge with the count of new leads.

### Database
Full-table view of every lead. Supports multi-select tier and subreddit filters, sortable columns (tier, subreddit, author, contacted, scraped date), and **CSV export** of whatever is currently filtered.

### Analysis
Grid of cards showing fit score breakdown bars (Budget, Scope fit, Urgency, Company stage). Filterable by minimum score, tier, and contacted status. Each card can be expanded to reveal the demo suggestion and outreach angle written by the AI.

### Info
Grid of enriched profiles for Tier 1 and Tier 2 leads. Shows company, role, email, website, LinkedIn, Twitter, and a short profile summary. Sorted by contact confidence so the most actionable leads appear first.

---

## API reference

All endpoints are prefixed with `/api`.

### Leads

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/leads` | List leads. Query params: `tier`, `source`, `subreddit`, `contacted` (bool), `search`, `since` (unix ts), `limit`, `offset` |
| `PATCH` | `/leads/:id` | Update a lead. Allowed fields: `contacted`, `contacted_at`, `notes`, `tier`, `tier_reason`, `fit_score`, `fit_breakdown`, `demo_suggestion`, `outreach_angle` |

### Scrape

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/scrape/run` | Trigger a pipeline run. Body: `{ source, maxPostAgeHours?, fromDate?, toDate? }` |
| `GET` | `/scrape/status` | Current pipeline status string (null when idle) |
| `POST` | `/scrape/requalify` | Re-run AI qualification on all leads in DB |
| `DELETE` | `/scrape/unqualified` | Remove all unqualified leads |
| `GET` | `/scrape/runs` | Last 20 scrape run records |

### Stats

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/stats` | `{ total, byTier[], bySource[], newToday }` |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/analysis` | Leads with fit scores. Query params: `source`, `minScore` (default 1) |

### Info / Profile enrichment

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/info` | Enriched Tier 1 & 2 leads sorted by contact confidence |
| `POST` | `/info/enrich` | Run profile enrichment on all Tier 1 & 2 leads |

---

## Subreddits monitored

```
startups · SaaS · Entrepreneur · indiehackers · smallbusiness
forhire · webdev · web_design · webdesign
nextjs · reactjs
marketing · digital_marketing
```

To add or remove subreddits, edit `backend/src/scrapers/reddit/reddit.config.js`.

---

## Scheduled scraping

The scheduler starts automatically when the backend boots. It runs the full pipeline on the interval set by `SCRAPE_INTERVAL_HOURS` (default: every 4 hours). To disable it, set `SCRAPE_INTERVAL_HOURS=0` or comment out `startScheduler()` in `backend/src/index.js`.

---

## Data model

Each lead in `leads.json` has the following shape:

```json
{
  "id": 1,
  "source": "reddit",
  "external_id": "t3_abc123",
  "title": "Looking for a dev to build our SaaS MVP",
  "body": "...",
  "author": "u/username",
  "url": "https://reddit.com/r/startups/comments/...",
  "subreddit": "startups",
  "score": 12,
  "created_at": 1712345678,
  "scraped_at": 1712350000,

  "tier": "1",
  "tier_reason": "Funded startup explicitly seeking a product team.",
  "fit_score": 8,
  "fit_breakdown": { "budget": 8, "scope_fit": 9, "urgency": 7, "company_stage": 8 },
  "demo_suggestion": "Build a clickable prototype of their onboarding flow in 48h.",
  "outreach_angle": "You mentioned needing speed — we shipped Snapchat's web experience in 3 weeks.",

  "contacted": 0,
  "contacted_at": null,
  "notes": null,

  "profile_summary": null,
  "company_name": null,
  "role": null,
  "email": null,
  "website": null,
  "linkedin": null,
  "twitter": null,
  "contact_confidence": null,
  "profile_enriched_at": null
}
```
