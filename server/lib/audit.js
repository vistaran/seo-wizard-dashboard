// AI Auto-Audit engine: crawls target pages (homepage + top GSC pages), detects
// technical / on-page / content / AEO / GEO issues, and auto-populates the issues queue.
const { auditPage } = require('./scrape');
const { get } = require('./db');

async function getTargetPages(site, gscPages = []) {
  const targets = [site.homepage];
  for (const p of gscPages.slice(0, 8)) {
    const url = p.page;
    if (url && !targets.includes(url)) targets.push(url);
  }
  return targets;
}

function detectIssues(siteKey, audit) {
  const issues = [];
  const push = (category, severity, title, description, recommended_fix, check_spec) => {
    issues.push({ category, severity, title, description, recommended_fix, check_spec: JSON.stringify(check_spec) });
  };

  if (!audit.canonical) {
    push('technical', 'warning', 'Missing canonical tag', `No rel=canonical found on ${audit.url}.`, 'Add a self-referencing canonical to <head>.', { type: 'canonical' });
  }
  if (!audit.title) {
    push('technical', 'critical', 'Missing <title> tag', `No title tag on ${audit.url}.`, 'Add a unique, keyword-rich title tag.', { type: 'title', max: 60 });
  } else if (audit.titleLength > 60) {
    push('onpage', 'warning', 'Title tag too long', `Title is ${audit.titleLength} chars (max ~60).`, 'Shorten title to ≤60 chars, keep primary keyword near front.', { type: 'title', max: 60 });
  }
  if (!audit.metaDescription) {
    push('onpage', 'warning', 'Missing meta description', `No meta description on ${audit.url}.`, 'Add a 150–160 char meta description with CTA.', { type: 'meta_description', max: 160 });
  } else if (audit.metaDescriptionLength > 160) {
    push('onpage', 'warning', 'Meta description too long', `Meta description is ${audit.metaDescriptionLength} chars.`, 'Rewrite to ≤160 chars to avoid truncation.', { type: 'meta_description', max: 160 });
  }
  if (audit.h1 === 0) {
    push('onpage', 'warning', 'Missing H1', `No H1 heading on ${audit.url}.`, 'Add exactly one H1 containing the target keyword.', { type: 'h1_count', min: 1 });
  } else if (audit.h1 > 1) {
    push('onpage', 'warning', 'Multiple H1 tags', `${audit.h1} H1 tags found on ${audit.url}.`, 'Keep a single H1; demote others to H2.', { type: 'h1_count', min: 1 });
  }
  if (audit.wordCount > 0 && audit.wordCount < 300) {
    push('content', 'warning', 'Thin content', `Only ${audit.wordCount} words on ${audit.url}.`, 'Expand to ≥300 words of substantive content.', { type: 'word_count', min: 300 });
  }
  if (audit.missingAlt > 0) {
    push('technical', 'warning', 'Images missing alt text', `${audit.missingAlt} of ${audit.images} images lack alt text.`, 'Add descriptive alt text to all images.', { type: 'image_alt' });
  }
  const kinds = audit.schemaKinds || [];
  const has = (k) => kinds.some((s) => s === k);
  if (!has('FAQPage') && !has('HowTo')) {
    push('aeo', 'opportunity', 'No FAQ/HowTo schema', `No FAQPage or HowTo structured data on ${audit.url}.`, 'Add FAQPage/HowTo JSON-LD to target answer engines.', { type: 'schema', kind: 'FAQPage' });
  }
  if (!has('Organization')) {
    push('geo', 'opportunity', 'Missing Organization schema', `No Organization entity markup on ${audit.url}.`, 'Add Organization JSON-LD for entity clarity (GEO).', { type: 'schema', kind: 'Organization' });
  }
  return issues;
}

/**
 * Run the audit for a site. Crawls homepage + top GSC pages, inserts new issues
 * (deduplicated by site_key + url + title). Returns { pages, added, issues }.
 */
async function runAudit(site, gscPages = []) {
  const db = get();
  const targets = await getTargetPages(site, gscPages);
  const now = new Date().toISOString();
  const pages = [];
  let added = 0;

  const exists = db.prepare('SELECT id FROM issues WHERE site_key=? AND url=? AND title=?');
  const ins = db.prepare(
    `INSERT INTO issues (site_key,url,category,severity,title,description,recommended_fix,check_spec,status,first_detected,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );
  const log = db.prepare('INSERT INTO issue_log (issue_id,event,detail,timestamp) VALUES (?,?,?,?)');

  for (const url of targets) {
    const audit = await auditPage(url);
    pages.push(audit);
    if (!audit.ok) continue;
    const detected = detectIssues(site.key, audit);
    for (const d of detected) {
      const dup = exists.get(site.key, url, d.title);
      if (!dup) {
        const info = ins.run(site.key, url, d.category, d.severity, d.title, d.description, d.recommended_fix, d.check_spec, 'open', now, now);
        log.run(Number(info.lastInsertRowid), 'detected', 'Auto-detected by audit engine', now);
        added++;
      }
    }
  }

  const issues = db.prepare('SELECT * FROM issues WHERE site_key=? ORDER BY created_at DESC').all(site.key);
  return { pages, added, issues: issues.map((r) => JSON.parse(JSON.stringify(r))) };
}

module.exports = { runAudit, detectIssues, getTargetPages };
