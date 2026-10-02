// Google Search Console query helpers (search analytics + coverage + page experience).
const { webmasters } = require('./google');

const day = (offset = 0) => {
  const d = new Date(Date.now() - offset * 864e5);
  return d.toISOString().slice(0, 10);
};

function dateWindow(days) {
  // e.g. days=30 -> start 31 days ago, end 1 day ago (GSC data lags ~1-2 days)
  return { startDate: day(days + 1), endDate: day(1) };
}

/**
 * Core search-analytics query. dimensions: array of GSC dims.
 * Returns raw rows [{keys, clicks, impressions, ctr, position}] mapped to objects.
 */
async function query({ siteUrl, startDate, endDate, dimensions, rowLimit = 25000, dimensionFilterGroups, startRow = 0 }) {
  const wm = await webmasters();
  const res = await wm.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate, endDate, dimensions,
      rowLimit: Math.min(rowLimit, 25000),
      startRow,
      ...(dimensionFilterGroups ? { dimensionFilterGroups } : {}),
    },
  });
  return res.data.rows || [];
}

/** Convenience: rows mapped to {dim1: val, ...dims, clicks, impressions, ctr, position}. */
function mapRows(rows, dimensions) {
  return rows.map((r) => {
    const o = {};
    dimensions.forEach((d, i) => { o[d] = r.keys[i]; });
    o.clicks = r.clicks;
    o.impressions = r.impressions;
    o.ctr = r.ctr;
    o.position = r.position;
    return o;
  });
}

/** Totals across all queries for a window (no dimensions). */
async function totals(siteUrl, days) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({ siteUrl, startDate, endDate, dimensions: [], rowLimit: 1 });
  const r = rows[0];
  return r
    ? { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }
    : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

/** WoW deltas for a given window length. */
async function totalsWow(siteUrl, days) {
  const cur = await totals(siteUrl, days);
  // previous window: [days*2 .. days+1] days ago (older start, newer end)
  const prev = await totalsAt(siteUrl, day(days + days), day(days + 1));
  return { current: cur, previous: prev };
}

async function totalsAt(siteUrl, startDate, endDate) {
  const rows = await query({ siteUrl, startDate, endDate, dimensions: [], rowLimit: 1 });
  const r = rows[0];
  return r
    ? { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }
    : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

/** Top queries by a metric. */
async function topQueries(siteUrl, days, by = 'clicks', limit = 10) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({ siteUrl, startDate, endDate, dimensions: ['query'], rowLimit: limit });
  return mapRows(rows, ['query']);
}

/** Top pages by a metric. */
async function topPages(siteUrl, days, by = 'clicks', limit = 10) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({ siteUrl, startDate, endDate, dimensions: ['page'], rowLimit: limit });
  return mapRows(rows, ['page']);
}

/** Pages with high impressions but low CTR (title/meta optimization candidates). */
async function ctrOpportunities(siteUrl, days, minImpressions = 100, limit = 15) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({ siteUrl, startDate, endDate, dimensions: ['page'], rowLimit: 25000 });
  return mapRows(rows, ['page'])
    .filter((r) => r.impressions >= minImpressions && r.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);
}

/** Coverage / indexation summary via GSC URL Inspection is slow; use coverage-style inference
 *  from searchanalytics: pages with impressions (indexed) vs sitemap-supplied totals.
 *  For simplicity we return pages that have EVER appeared, plus "discovered not indexed" heuristic.
 *  Real indexation counts come from the sitemap audit (below) where possible. */
async function indexedPages(siteUrl, days = 28) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({ siteUrl, startDate, endDate, dimensions: ['page'], rowLimit: 25000 });
  return mapRows(rows, ['page']);
}

/** Per-page positions for a single URL (for keyword rank lookup). */
async function pageQueries(siteUrl, page, days = 28, limit = 25) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({
    siteUrl, startDate, endDate, dimensions: ['query'], rowLimit: limit,
    dimensionFilterGroups: [{
      filters: [{ dimension: 'page', operator: 'contains', expression: page }],
    }],
  });
  return mapRows(rows, ['query']);
}

/** Keyword rank lookup across a set of keywords (returns current position/clicks/impressions per keyword). */
async function keywordPositions(siteUrl, keywords, days = 28) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({ siteUrl, startDate, endDate, dimensions: ['query'], rowLimit: 25000 });
  const mapped = mapRows(rows, ['query']);
  const map = {};
  for (const r of mapped) map[r.query.toLowerCase()] = r;
  return keywords.map((kw) => {
    const hit = map[kw.toLowerCase()];
    return hit || { query: kw, clicks: 0, impressions: 0, ctr: 0, position: null };
  });
}

/** Full page list with clicks/impressions for a window (for decay / orphan detection). */
async function pageTotals(siteUrl, days = 28) {
  const { startDate, endDate } = dateWindow(days);
  const rows = await query({ siteUrl, startDate, endDate, dimensions: ['page'], rowLimit: 25000 });
  return mapRows(rows, ['page']);
}

/** Page totals over an explicit custom window. */
async function pageTotalsAt(siteUrl, startDate, endDate) {
  const rows = await query({ siteUrl, startDate, endDate, dimensions: ['page'], rowLimit: 25000 });
  return mapRows(rows, ['page']);
}

/** Top queries with WoW position change (current vs previous window). */
async function queryWow(siteUrl, days = 30, limit = 10) {
  const cur = await topQueries(siteUrl, days, 'impressions', limit * 3);
  const { startDate, endDate } = dateWindow(days);
  const prevStart = new Date(new Date(startDate).getTime() - days * 864e5).toISOString().slice(0, 10);
  const prevEnd = new Date(new Date(endDate).getTime() - days * 864e5).toISOString().slice(0, 10);
  const prevRows = await query({ siteUrl, startDate: prevStart, endDate: prevEnd, dimensions: ['query'], rowLimit: 25000 });
  const prevMap = {};
  for (const r of mapRows(prevRows, ['query'])) prevMap[r.query] = r;
  return cur.map((r) => {
    const p = prevMap[r.query];
    const prevPos = p ? p.position : null;
    return {
      ...r,
      prevPosition: prevPos,
      posDelta: prevPos ? Math.round((prevPos - r.position) * 10) / 10 : null,
    };
  }).sort((a, b) => b.impressions - a.impressions).slice(0, limit);
}

module.exports = {
  day, dateWindow, query, mapRows, totals, totalsWow, totalsAt,
  topQueries, topPages, ctrOpportunities, indexedPages, pageQueries, keywordPositions,
  pageTotals, pageTotalsAt, queryWow,
};
