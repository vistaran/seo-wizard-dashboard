// GA4 Data API helpers — sessions, engagement, referrers, AI-referral detection.
const { analyticsData } = require('./google');
const { AI_REFERRERS } = require('../config');

async function runReport(propertyId, body) {
  const ad = await analyticsData();
  const res = await ad.properties.runReport({ property: `properties/${propertyId}`, requestBody: body });
  return res.data.rows || [];
}

/** Overall engagement snapshot for a window. */
async function snapshot(propertyId, days = 30) {
  const rows = await runReport(propertyId, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'screenPageViews' },
      { name: 'userEngagementDuration' },
      { name: 'conversions' },
    ],
  });
  const r = rows[0]?.metricValues?.map((v) => Number(v.value)) || [0, 0, 0, 0, 0];
  return {
    sessions: r[0],
    activeUsers: r[1],
    pageViews: r[2],
    engagementSeconds: r[3],
    avgEngagement: r[0] ? Math.round(r[3] / r[0]) : 0,
    conversions: r[4],
  };
}

/** Daily sessions for a trajectory chart. */
async function dailySessions(propertyId, days = 30) {
  const rows = await runReport(propertyId, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  return rows.map((r) => ({
    date: r.dimensionValues[0].value,
    sessions: Number(r.metricValues[0].value),
    users: Number(r.metricValues[1].value),
  }));
}

/** Top landing pages by sessions + conversions. */
async function topLandingPages(propertyId, days = 30, limit = 10) {
  const rows = await runReport(propertyId, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'screenPageViews' },
    ],
    limit: String(limit),
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  return rows.map((r) => ({
    page: r.dimensionValues[0].value,
    sessions: Number(r.metricValues[0].value),
    engagedSessions: Number(r.metricValues[1].value),
    pageViews: Number(r.metricValues[2].value),
    engagementRate: r.metricValues[0].value !== '0'
      ? Math.round((Number(r.metricValues[1].value) / Number(r.metricValues[0].value)) * 100)
      : 0,
  }));
}

/** Referrer breakdown grouped by sessionSource (for AI-referral detection). */
async function referrers(propertyId, days = 30) {
  const rows = await runReport(propertyId, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    limit: '100',
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  return rows.map((r) => ({
    source: r.dimensionValues[0].value,
    sessions: Number(r.metricValues[0].value),
    users: Number(r.metricValues[1].value),
  }));
}

/**
 * Organic (google) vs AI-referral split.
 * Returns { organic, ai, other, aiSessions, organicSessions, breakdown:[{source,sessions}] }.
 */
async function organicVsAi(propertyId, days = 30) {
  const refs = await referrers(propertyId, days);
  let organic = 0;
  let ai = 0;
  let other = 0;
  const aiBreakdown = [];
  for (const r of refs) {
    const src = r.source.toLowerCase();
    if (AI_REFERRERS.some((d) => src === d || src.includes(d))) {
      ai += r.sessions;
      aiBreakdown.push({ source: r.source, sessions: r.sessions });
    } else if (src === 'google' || src === 'bing' || src === 'yahoo' || src === 'duckduckgo' || src === 'baidu' || src === 'yandex' || src === 'ecosia') {
      organic += r.sessions;
    } else {
      other += r.sessions;
    }
  }
  return { organic, ai, other, aiBreakdown };
}

module.exports = {
  runReport, snapshot, dailySessions, topLandingPages, referrers, organicVsAi,
};
