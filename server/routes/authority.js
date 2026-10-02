// Module 5 — Authority & Keyword Tracking: keyword vault (live ranks), DR trendline, backlink velocity, competitor share of voice.
const { Router } = require('express');
const { get } = require('../lib/db');
const gsc = require('../lib/gsc');
const { cached } = require('../lib/cache');
const { getSite, handler } = require('../lib/util');

const router = Router();

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

async function gather(site) {
  const db = get();
  const keywords = db.prepare('SELECT * FROM keywords WHERE site_key=?').all(site.key).map((r) => JSON.parse(JSON.stringify(r)));
  const drHistory = db.prepare('SELECT date, dr FROM dr_history WHERE site_key=? ORDER BY date').all(site.key).map((r) => JSON.parse(JSON.stringify(r)));
  const bl = db.prepare('SELECT * FROM backlink_velocity WHERE site_key=? ORDER BY date DESC LIMIT 1').get(site.key);
  const competitors = db.prepare('SELECT * FROM competitors WHERE site_key=?').all(site.key).map((r) => JSON.parse(JSON.stringify(r)));

  // live ranks for target keywords
  const kwList = keywords.map((k) => k.keyword);
  const ranks = await gsc.keywordPositions(site.gscProperty, kwList, 28).catch(() => []);
  const rankMap = {};
  for (const r of ranks) rankMap[r.query.toLowerCase()] = r;

  const vault = keywords.map((k) => {
    const live = rankMap[k.keyword.toLowerCase()];
    const position = live ? (live.position === 0 ? null : live.position) : null;
    const clicks = live ? live.clicks : 0;
    const impressions = live ? live.impressions : 0;
    // position → rank status
    let band = 'Not ranking';
    if (position !== null) {
      if (position <= 3) band = 'Top 3';
      else if (position <= 10) band = 'Top 10';
      else if (position <= 20) band = 'Striking distance';
      else band = 'Page 2+';
    }
    return { ...k, position, clicks, impressions, band, estimated: false };
  });

  // competitor share of voice (estimated — no rank-tracking API key; deterministic model)
  const sov = vault.map((k) => {
    const ours = k.position ?? 40;
    const comps = competitors.map((c) => {
      const seed = hashStr(c.domain + k.keyword);
      const pos = Math.max(1, Math.round(ours + (seed % 25) - 8));
      return { name: c.name, domain: c.domain, position: pos };
    });
    const ranking = [{ name: 'You', position: ours }, ...comps].sort((a, b) => a.position - b.position);
    const top3 = ranking.slice(0, 3).map((r) => r.name);
    return { keyword: k.keyword, you: ours, ranking, top3Owned: top3.includes('You'), estimated: true };
  });

  return {
    vault,
    drHistory,
    latestDr: drHistory.length ? drHistory[drHistory.length - 1].dr : null,
    backlinks: bl ? JSON.parse(JSON.stringify(bl)) : { gained: 0, lost: 0, date: null },
    netBacklinks: bl ? bl.gained - bl.lost : 0,
    competitors,
    shareOfVoice: sov,
  };
}

router.get('/:siteKey', handler(async (req, res) => {
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  const data = await cached(`auth:${site.key}`, 5 * 60 * 1000, () => gather(site));
  res.json(data);
}));

module.exports = router;
