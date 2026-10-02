// Module 4 — Content Strategy & Operations: calendar, cluster map, decay alerts, AI calendar generation.
const { Router } = require('express');
const { get } = require('../lib/db');
const gsc = require('../lib/gsc');
const { listNotes } = require('../lib/notes');
const { contentDecay, generateCalendar } = require('../lib/content');
const { getSite, handler } = require('../lib/util');

const router = Router();

// Cluster map: existing pages (from calendar + KB outlines) vs gaps per cluster.
function clusterMap(siteKey, calendar, kbNotes) {
  const db = get();
  const clusters = db.prepare("SELECT * FROM clusters WHERE site_key=? ORDER BY CASE pillar WHEN 'pillar' THEN 0 ELSE 1 END, name").all(siteKey).map((c) => JSON.parse(JSON.stringify(c)));
  const map = clusters.map((c) => {
    const existing = calendar.filter((x) => x.cluster === c.name);
    const published = existing.filter((x) => x.status === 'published');
    const drafting = existing.filter((x) => x.status === 'drafting');
    const planned = existing.filter((x) => x.status === 'planned');
    const kb = kbNotes.filter((n) => n.folder.toLowerCase().includes(c.name.toLowerCase().split(' ')[0].toLowerCase()));
    const gaps = planned.length === 0 && published.length === 0
      ? [`A pillar page targeting "${c.name}"`, `2–3 supporting articles around "${c.name}"`]
      : published.length === 0
        ? [`Publish the "${c.name}" pillar page`]
        : [];
    return {
      name: c.name,
      pillar: c.pillar,
      description: c.description,
      published: published.map((x) => x.title),
      drafting: drafting.map((x) => x.title),
      planned: planned.map((x) => x.title),
      kbAssets: kb.length,
      gaps,
      completeness: Math.min(100, Math.round((published.length / 3) * 100)),
    };
  });
  return map;
}

router.get('/:siteKey', handler(async (req, res) => {
  const db = get();
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });

  const calendar = db.prepare('SELECT * FROM content_calendar WHERE site_key=? ORDER BY publish_date IS NULL, publish_date').all(site.key).map((r) => JSON.parse(JSON.stringify(r)));
  const kbNotes = listNotes(site.key);

  // content decay: 90d vs prior 90d
  const day = gsc.day;
  const curPages = await gsc.pageTotals(site.gscProperty, 90).catch(() => []);
  const prevStart = new Date(new Date(day(91)).getTime() - 90 * 864e5).toISOString().slice(0, 10);
  const prevEnd = new Date(new Date(day(1)).getTime() - 90 * 864e5).toISOString().slice(0, 10);
  const prevPages = await gsc.pageTotalsAt(site.gscProperty, prevStart, prevEnd).catch(() => []);
  const decay = contentDecay(curPages, prevPages);

  res.json({
    calendar,
    clusters: clusterMap(site.key, calendar, kbNotes),
    decay,
    kbNotes,
  });
}));

// Generate a 3-month blogging schedule from keyword gaps + cluster gaps.
router.post('/:siteKey/generate', handler(async (req, res) => {
  const db = get();
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });

  const clusters = db.prepare("SELECT * FROM clusters WHERE site_key=? ORDER BY CASE pillar WHEN 'pillar' THEN 0 ELSE 1 END, name").all(site.key).map((r) => JSON.parse(JSON.stringify(r)));
  // keyword gaps: striking-distance / informational queries with impressions
  const queries = await gsc.topQueries(site.gscProperty, 30, 'impressions', 200).catch(() => []);
  const keywordGaps = queries
    .filter((q) => /how|what|best|guide|vs|why|tip|service|monitor|hosting|plant|garden|ai|agent/i.test(q.query))
    .map((q) => ({ keyword: q.query, impressions: q.impressions, position: q.position }))
    .slice(0, 30);

  const plan = generateCalendar(site.key, keywordGaps, clusters);
  const ins = db.prepare(
    'INSERT INTO content_calendar (site_key,title,slug,cluster,status,publish_date,target_keywords,url,created_at) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  const now = new Date().toISOString();
  const added = [];
  for (const p of plan) {
    ins.run(site.key, p.title, p.slug, p.cluster, 'planned', p.publish_date, p.target_keywords, '', now);
    added.push(p);
  }
  res.json({ added, plan });
}));

// Add / update a calendar entry (manual).
router.post('/:siteKey/calendar', handler(async (req, res) => {
  const db = get();
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  const { title, slug, cluster, status, publish_date, target_keywords, url } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  const ins = db.prepare(
    'INSERT INTO content_calendar (site_key,title,slug,cluster,status,publish_date,target_keywords,url,created_at) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  ins.run(site.key, title, slug || '', cluster || 'general', status || 'planned', publish_date || null, target_keywords || '', url || '', new Date().toISOString());
  res.json({ ok: true });
}));

module.exports = router;
