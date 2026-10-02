// Module 3 — Executive Performance Snapshot (GA4 + GSC): trajectory, visibility matrix, top performers, CTR heatmap.
const { Router } = require('express');
const gsc = require('../lib/gsc');
const ga4 = require('../lib/ga4');
const { cached } = require('../lib/cache');
const { getSite, handler } = require('../lib/util');

const router = Router();

async function gather(site) {
  const [totalsWow, trajectory, visibility, topGsc, topGa4, heatmap, snapshot] = await Promise.all([
    gsc.totalsWow(site.gscProperty, 30).catch(() => ({ current: null, previous: null })),
    ga4.dailySessions(site.ga4Property, 30).catch(() => []),
    gsc.queryWow(site.gscProperty, 30, 10).catch(() => []),
    gsc.topPages(site.gscProperty, 30, 'impressions', 10).catch(() => []),
    ga4.topLandingPages(site.ga4Property, 30, 10).catch(() => []),
    gsc.ctrOpportunities(site.gscProperty, 30, 100, 15).catch(() => []),
    ga4.snapshot(site.ga4Property, 30).catch(() => null),
  ]);

  return { totalsWow, trajectory, visibility, topGsc, topGa4, heatmap, snapshot };
}

router.get('/:siteKey', handler(async (req, res) => {
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  const data = await cached(`perf:${site.key}`, 5 * 60 * 1000, () => gather(site));
  res.json(data);
}));

module.exports = router;
