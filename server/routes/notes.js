// Module 7 — Notes Management & Action Center: contextual notebook + AI actionable insights.
const { Router } = require('express');
const { get } = require('../lib/db');
const gsc = require('../lib/gsc');
const { listNotes, readNote } = require('../lib/notes');
const { contentDecay } = require('../lib/content');
const { getSite, handler } = require('../lib/util');

const router = Router();

// AI actionable insights: weekly top-3 to-do from live GSC/GA4 signals.
async function insights(site) {
  const todos = [];
  const [queryWow, ctrOpps] = await Promise.all([
    gsc.queryWow(site.gscProperty, 28, 30).catch(() => []),
    gsc.ctrOpportunities(site.gscProperty, 28, 80, 10).catch(() => []),
  ]);

  // 1) biggest ranking drops
  const drops = queryWow.filter((q) => q.posDelta !== null && q.posDelta < -1).sort((a, b) => a.posDelta - b.posDelta);
  if (drops.length) {
    const d = drops[0];
    todos.push({ type: 'ranking_drop', title: `Refresh content: "${d.query}" dropped ${Math.abs(d.posDelta)} positions`, detail: `Now at position ${d.position.toFixed(1)} (was ${d.prevPosition.toFixed(1)}). Refresh the target page and strengthen internal links.`, url: null, priority: 'high' });
  }
  // 2) top CTR opportunity
  if (ctrOpps.length) {
    const c = ctrOpps[0];
    todos.push({ type: 'ctr', title: `Optimize title/meta: ${c.page}`, detail: `${c.impressions} impressions but only ${(c.ctr * 100).toFixed(2)}% CTR. Rewrite title + meta description to lift click-through.`, url: c.page, priority: 'medium' });
  }
  // 3) striking-distance keyword
  const striking = queryWow.filter((q) => q.position >= 11 && q.position <= 20).sort((a, b) => b.impressions - a.impressions);
  if (striking.length) {
    const s = striking[0];
    todos.push({ type: 'striking_distance', title: `Push "${s.query}" onto page 1`, detail: `Ranking at ${s.position.toFixed(1)} with ${s.impressions} impressions — a content refresh could move it into the top 10.`, url: null, priority: 'low' });
  }

  return todos.slice(0, 3);
}

router.get('/:siteKey', handler(async (req, res) => {
  const db = get();
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });

  const userNotes = db.prepare('SELECT * FROM notes WHERE site_key=? ORDER BY date DESC').all(site.key).map((r) => JSON.parse(JSON.stringify(r)));
  const kbNotes = listNotes(site.key);
  const todos = await insights(site);

  res.json({ userNotes, kbNotes, insights: todos });
}));

// Create a user note (algorithm update, experiment, site change).
router.post('/:siteKey', handler(async (req, res) => {
  const db = get();
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  const { date, title, content, tags } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  const ins = db.prepare('INSERT INTO notes (site_key,date,title,content,tags,created_at) VALUES (?,?,?,?,?,?)');
  const info = ins.run(site.key, date || new Date().toISOString().slice(0, 10), title, content, tags || '', new Date().toISOString());
  res.json({ ok: true, id: Number(info.lastInsertRowid) });
}));

// Read a KB note's full content.
router.get('/:siteKey/read', handler(async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'path query required' });
  res.json(readNote(String(path)));
}));

module.exports = router;
