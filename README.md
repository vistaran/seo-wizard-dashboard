# 🧙 SEO Wizard — SEO · AEO · GEO Command Center

A centralized, interactive, multi-tenant dashboard for three Vistaran Tech websites
(vistaran.com, boomerr.ai, lushlyapp.com), built on **Node.js + Express**, **React + Vite + Tailwind CSS**,
with **SQLite** persistence and **live Google Search Console + GA4** integration.

---

## Architecture

```
seo-wizard/
├── server/                 # Node.js + Express backend (CommonJS)
│   ├── index.js            # entry — REST API + serves the built React app
│   ├── config.js           # tenants, credential paths, ports, AI-referrer list
│   ├── lib/                # data layer
│   │   ├── db.js           # SQLite schema + seed (node:sqlite)
│   │   ├── google.js       # service-account auth (GSC + GA4)
│   │   ├── gsc.js          # Search Console query helpers
│   │   ├── ga4.js          # GA4 query helpers + AI-referral detection
│   │   ├── scores.js       # SEO / GEO / AEO scoring + recommendations engine
│   │   ├── audit.js        # AI auto-audit engine (crawl + issue detection)
│   │   ├── scrape.js       # live page fetch + issue verification (cheerio + Firecrawl)
│   │   ├── cwv.js          # Core Web Vitals via PageSpeed Insights (estimated fallback)
│   │   ├── sitemap.js      # sitemap parsing + internal-link discovery
│   │   ├── notes.js        # internal Notes DB (Vistaran KB) reader
│   │   ├── content.js      # content decay + calendar generation
│   │   └── cache.js        # in-memory TTL cache for Google calls
│   ├── routes/             # 8 modules' REST endpoints
│   └── data/               # seo-wizard.db (auto-created)
└── client/                 # React + Vite + Tailwind frontend (ESM)
    ├── vite.config.js      # dev server + /api proxy to :4000
    └── src/
        ├── pages/          # Overview, Issues, Performance, Content, Authority, Technical, Notes
        ├── components/     # Layout (tenant switcher), UI primitives
        ├── context/        # tenant state
        └── api.js          # fetch wrapper
```

## Credentials

The backend authenticates to Google via the **service account** key at:

```
C:\Users\Jay\AppData\Local\hermes\profiles\eisen-seo-wizard\auth\service-account-key.json
```

The service account (`vistaran-seo-suite@hermes-agentic-systems.iam.gserviceaccount.com`) is
already delegated for GSC (as owner) and added to the GA4 properties. No Python runtime is needed.

## Requirements

- Node.js **22.5+** (uses the built-in `node:sqlite`; tested on Node 24)

## Run

### Production (single server serves both API + built React app)

```bash
cd D:\Development\seo-wizard
npm install                 # backend deps (already installed)
npm run build               # installs client deps + builds the React app to client/dist
npm start                   # → http://localhost:4000  (API + dashboard)
```

### Development (run both apps separately)

```bash
# terminal 1 — backend API (auto-reload)
npm run dev:server          # → http://localhost:4000

# terminal 2 — React dev server with hot reload + /api proxy
npm run dev:client          # → http://localhost:5173
```

Other scripts: `npm run server` (plain backend), `npm run build:client`, `npm run install:client`.

## Modules

1. **Overview** — Executive bird's-eye view: composite SEO/GEO/AEO scores (0–100), an AI
   recommendations engine (impact vs. effort), portfolio health grid, and an organic-vs-AI-referral
   split chart (AI referrals detected from GA4 `sessionSource` — chatgpt.com, perplexity.ai, etc.).
2. **Issues & Actions** — AI auto-audit engine (crawls homepage + top GSC pages, detects technical /
   on-page / content / AEO / GEO issues), severity + category triage, a live **Verify** button that
   re-fetches the URL to confirm a fix, auto status transitions, and a full audit changelog.
3. **Performance** — 30-day GA4 trajectory, visibility matrix (top queries with WoW position changes),
   top GSC pages + GA4 landing pages, and a CTR heatmap (high-impression / low-CTR pages).
4. **Content Strategy** — Kanban blog calendar, a one-click **3-month schedule generator** driven by
   keyword gaps + topical gaps, a topical cluster map (existing pages vs. gaps), and content-decay
   alerts (>15% click loss over 90 days).
5. **Authority & Keywords** — target keyword vault with live ranks, DR trendline, backlink velocity,
   and competitor share-of-voice.
6. **Technical Health** — Core Web Vitals traffic lights (mobile/desktop), indexation monitor
   (sitemap × GSC cross-check), and an orphan-page detector (crawl-based internal-link audit).
7. **Notes & Actions** — contextual notebook (SQLite + internal KB markdown), plus a weekly top-3
   AI actionable to-do list generated from live ranking drops / CTR / striking-distance signals.
8. **Unified View** — portfolio-level aggregate across all three properties.

## Data provenance

- **Live:** GSC (clicks/impressions/position/CTR), GA4 (sessions/engagement/referrers), on-page
  audit, indexation, orphan detection, live issue verification, internal KB notes.
- **Estimated (clearly labelled in the UI):** Domain Rating/DA, backlink velocity, competitor
  share-of-voice, keyword difficulty/volume, and Core Web Vitals when the PageSpeed Insights quota
  is exhausted. Plug in Ahrefs/Semrush/PSI keys to make these live.

## Configuration

Edit `server/config.js` to add/rename tenants, GA4/GSC property IDs, competitors, or AI-referrer domains.
Mutable state (issues, notes, keywords, calendar, DR/backlinks) lives in `server/data/seo-wizard.db`
and can be reset by deleting that file.
