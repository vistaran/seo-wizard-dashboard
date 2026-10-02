// Module 6 — Technical SEO Health & Indexing: Core Web Vitals, indexation monitor, orphan page detector.
const { Router } = require('express');
const gsc = require('../lib/gsc');
const { getCoreWebVitals } = require('../lib/cwv');
const { parseSitemap, discoverInternalLinks } = require('../lib/sitemap');
const { cached } = require('../lib/cache');
const { getSite, handler } = require('../lib/util');

const router = Router();

async function gather(site) {
  const homepage = site.homepage;
  const hostname = new URL(homepage).hostname;

  const [cwv, indexedPages, sitemap] = await Promise.all([
    getCoreWebVitals(site.domain, homepage).catch(() => null),
    gsc.pageTotals(site.gscProperty, 28).catch(() => []),
    parseSitemap(`${homepage.replace(/\/$/, '')}/sitemap.xml`).catch(() => ({ urls: [], sitemapCount: 0 })),
  ]);

  // Indexation monitor: sitemap URLs that have appeared in GSC (indexed) vs not.
  const indexedSet = new Set(indexedPages.map((p) => p.page));
  const sitemapUrls = sitemap.urls;
  const indexedCount = sitemapUrls.filter((u) => indexedSet.has(u) || indexedSet.has(u.replace(/\/$/, ''))).length;
  const valid = indexedCount;
  const errors = [];
  const notIndexed = sitemapUrls.filter((u) => !(indexedSet.has(u) || indexedSet.has(u.replace(/\/$/, ''))));
  for (const u of notIndexed.slice(0, 50)) {
    errors.push({ url: u, type: 'discovered_not_indexed', note: 'In sitemap but not yet seen in GSC (may be discovered-not-indexed or 404)' });
  }

  // Orphan page detector: sitemap URLs with zero incoming internal links.
  const topPages = indexedPages.slice(0, 6).map((p) => p.page);
  const crawlPages = [homepage, ...topPages];
  const internalLinks = await discoverInternalLinks(hostname, crawlPages).catch(() => []);
  const linkSet = new Set(internalLinks);
  const orphans = sitemapUrls
    .filter((u) => {
      const clean = u.replace(/\/$/, '');
      return !linkSet.has(u) && !linkSet.has(clean) && ![...linkSet].some((l) => l.replace(/\/$/, '') === clean);
    })
    .slice(0, 100)
    .map((url) => ({ url, note: 'No incoming internal links found in crawl' }));

  return {
    cwv,
    indexation: {
      sitemapTotal: sitemapUrls.length,
      sitemapCount: sitemap.sitemapCount,
      indexed: valid,
      errors: errors,
      errorCount: errors.length,
      indexedPagesSeen: indexedPages.length,
    },
    orphans: { count: orphans.length, pages: orphans.slice(0, 50) },
  };
}

router.get('/:siteKey', handler(async (req, res) => {
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  // cache longer — crawl-heavy
  const data = await cached(`tech:${site.key}`, 15 * 60 * 1000, () => gather(site));
  res.json(data);
}));

module.exports = router;
