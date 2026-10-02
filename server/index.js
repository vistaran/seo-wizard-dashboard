// SEO Wizard — Express backend. Serves the REST API and (in production) the built React app.
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PORT, CLIENT_DIST } = require('./config');
const db = require('./lib/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// init SQLite (schema + seed)
db.init();

// --- API routes ---------------------------------------------------------
app.use('/api', require('./routes/meta'));
app.use('/api/overview', require('./routes/overview').router);
app.use('/api/issues', require('./routes/issues'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/content', require('./routes/content'));
app.use('/api/authority', require('./routes/authority'));
app.use('/api/technical', require('./routes/technical'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/unified', require('./routes/unified'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- Serve built React app (production) ---------------------------------
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback: any non-API route -> index.html (Express 5: use middleware, not '*')
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'SEO Wizard API running. Frontend not built yet — run `npm run build` in client/ (or `npm run build` at root).' });
  });
}

app.listen(PORT, () => {
  console.log(`\n  SEO Wizard API + dashboard running on http://localhost:${PORT}\n`);
});
