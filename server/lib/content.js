// Content strategy helpers: decay detection + 3-month calendar generation.
const { get } = require('./db');

/**
 * Content decay: pages that lost >15% of clicks comparing last 90d vs prior 90d.
 */
function contentDecay(currentPages, previousPages) {
  const prev = {};
  for (const p of previousPages) prev[p.page] = p.clicks;
  const decayed = [];
  for (const p of currentPages) {
    const before = prev[p.page];
    // only consider pages that had meaningful traffic before (>= 10 clicks)
    if (before === undefined || before < 10) continue;
    const drop = (before - p.clicks) / before;
    if (drop > 0.15) {
      decayed.push({
        page: p.page,
        clicksNow: p.clicks,
        clicksBefore: before,
        impressionsNow: p.impressions,
        positionNow: p.position,
        dropPct: Math.round(drop * 100),
      });
    }
  }
  return decayed.sort((a, b) => b.clicksBefore - a.clicksBefore);
}

/**
 * Generate a 3-month blogging schedule from keyword gaps + cluster gaps.
 * `keywordGaps` = [{keyword, impressions, position}], `clusters` = [{name}].
 * Returns [{title, slug, cluster, target_keywords, publish_date, rationale}].
 */
function generateCalendar(siteKey, keywordGaps, clusters) {
  const db = get();
  const plan = [];
  const clusterNames = clusters.map((c) => c.name);
  const primary = (clusterNames[0] || 'General');

  // 12 weekly slots over ~12 weeks (3 months)
  const weeks = [];
  const today = new Date();
  for (let w = 0; w < 12; w++) {
    weeks.push(new Date(today.getTime() + (w + 1) * 7 * 864e5).toISOString().slice(0, 10));
  }

  const topics = [];
  // keyword-gap driven topics (striking-distance / high-impression informational queries)
  const gapKws = keywordGaps.slice(0, 6);
  for (const k of gapKws) {
    topics.push({
      title: `${titleCase(k.keyword)}: The Complete Guide`,
      cluster: pickCluster(k.keyword, clusterNames, primary),
      keywords: k.keyword,
      rationale: `Keyword gap: ${k.impressions} impressions at avg position ${k.position ? k.position.toFixed(1) : 'n/a'}`,
    });
  }
  // cluster-authority topics (fill topical gaps)
  const gapClusters = clusters.filter((c) => c.pillar === 'pillar' && !gapKws.some((k) => k.keyword.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])));
  for (const c of gapClusters.slice(0, 6)) {
    topics.push({
      title: `${c.name}: Strategy, Tools & Best Practices`,
      cluster: c.name,
      keywords: c.name.toLowerCase(),
      rationale: `Topical authority gap in "${c.name}" pillar`,
    });
  }

  topics.slice(0, 12).forEach((t, i) => {
    plan.push({
      title: t.title,
      slug: slugify(t.title),
      cluster: t.cluster,
      target_keywords: t.keywords,
      publish_date: weeks[i],
      rationale: t.rationale,
    });
  });

  return plan;
}

function pickCluster(keyword, clusters, fallback) {
  const kw = keyword.toLowerCase();
  for (const c of clusters) {
    const tokens = c.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    if (tokens.some((t) => kw.includes(t))) return c;
  }
  return fallback;
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

module.exports = { contentDecay, generateCalendar };
