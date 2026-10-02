// Meta endpoints: tenant list + global config.
const { Router } = require('express');
const { SITES, AI_REFERRERS } = require('../config');
const { get } = require('../lib/db');

const router = Router();

router.get('/sites', (req, res) => {
  const db = get();
  const sites = SITES.map((s) => {
    const comps = db.prepare('SELECT * FROM competitors WHERE site_key=?').all(s.key);
    const kw = db.prepare('SELECT COUNT(*) c FROM keywords WHERE site_key=?').get(s.key).c;
    return {
      key: s.key,
      label: s.label,
      name: s.name,
      domain: s.domain,
      homepage: s.homepage,
      competitors: comps.map((c) => ({ name: c.name, domain: c.domain })),
      keywordCount: kw,
    };
  });
  res.json({ sites });
});

router.get('/meta', (req, res) => {
  res.json({ aiReferrers: AI_REFERRERS });
});

module.exports = router;
