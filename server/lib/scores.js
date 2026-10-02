// SEO / GEO / AEO composite scoring engine (0–100 each) + AI recommendation generator.
// Inputs are gathered live where possible (GSC positions, GA4 AI referrals, on-page audit)
// and estimated where a third-party source is unavailable (DR/DA, CWV) — clearly labelled.

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

// ------------------------------------------------------------------ SEO score

function computeSeo(ctx) {
  const { audit = {}, dr = 0, cwv = {} } = ctx;
  const components = [];

  // Technical health (0–30)
  let tech = 30;
  const techNotes = [];
  if (audit.canonical === undefined || audit.canonical === '') { tech -= 6; techNotes.push('missing canonical'); }
  if (!audit.title) { tech -= 6; techNotes.push('missing title'); } else if (audit.titleLength > 60) { tech -= 3; techNotes.push('title >60 chars'); }
  if (audit.h1 === 0) { tech -= 5; techNotes.push('missing H1'); } else if (audit.h1 > 1) { tech -= 2; techNotes.push('multiple H1s'); }
  if (audit.missingAlt && audit.missingAlt > 0) { tech -= 3; techNotes.push(`${audit.missingAlt} img missing alt`); }
  const cwvScore = trafficLightScore(cwv); // 0..1
  tech -= Math.round((1 - cwvScore) * 5);
  components.push({ name: 'Technical health', score: clamp(tech), max: 30, note: techNotes.join('; ') || 'Core tags & markup healthy' });

  // On-page optimization (0–30)
  let onpage = 30;
  const opNotes = [];
  if (audit.metaDescription && audit.metaDescriptionLength > 160) { onpage -= 4; opNotes.push('meta desc >160'); }
  else if (!audit.metaDescription) { onpage -= 5; opNotes.push('missing meta desc'); }
  if (audit.titleLength > 0 && audit.titleLength < 30) { onpage -= 3; opNotes.push('title <30 chars'); }
  if (audit.wordCount > 0 && audit.wordCount < 300) { onpage -= 6; opNotes.push('thin content'); }
  components.push({ name: 'On-page optimization', score: clamp(onpage), max: 30, note: opNotes.join('; ') || 'Meta + content on-target' });

  // Content quality (0–20)
  let content = 20;
  if (audit.wordCount && audit.wordCount < 300) content -= 8;
  if (audit.images !== undefined && audit.images === 0) content -= 3;
  components.push({ name: 'Content quality', score: clamp(content), max: 20, note: audit.wordCount ? `${audit.wordCount} words` : 'n/a' });

  // Backlink authority (0–20) — estimated (DR/DA has no free API)
  let auth = Math.min(20, Math.round((dr / 80) * 20));
  components.push({ name: 'Backlink authority', score: auth, max: 20, note: `DR ≈ ${dr} (estimated)`, estimated: true });

  const score = components.reduce((s, c) => s + c.score, 0);
  return { score: clamp(score), label: grade(score), components };
}

// ------------------------------------------------------------------ GEO score

function computeGeo(ctx) {
  const { audit = {}, aiSessions = 0, organicSessions = 0, top3Queries = 0, totalQueries = 0, llmsTxt = false } = ctx;
  const components = [];

  // AI visibility (0–40): AI referral traffic + share of top-3 positions (AI Overviews proxy)
  const total = organicSessions + aiSessions || 1;
  const aiShare = aiSessions / total;
  let vis = 0;
  if (aiSessions > 0) vis += Math.min(25, 15 + aiSessions); // presence + scale
  vis += Math.min(15, Math.round(aiShare * 100 * 0.5));   // up to 15 from share
  const top3Share = totalQueries ? top3Queries / totalQueries : 0;
  vis += Math.min(0, 0); // top-3 is proxy; keep transparent
  const geoNote = aiSessions > 0
    ? `${aiSessions} AI-referral sessions (${Math.round(aiShare * 100)}% of organic+AI)`
    : 'No AI-referral sessions detected yet';
  components.push({ name: 'AI engine visibility', score: clamp(vis), max: 40, note: geoNote });

  // Structured data / entity clarity (0–30)
  const schemaKinds = audit.schemaKinds || [];
  let schema = 0;
  const has = (k) => schemaKinds.some((s) => s === k || (Array.isArray(s) && s.includes(k)));
  if (has('Organization')) schema += 10;
  if (has('WebSite')) schema += 5;
  if (has('Article') || has('BlogPosting')) schema += 8;
  if (has('FAQPage')) schema += 7;
  components.push({ name: 'Structured data / entities', score: clamp(schema), max: 30, note: schemaKinds.length ? schemaKinds.join(', ') : 'no schema detected' });

  // AI crawlability (0–15)
  const crawl = llmsTxt ? 15 : 5;
  components.push({ name: 'AI crawlability (llms.txt)', score: crawl, max: 15, note: llmsTxt ? 'llms.txt present' : 'llms.txt missing' });

  // Content format readiness (0–15)
  let fmt = 8;
  if (has('FAQPage')) fmt += 7;
  components.push({ name: 'Content format (Q&A / definitions)', score: clamp(fmt), max: 15, note: has('FAQPage') ? 'FAQ structure present' : 'add FAQ/definitional blocks' });

  const score = components.reduce((s, c) => s + c.score, 0);
  return { score: clamp(score), label: grade(score), components };
}

// ------------------------------------------------------------------ AEO score

function computeAeo(ctx) {
  const { audit = {}, top3Queries = 0, totalQueries = 0, position1 = 0, totalRanked = 0 } = ctx;
  const schemaKinds = audit.schemaKinds || [];
  const has = (k) => schemaKinds.some((s) => s === k || (Array.isArray(s) && s.includes(k)));
  const components = [];

  // Schema for answer engines (0–40)
  let schema = 0;
  if (has('FAQPage')) schema += 15;
  if (has('HowTo')) schema += 12;
  if (has('Organization')) schema += 6;
  if (has('Article') || has('BlogPosting')) schema += 7;
  components.push({ name: 'Answer-ready schema', score: clamp(schema), max: 40, note: schemaKinds.length ? schemaKinds.join(', ') : 'no schema' });

  // Featured snippet / position-1 ownership (0–30)
  const p1Share = totalRanked ? position1 / totalRanked : 0;
  const snippet = clamp(p1Share * 30 * 3); // amplify: position-1 is a strong snippet proxy
  components.push({ name: 'Featured-snippet ownership', score: snippet, max: 30, note: `${position1} position-1 keyword(s) of ${totalRanked} ranked` });

  // Direct answer readiness (0–30)
  let answer = 10;
  if (audit.wordCount && audit.wordCount >= 300) answer += 8;
  if (has('FAQPage')) answer += 8;
  if (audit.title && audit.title.length <= 60) answer += 4;
  components.push({ name: 'Direct-answer readiness', score: clamp(answer), max: 30, note: 'concise, structured answers' });

  const score = components.reduce((s, c) => s + c.score, 0);
  return { score: clamp(score), label: grade(score), components };
}

function grade(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Weak';
  return 'Critical';
}

function trafficLightScore(cwv) {
  // cwv: { lcp, inp, cls } each 'good'|'needs improvement'|'poor'
  const vals = Object.values(cwv || {});
  if (!vals.length) return 0.7;
  const map = { good: 1, 'needs improvement': 0.5, poor: 0 };
  const sum = vals.reduce((s, v) => s + (map[v] ?? 0.7), 0);
  return sum / vals.length;
}

// ------------------------------------------------------------------ recommendations

/**
 * AI Recommendations engine: top priority actions per category, ranked by impact vs effort.
 * impact: 1-5, effort: 1-5 (higher = more effort). priority = impact / effort.
 */
function recommendations({ seo, geo, aeo }) {
  const recs = [];

  const seoWeak = seo.components.filter((c) => c.score / c.max < 0.7).sort((a, b) => a.score / a.max - b.score / b.max);
  if (seoWeak.length) {
    const c = seoWeak[0];
    recs.push({ category: 'SEO', title: `Improve ${c.name.toLowerCase()}`, impact: 5, effort: c.name === 'Backlink authority' ? 4 : 2, detail: c.note, why: `Lowest SEO sub-score (${c.score}/${c.max})` });
  }
  const seoAuthority = seo.components.find((c) => c.name === 'Backlink authority');
  if (seoAuthority && seoAuthority.score < 10) {
    recs.push({ category: 'SEO', title: 'Launch digital-PR backlink campaign', impact: 5, effort: 5, detail: seoAuthority.note, why: 'Authority is the binding constraint on rankings' });
  }

  const geoWeak = geo.components.filter((c) => c.score / c.max < 0.7).sort((a, b) => a.score / a.max - b.score / b.max);
  if (geoWeak.length) {
    const c = geoWeak[0];
    recs.push({ category: 'GEO', title: `Boost ${c.name.toLowerCase()} for AI citations`, impact: 4, effort: 2, detail: c.note, why: `Lowest GEO sub-score (${c.score}/${c.max})` });
  }
  if (!geo.components.some((c) => c.name.includes('llms.txt'))) {
    recs.push({ category: 'GEO', title: 'Publish an llms.txt + FAQ blocks', impact: 4, effort: 1, detail: 'Explicitly signal entity + answer content to AI crawlers', why: 'Low-cost, high AI-crawlability gain' });
  }

  const aeoWeak = aeo.components.filter((c) => c.score / c.max < 0.7).sort((a, b) => a.score / a.max - b.score / b.max);
  if (aeoWeak.length) {
    const c = aeoWeak[0];
    recs.push({ category: 'AEO', title: `Add ${c.name.toLowerCase()}`, impact: 4, effort: 2, detail: c.note, why: `Lowest AEO sub-score (${c.score}/${c.max})` });
  }

  // dedupe + rank by priority
  const seen = new Set();
  const uniq = recs.filter((r) => {
    const k = r.category + r.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return uniq
    .map((r) => ({ ...r, priority: r.impact / r.effort }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 9);
}

module.exports = { computeSeo, computeGeo, computeAeo, recommendations, grade, trafficLightScore };
