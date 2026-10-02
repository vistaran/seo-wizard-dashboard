// Shared route helpers.
const { SITES } = require('../config');

function getSite(siteKey) {
  return SITES.find((s) => s.key === siteKey) || null;
}

// wrap async handlers so errors return JSON instead of crashing the server
function handler(fn) {
  return (req, res) => {
    fn(req, res).catch((e) => {
      console.error('[route error]', req.path, e.message);
      res.status(500).json({ error: e.message });
    });
  };
}

module.exports = { getSite, handler };
