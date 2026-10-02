// Sitemap parsing + internal-link discovery (for indexation + orphan detection).
const cheerio = require('cheerio');
const { fetchHtml } = require('./scrape');

async function parseSitemap(root) {
  // root sitemap.xml may be a sitemap index pointing to sub-sitemaps.
  const urls = new Set();
  const seenSitemaps = new Set();
  const queue = [root];
  while (queue.length && seenSitemaps.size < 30) {
    const sm = queue.shift();
    if (seenSitemaps.has(sm)) continue;
    seenSitemaps.add(sm);
    const { html } = await fetchHtml(sm);
    if (!html) continue;
    const $ = cheerio.load(html, { xmlMode: true });
    $('sitemap > loc').each((_, el) => {
      const loc = $(el).text().trim();
      if (loc && !seenSitemaps.has(loc)) queue.push(loc);
    });
    $('url > loc').each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) urls.add(loc);
    });
  }
  return { urls: [...urls], sitemapCount: seenSitemaps.size };
}

/** Collect internal links from a set of pages. */
async function discoverInternalLinks(hostname, pages) {
  const links = new Set();
  for (const url of pages) {
    const { html } = await fetchHtml(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    $('a[href]').each((_, el) => {
      let href = $(el).attr('href') || '';
      if (href.startsWith('/')) href = `https://${hostname}${href}`;
      try {
        const u = new URL(href);
        if (u.hostname === hostname || u.hostname === `www.${hostname}`) {
          u.hash = '';
          links.add(u.toString());
        }
      } catch { /* skip malformed */ }
    });
    // don't over-crawl
    if (links.size > 3000) break;
  }
  return [...links];
}

module.exports = { parseSitemap, discoverInternalLinks };
