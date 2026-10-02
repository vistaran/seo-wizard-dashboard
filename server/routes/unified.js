// Unified view — high-level metrics aggregated across the portfolio.
const { Router } = require('express');
const { get } = require('../lib/db');
const { SITES } = require('../config');
const { gatherSite } = require('./overview');
const { handler } = require('../lib/util');

const router = Router();

router.get('/', handler(async (req, res) => {
  const db = get();
  const portfolio = [];
  for (const site of SITES) {
    const data = await gatherSite(site).catch((e) => ({ error: e.message }));
    const issueCounts = db.prepare('SELECT status, COUNT(*) c FROM issues WHERE site_key=? GROUP BY status').all(site.key);
    const issueSummary = { open: 0, pending_review: 0, resolved: 0 };
    for (const r of issueCounts) issueSummary[r.status] = r.c;

    portfolio.push({
      key: site.key,
      label: site.label,
      name: site.name,
      domain: site.domain,
      scores: { seo: data.seo?.score, geo: data.geo?.score, aeo: data.aeo?.score },
      traffic: data.gscTotals,
      aiSplit: data.aiSplit,
      issues: issueSummary,
    });
  }

  // portfolio aggregates
  const totalClicks = portfolio.reduce((s, p) => s + (p.traffic?.clicks || 0), 0);
  const totalImpressions = portfolio.reduce((s, p) => s + (p.traffic?.impressions || 0), 0);
  const totalAi = portfolio.reduce((s, p) => s + (p.aiSplit?.ai || 0), 0);
  const totalOrganic = portfolio.reduce((s, p) => s + (p.aiSplit?.organic || 0), 0);
  const avgSeo = Math.round(portfolio.reduce((s, p) => s + (p.scores.seo || 0), 0) / Math.max(1, portfolio.length));
  const avgGeo = Math.round(portfolio.reduce((s, p) => s + (p.scores.geo || 0), 0) / Math.max(1, portfolio.length));
  const avgAeo = Math.round(portfolio.reduce((s, p) => s + (p.scores.aeo || 0), 0) / Math.max(1, portfolio.length));
  const openIssues = portfolio.reduce((s, p) => s + (p.issues.open || 0), 0);

  res.json({
    portfolio,
    aggregate: {
      totalClicks, totalImpressions, totalAi, totalOrganic,
      avgSeo, avgGeo, avgAeo, openIssues,
      sites: portfolio.length,
    },
  });
}));

module.exports = router;
