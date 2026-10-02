// Module 1 — Executive "Bird's-Eye View": composite scores, recommendations, portfolio health, AI split.
const { Router } = require('express');
const gsc = require('../lib/gsc');
const ga4 = require('../lib/ga4');
const { auditPage } = require('../lib/scrape');
const { getCoreWebVitals } = require('../lib/cwv');
const { readLlmFiles } = require('../lib/notes');
const scores = require('../lib/scores');
const { get } = require('../lib/db');
const { cached } = require('../lib/cache');
const { getSite, handler } = require('../lib/util');
const { SITES } = require('../config');

const router = Router();

async function gatherSite(site) {
  const db = get();
  const [audit, gscTotals, queries, ai, drRow, cwv] = await Promise.all([
    auditPage(site.homepage).catch(() => ({ url: site.homepage, ok: false, error: 'audit failed' })),
    gsc.totals(site.gscProperty, 30).catch(() => null),
    gsc.topQueries(site.gscProperty, 30, 'impressions', 100).catch(() => []),
    ga4.organicVsAi(site.ga4Property, 30).catch(() => ({ organic: 0, ai: 0, other: 0, aiBreakdown: [] })),
    db.prepare('SELECT dr FROM dr_history WHERE site_key=? ORDER BY date DESC LIMIT 1').get(site.key),
    getCoreWebVitals(site.domain, site.homepage).catch(() => null),
  ]);

  const llmFiles = readLlmFiles(site.key);
  const hasLlm = Boolean(llmFiles['llms.txt'] || llmFiles['llms-full.txt']);

  const totalQueries = queries.length;
  const top3Queries = queries.filter((q) => q.position > 0 && q.position <= 3).length;
  const position1 = queries.filter((q) => q.position > 0 && q.position <= 1).length;
  const totalRanked = queries.filter((q) => q.position > 0).length;
  const dr = drRow ? Math.round(drRow.dr) : 10;

  const seo = scores.computeSeo({ audit, dr, cwv: cwv?.mobile || {} });
  const geo = scores.computeGeo({ audit, aiSessions: ai.ai, organicSessions: ai.organic, top3Queries, totalQueries, llmsTxt: hasLlm });
  const aeo = scores.computeAeo({ audit, top3Queries, totalQueries, position1, totalRanked });

  return {
    seo, geo, aeo,
    gscTotals: gscTotals || { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    aiSplit: { organic: ai.organic, ai: ai.ai, other: ai.other, aiBreakdown: ai.aiBreakdown },
    recommendations: scores.recommendations({ seo, geo, aeo }),
    auditSummary: {
      canonical: audit.canonical !== undefined ? Boolean(audit.canonical) : null,
      title: audit.title !== undefined ? Boolean(audit.title) : null,
      wordCount: audit.wordCount,
      schemaKinds: audit.schemaKinds || [],
      llmsTxt: hasLlm,
      dr,
    },
  };
}

router.get('/:siteKey', handler(async (req, res) => {
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  const data = await cached(`overview:${site.key}`, 5 * 60 * 1000, () => gatherSite(site));
  res.json(data);
}));

module.exports = { router, gatherSite };
