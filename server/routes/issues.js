// Module 2 — Automated Issue & Action Tracker: auto-audit, categorize, verify & re-check, changelog.
const { Router } = require('express');
const { runAudit } = require('../lib/audit');
const { verifyIssue } = require('../lib/scrape');
const { get } = require('../lib/db');
const gsc = require('../lib/gsc');
const { getSite, handler } = require('../lib/util');

const router = Router();

router.get('/:siteKey', handler(async (req, res) => {
  const db = get();
  const rows = db.prepare('SELECT * FROM issues WHERE site_key=? ORDER BY created_at DESC').all(req.params.siteKey);
  const byStatus = { open: 0, pending_review: 0, resolved: 0 };
  const bySeverity = { critical: 0, warning: 0, opportunity: 0 };
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
  }
  res.json({ issues: rows.map((r) => JSON.parse(JSON.stringify(r))), summary: { total: rows.length, byStatus, bySeverity } });
}));

// Run the auto-audit engine now (crawls homepage + top GSC pages).
router.post('/:siteKey/audit', handler(async (req, res) => {
  const site = getSite(req.params.siteKey);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  const gscPages = await gsc.topPages(site.gscProperty, 28, 'impressions', 8).catch(() => []);
  const result = await runAudit(site, gscPages);
  res.json(result);
}));

// Verify & re-check a single issue against the live URL.
router.post('/:id/verify', handler(async (req, res) => {
  const db = get();
  const issue = db.prepare('SELECT * FROM issues WHERE id=?').get(Number(req.params.id));
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const now = new Date().toISOString();
  const log = db.prepare('INSERT INTO issue_log (issue_id,event,detail,timestamp) VALUES (?,?,?,?)');

  const result = await verifyIssue(issue.url, issue.check_spec);
  if (result.resolved) {
    db.prepare('UPDATE issues SET status=?, last_verified=?, verify_summary=?, resolved_by=? WHERE id=?')
      .run('resolved', now, result.summary, 'AI agent (live re-check)', issue.id);
    log.run(issue.id, 'verified_fixed', result.summary, now);
  } else {
    // keep open (or mark pending review if it was open)
    const newStatus = issue.status === 'resolved' ? 'pending_review' : issue.status;
    db.prepare('UPDATE issues SET status=?, last_verified=?, verify_summary=? WHERE id=?')
      .run(newStatus, now, result.summary, issue.id);
    log.run(issue.id, 'verified_failed', result.summary, now);
  }
  const updated = db.prepare('SELECT * FROM issues WHERE id=?').get(issue.id);
  res.json({ issue: JSON.parse(JSON.stringify(updated)), verification: result });
}));

// Historical audit log / changelog.
router.get('/:id/log', handler(async (req, res) => {
  const db = get();
  const rows = db.prepare('SELECT * FROM issue_log WHERE issue_id=? ORDER BY timestamp DESC').all(Number(req.params.id));
  res.json({ log: rows.map((r) => JSON.parse(JSON.stringify(r))) });
}));

// Manual status update / resolution note.
router.patch('/:id', handler(async (req, res) => {
  const db = get();
  const issue = db.prepare('SELECT * FROM issues WHERE id=?').get(Number(req.params.id));
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const { status, resolution_notes, resolved_by } = req.body || {};
  const now = new Date().toISOString();
  const log = db.prepare('INSERT INTO issue_log (issue_id,event,detail,timestamp) VALUES (?,?,?,?)');
  if (status) {
    db.prepare('UPDATE issues SET status=?, resolution_notes=COALESCE(?,resolution_notes), resolved_by=COALESCE(?,resolved_by), last_verified=? WHERE id=?')
      .run(status, resolution_notes || null, resolved_by || null, status === 'resolved' ? now : issue.last_verified, issue.id);
    log.run(issue.id, status === 'resolved' ? 'resolved' : 'updated', resolution_notes || `status -> ${status}`, now);
  }
  const updated = db.prepare('SELECT * FROM issues WHERE id=?').get(issue.id);
  res.json({ issue: JSON.parse(JSON.stringify(updated)) });
}));

module.exports = router;
