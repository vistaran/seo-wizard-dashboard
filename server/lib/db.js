// SQLite persistence layer (built-in node:sqlite).
// Schema + seeding + typed helpers. All mutable dashboard state lives here:
// issues + changelog, notes, keywords, content calendar, clusters, DR/backlinks,
// competitors, and score history.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { DB_FILE, SITES } = require('../config');

let db;

function init() {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  createSchema();
  seed();
  return db;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      key            TEXT PRIMARY KEY,
      label          TEXT NOT NULL,
      name           TEXT NOT NULL,
      domain         TEXT NOT NULL,
      homepage       TEXT NOT NULL,
      gsc_property   TEXT NOT NULL,
      ga4_property   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competitors (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key TEXT NOT NULL,
      name     TEXT NOT NULL,
      domain   TEXT NOT NULL,
      UNIQUE(site_key, domain)
    );

    CREATE TABLE IF NOT EXISTS issues (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key         TEXT NOT NULL,
      url              TEXT NOT NULL,
      category         TEXT NOT NULL,   -- technical / onpage / content / links / aeo / geo
      severity         TEXT NOT NULL,   -- critical / warning / opportunity
      title            TEXT NOT NULL,
      description      TEXT NOT NULL,
      recommended_fix  TEXT NOT NULL,
      check_spec       TEXT,            -- JSON: how to verify (tag/selector/href/wordcount...)
      status           TEXT NOT NULL DEFAULT 'open',  -- open / pending_review / resolved
      first_detected   TEXT NOT NULL,
      last_verified    TEXT,
      resolved_by      TEXT,
      resolution_notes TEXT,
      verify_summary   TEXT,
      created_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issue_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id   INTEGER NOT NULL,
      event      TEXT NOT NULL,   -- detected / verified_fixed / verified_failed / resolved / reopened / updated
      detail     TEXT,
      timestamp  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key    TEXT NOT NULL,
      date        TEXT NOT NULL,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      tags        TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keywords (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key       TEXT NOT NULL,
      keyword        TEXT NOT NULL,
      target_url     TEXT NOT NULL,
      search_volume  INTEGER NOT NULL DEFAULT 0,
      difficulty     INTEGER NOT NULL DEFAULT 0,   -- 0-100
      intent         TEXT NOT NULL DEFAULT 'informational',
      UNIQUE(site_key, keyword)
    );

    CREATE TABLE IF NOT EXISTS content_calendar (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key         TEXT NOT NULL,
      title            TEXT NOT NULL,
      slug             TEXT,
      cluster          TEXT NOT NULL DEFAULT 'general',
      status           TEXT NOT NULL DEFAULT 'planned',  -- planned / drafting / published
      publish_date     TEXT,
      target_keywords  TEXT NOT NULL DEFAULT '',
      url              TEXT,
      created_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clusters (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key     TEXT NOT NULL,
      name         TEXT NOT NULL,
      pillar       TEXT NOT NULL,   -- pillar / support / product
      description  TEXT NOT NULL DEFAULT '',
      UNIQUE(site_key, name)
    );

    CREATE TABLE IF NOT EXISTS dr_history (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key  TEXT NOT NULL,
      date      TEXT NOT NULL,
      dr        REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backlink_velocity (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key   TEXT NOT NULL,
      date       TEXT NOT NULL,
      gained     INTEGER NOT NULL,
      lost       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS score_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      site_key    TEXT NOT NULL,
      date        TEXT NOT NULL,
      seo_score   INTEGER NOT NULL,
      geo_score   INTEGER NOT NULL,
      aeo_score   INTEGER NOT NULL,
      breakdown   TEXT NOT NULL   -- JSON
    );
  `);
}

// ------------------------------------------------------------------ seeding

function seed() {
  const siteCount = db.prepare('SELECT COUNT(*) c FROM sites').get().c;
  if (siteCount > 0) return;

  const now = new Date().toISOString();
  const insertSite = db.prepare(
    'INSERT INTO sites (key,label,name,domain,homepage,gsc_property,ga4_property) VALUES (?,?,?,?,?,?,?)'
  );
  const insertComp = db.prepare('INSERT INTO competitors (site_key,name,domain) VALUES (?,?,?)');

  for (const s of SITES) {
    insertSite.run(s.key, s.label, s.name, s.domain, s.homepage, s.gscProperty, s.ga4Property);
    for (const d of s.competitors) {
      const name = d.replace(/^www\./, '').split('.')[0];
      insertComp.run(s.key, name, d);
    }
  }

  seedKeywords();
  seedClusters();
  seedCalendar();
  seedDrBacklinks();
  seedIssues();
}

function seedKeywords() {
  const k = db.prepare(
    'INSERT INTO keywords (site_key,keyword,target_url,search_volume,difficulty,intent) VALUES (?,?,?,?,?,?)'
  );
  const rows = {
    vistaran: [
      ['ai agent hosting', 'https://vistaran.com/', 1400, 42, 'commercial'],
      ['rag infrastructure', 'https://vistaran.com/', 880, 51, 'commercial'],
      ['edge ai deployment', 'https://vistaran.com/', 590, 47, 'commercial'],
      ['gandhinagar it company', 'https://vistaran.com/', 720, 28, 'commercial'],
      ['full stack development services', 'https://vistaran.com/', 1600, 55, 'commercial'],
      ['what is retrieval augmented generation', 'https://vistaran.com/', 2400, 38, 'informational'],
    ],
    boomerr: [
      ['uptime monitoring tool', 'https://boomerr.ai/', 3200, 61, 'commercial'],
      ['website uptime monitoring', 'https://boomerr.ai/', 2600, 55, 'commercial'],
      ['shopify uptime monitoring', 'https://boomerr.ai/features/shopify-uptime-monitoring', 480, 34, 'commercial'],
      ['boomerr vs uptimerobot', 'https://boomerr.ai/', 210, 22, 'commercial'],
      ['synthetic monitoring', 'https://boomerr.ai/', 1300, 58, 'commercial'],
      ['ssl certificate monitoring', 'https://boomerr.ai/', 720, 39, 'commercial'],
    ],
    lushly: [
      ['online gardener service india', 'https://lushlyapp.com/', 390, 19, 'commercial'],
      ['plant care service', 'https://lushlyapp.com/', 620, 27, 'commercial'],
      ['home gardening tips', 'https://lushlyapp.com/blogs/', 1900, 33, 'informational'],
      ['best indoor plants india', 'https://lushlyapp.com/blogs/', 1500, 30, 'informational'],
      ['garden maintenance service', 'https://lushlyapp.com/', 360, 22, 'commercial'],
    ],
  };
  for (const [site, list] of Object.entries(rows)) {
    for (const r of list) k.run(site, ...r);
  }
}

function seedClusters() {
  const c = db.prepare('INSERT INTO clusters (site_key,name,pillar,description) VALUES (?,?,?,?)');
  const rows = {
    vistaran: [
      ['AI Agent Hosting', 'pillar', 'Managed hosting for autonomous AI agents'],
      ['RAG & AI Infrastructure', 'pillar', 'Retrieval-augmented generation and vector infra'],
      ['Edge AI', 'support', 'Edge deployment of AI workloads'],
      ['Full-Stack Development', 'pillar', 'Web + backend engineering services'],
    ],
    boomerr: [
      ['Uptime Monitoring', 'pillar', 'Core uptime + availability monitoring'],
      ['Shopify Monitoring', 'support', 'E-commerce specific uptime checks'],
      ['Synthetic Monitoring', 'pillar', 'Proactive transaction + API monitoring'],
      ['SSL & Domain Monitoring', 'support', 'Certificate and domain expiry tracking'],
    ],
    lushly: [
      ['Gardener Services', 'pillar', 'On-demand online gardener booking'],
      ['Plant Care Guides', 'pillar', 'How-to gardening content'],
      ['Indoor Plants', 'support', 'Indoor plant selection and care'],
      ['Garden Maintenance', 'support', 'Ongoing garden upkeep services'],
    ],
  };
  for (const [site, list] of Object.entries(rows)) {
    for (const r of list) c.run(site, ...r);
  }
}

function seedCalendar() {
  const c = db.prepare(
    'INSERT INTO content_calendar (site_key,title,slug,cluster,status,publish_date,target_keywords,url,created_at) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  const now = new Date();
  const iso = (offsetDays) => new Date(now.getTime() + offsetDays * 864e5).toISOString().slice(0, 10);
  const rows = [
    ['boomerr', 'Boomerr vs UptimeRobot vs Pingdom: Full 2026 Comparison', 'boomerr-vs-uptimerobot-vs-pingdom', 'Uptime Monitoring', 'drafting', iso(-5), 'boomerr vs uptimerobot', '', new Date().toISOString()],
    ['boomerr', 'Shopify Uptime Monitoring: Complete Setup Guide', 'shopify-uptime-monitoring-guide', 'Shopify Monitoring', 'planned', iso(7), 'shopify uptime monitoring', '', new Date().toISOString()],
    ['boomerr', 'Synthetic Monitoring 101: What It Is and Why You Need It', 'synthetic-monitoring-101', 'Synthetic Monitoring', 'planned', iso(14), 'synthetic monitoring', '', new Date().toISOString()],
    ['lushly', '10 Best Indoor Plants for Indian Homes', 'best-indoor-plants-india', 'Indoor Plants', 'published', iso(-30), 'best indoor plants india', 'https://lushlyapp.com/blogs/best-indoor-plants-india', new Date().toISOString()],
    ['lushly', 'How to Start a Home Garden: A Beginner\'s Guide', 'how-to-start-home-garden', 'Plant Care Guides', 'drafting', iso(-3), 'home gardening tips', '', new Date().toISOString()],
    ['vistaran', 'What Is Retrieval-Augmented Generation (RAG)?', 'what-is-rag', 'RAG & AI Infrastructure', 'planned', iso(3), 'what is retrieval augmented generation', '', new Date().toISOString()],
    ['vistaran', 'AI Agent Hosting: Managed vs Self-Hosted', 'ai-agent-hosting-managed-vs-self-hosted', 'AI Agent Hosting', 'planned', iso(10), 'ai agent hosting', '', new Date().toISOString()],
  ];
  for (const r of rows) c.run(...r);
}

function seedDrBacklinks() {
  const dr = db.prepare('INSERT INTO dr_history (site_key,date,dr) VALUES (?,?,?)');
  const bl = db.prepare('INSERT INTO backlink_velocity (site_key,date,gained,lost) VALUES (?,?,?,?)');
  const base = { vistaran: 18, boomerr: 12, lushly: 7 };
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 30 * 864e5).toISOString().slice(0, 10);
    for (const [site, b] of Object.entries(base)) {
      const drift = Math.round((11 - i) * 0.6);
      dr.run(site, d, b + drift);
      if (i === 0) bl.run(site, d, Math.max(0, 2 + drift), Math.max(0, drift > 3 ? 1 : 0));
    }
  }
}

function seedIssues() {
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO issues (site_key,url,category,severity,title,description,recommended_fix,check_spec,status,first_detected,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );
  const issues = [
    ['vistaran', 'https://vistaran.com/', 'onpage', 'warning', 'Homepage meta description exceeds 160 characters', 'The meta description is 172 chars and gets truncated in SERPs, weakening CTR.', 'Rewrite meta description to 150–160 chars with a primary keyword + clear value prop.', '{"type":"meta_description","max":160}', 'open', now, now],
    ['vistaran', 'https://vistaran.com/', 'technical', 'warning', 'Missing canonical tag on homepage', 'No rel=canonical found; Google may treat HTTP/HTTPS or www variants as duplicates.', 'Add <link rel="canonical" href="https://vistaran.com/"> to <head>.', '{"type":"canonical","expected":"https://vistaran.com/"}', 'open', now, now],
    ['boomerr', 'https://boomerr.ai/features/shopify-uptime-monitoring', 'onpage', 'warning', 'Missing H1 on feature page', 'Page lacks a single H1, diluting topical relevance for "shopify uptime monitoring".', 'Add exactly one H1 containing the target keyword.', '{"type":"h1_count","min":1}', 'open', now, now],
    ['boomerr', 'https://boomerr.ai/', 'aeo', 'opportunity', 'No FAQPage schema on homepage', 'FAQ structured data would qualify content for rich results and answer engines.', 'Add FAQPage JSON-LD answering 3–4 common uptime questions.', '{"type":"schema","kind":"FAQPage"}', 'open', now, now],
    ['lushly', 'https://lushlyapp.com/blogs/', 'content', 'warning', 'Blog index page has thin content', 'The /blogs index has under 300 words of visible text, limiting topic authority.', 'Expand the index with a 300+ word intro + links to top 5 guides.', '{"type":"word_count","min":300}', 'open', now, now],
    ['lushly', 'https://lushlyapp.com/', 'geo', 'opportunity', 'No HowTo/FAQ schema for answer engines', 'Product page lacks structured Q&A, limiting citation by AI answer engines.', 'Add FAQPage schema with service questions (pricing, coverage, booking).', '{"type":"schema","kind":"FAQPage"}', 'open', now, now],
  ];
  for (const r of issues) ins.run(...r);

  // initial changelog entries
  const log = db.prepare('INSERT INTO issue_log (issue_id,event,detail,timestamp) VALUES (?,?,?,?)');
  const all = db.prepare('SELECT id FROM issues').all();
  for (const { id } of all) log.run(id, 'detected', 'Issue auto-detected by AI audit engine', now);
}

// ------------------------------------------------------------------ helpers

// Serialize a row (node:sqlite returns null-prototype objects).
function clean(row) {
  if (!row) return row;
  return JSON.parse(JSON.stringify(row));
}
function cleanAll(rows) {
  return rows.map(clean);
}

function get() {
  return db;
}

module.exports = { init, get, clean, cleanAll };
