// Live page fetch + issue verification.
// fetch + cheerio for static HTML checks; Firecrawl (self-hosted) as a JS-render fallback.
const cheerio = require('cheerio');

const FIRECRAWL_URL = process.env.FIRECRAWL_API_URL || 'http://localhost:3002/v1';

async function fetchHtml(url, { useFirecrawl = false } = {}) {
  // 1) try plain fetch (fast, no dependency)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (SEO Wizard; +audit)' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const html = await res.text();
    return { html, status: res.status, url: res.url || url, via: 'fetch' };
  } catch (e) {
    // 2) fallback to Firecrawl scrape if available
    if (useFirecrawl) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 30000);
        const r = await fetch(`${FIRECRAWL_URL}/scrape`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url, formats: ['html', 'markdown'] }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const j = await r.json();
        if (j.success && (j.data?.html || j.data?.markdown)) {
          return { html: j.data.html || `<html><body>${j.data.markdown}</body></html>`, status: j.data?.metadata?.statusCode || 200, url, via: 'firecrawl' };
        }
        return { html: '', status: 0, url, via: 'firecrawl', error: 'Firecrawl returned no content' };
      } catch (fe) {
        return { html: '', status: 0, url, via: 'none', error: `fetch failed: ${e.message}; firecrawl failed: ${fe.message}` };
      }
    }
    return { html: '', status: 0, url, via: 'none', error: e.message };
  }
}

function wordCount($) {
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

/**
 * Verify a single issue against a live URL.
 * check_spec examples:
 *   {type:'meta_description', max:160}
 *   {type:'canonical', expected:'https://x/'}
 *   {type:'h1_count', min:1}
 *   {type:'schema', kind:'FAQPage'}
 *   {type:'word_count', min:300}
 *   {type:'title', max:60}
 *   {type:'broken_link', href:'...'}
 * Returns { resolved, summary, details }.
 */
async function verifyIssue(url, checkSpec) {
  const spec = typeof checkSpec === 'string' ? JSON.parse(checkSpec || '{}') : (checkSpec || {});
  const { html, status, via, error } = await fetchHtml(url, { useFirecrawl: true });

  if (!html) {
    return { resolved: false, summary: `Could not fetch ${url}: ${error || 'no content'}`, details: { error }, via };
  }
  if (status >= 400) {
    return { resolved: false, summary: `Page returned HTTP ${status} — not reachable.`, details: { status }, via };
  }

  const $ = cheerio.load(html);
  const out = { via, status };
  let resolved = false;
  let summary = '';

  switch (spec.type) {
    case 'meta_description': {
      const md = $('meta[name="description"]').attr('content') || '';
      out.found = md;
      out.length = md.length;
      if (!md) { resolved = false; summary = 'Meta description still missing.'; }
      else if (md.length > spec.max) { resolved = false; summary = `Meta description still ${md.length} chars (max ${spec.max}).`; }
      else { resolved = true; summary = `Meta description OK (${md.length} chars).`; }
      break;
    }
    case 'canonical': {
      const c = $('link[rel="canonical"]').attr('href') || '';
      out.found = c;
      if (!c) { resolved = false; summary = 'No canonical tag found.'; }
      else if (spec.expected && !c.replace(/\/$/, '').includes(spec.expected.replace(/\/$/, ''))) { resolved = false; summary = `Canonical is "${c}" (expected "${spec.expected}").`; }
      else { resolved = true; summary = `Canonical present: ${c}.`; }
      break;
    }
    case 'title': {
      const t = $('title').text().trim();
      out.found = t; out.length = t.length;
      if (!t) { resolved = false; summary = 'Title tag missing.'; }
      else if (t.length > spec.max) { resolved = false; summary = `Title still ${t.length} chars (max ${spec.max}).`; }
      else { resolved = true; summary = `Title OK (${t.length} chars).`; }
      break;
    }
    case 'h1_count': {
      const n = $('h1').length;
      out.count = n;
      if (n < (spec.min ?? 1)) { resolved = false; summary = `H1 still missing (found ${n}).`; }
      else { resolved = true; summary = `H1 present (${n}).`; }
      break;
    }
    case 'schema': {
      const schemas = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).html() || '';
        try { schemas.push(JSON.parse(raw)); } catch { /* skip malformed */ }
      });
      const flat = schemas.map((s) => (Array.isArray(s) ? s : [s])).flat();
      const kinds = flat.map((s) => s['@type']).filter(Boolean);
      out.kinds = kinds;
      const want = spec.kind;
      if (kinds.some((k) => (Array.isArray(k) ? k : [k]).includes(want))) {
        resolved = true; summary = `${want} schema present.`;
      } else {
        resolved = false; summary = `${want} schema still missing (found: ${kinds.length ? kinds.join(', ') : 'none'}).`;
      }
      break;
    }
    case 'word_count': {
      const wc = wordCount($);
      out.count = wc;
      if (wc < spec.min) { resolved = false; summary = `Still thin: ${wc} words (min ${spec.min}).`; }
      else { resolved = true; summary = `Content length OK (${wc} words).`; }
      break;
    }
    case 'broken_link': {
      const href = spec.href;
      const found = $(`a[href*="${href}"]`).length > 0;
      out.found = found;
      // check target status too if it's an absolute URL
      if (found && /^https?:/.test(href)) {
        const t = await fetchHtml(href);
        out.targetStatus = t.status;
        resolved = t.status < 400;
        summary = resolved ? `Link present and target returns ${t.status}.` : `Link present but target returns ${t.status}.`;
      } else {
        resolved = found;
        summary = found ? 'Link present.' : `Link to "${href}" still missing.`;
      }
      break;
    }
    default:
      resolved = false;
      summary = `Unknown check type "${spec.type}".`;
  }

  return { resolved, summary, details: out, via };
}

/** Quick on-page audit for a URL — returns all detectable signals (used by the auto-audit engine). */
async function auditPage(url) {
  const { html, status, via, error } = await fetchHtml(url, { useFirecrawl: true });
  if (!html) return { url, ok: false, error, status };
  const $ = cheerio.load(html);
  const schemas = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { schemas.push(JSON.parse($(el).html() || '')); } catch { /* skip */ }
  });
  const flat = schemas.map((s) => (Array.isArray(s) ? s : [s])).flat();
  const kinds = flat.map((s) => s['@type']).filter(Boolean).flat();
  const images = $('img').length;
  const noAlt = $('img:not([alt])').length;
  const h1 = $('h1').length;

  return {
    url,
    ok: true,
    status,
    via,
    title: $('title').text().trim(),
    titleLength: $('title').text().trim().length,
    metaDescription: $('meta[name="description"]').attr('content') || '',
    metaDescriptionLength: ($('meta[name="description"]').attr('content') || '').length,
    canonical: $('link[rel="canonical"]').attr('href') || '',
    h1,
    wordCount: wordCount($),
    images,
    missingAlt: noAlt,
    schemaKinds: [...new Set(kinds)],
    internalLinks: $('a[href^="/"], a[href*="://' + new URL(url).hostname + '"]').length,
  };
}

module.exports = { fetchHtml, verifyIssue, auditPage, wordCount };
