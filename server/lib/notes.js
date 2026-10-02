// Internal Notes database reader — reads the Vistaran Knowledge Base (Obsidian vault).
// Maps site key → KB project folders and surfaces markdown files as dated notes,
// so the dashboard's Notebook can overlay internal annotations on GA4/GSC data.
const fs = require('fs');
const path = require('path');
const { NOTES_ROOT } = require('../config');

const SITE_FOLDERS = {
  vistaran: ['Vistaran', 'Blogs/Vistaran'],
  boomerr: ['Boomerr', 'Blogs/Boomerr'],
  lushly: ['Lushly', 'Blogs/Lushly'],
};

function listMdFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md')) out.push(full);
    }
  };
  walk(root);
  return out;
}

function excerpt(text, len = 180) {
  const clean = text
    .replace(/^---[\s\S]*?---/, '') // strip frontmatter
    .replace(/[#>*`\[\]()!\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

/** Return KB notes for a site (title, path, mtime, folder, excerpt). */
function listNotes(siteKey) {
  const folders = SITE_FOLDERS[siteKey] || [];
  const results = [];
  for (const f of folders) {
    const root = path.join(NOTES_ROOT, f);
    if (!fs.existsSync(root)) continue;
    for (const file of listMdFiles(root)) {
      try {
        const stat = fs.statSync(file);
        const raw = fs.readFileSync(file, 'utf8');
        const rel = path.relative(NOTES_ROOT, file).replace(/\\/g, '/');
        const title = path.basename(file, '.md').replace(/-/g, ' ');
        results.push({
          title,
          path: rel,
          folder: rel.split('/').slice(0, -1).join('/') || f,
          mtime: stat.mtime.toISOString(),
          excerpt: excerpt(raw),
          size: raw.length,
        });
      } catch { /* skip unreadable */ }
    }
  }
  results.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return results;
}

/** Read a single note's full markdown by relative path (safety: must stay inside KB root). */
function readNote(relPath) {
  const full = path.resolve(NOTES_ROOT, relPath);
  if (!full.startsWith(path.resolve(NOTES_ROOT))) return { error: 'Path outside notes root' };
  try {
    return { path: relPath, content: fs.readFileSync(full, 'utf8') };
  } catch (e) {
    return { error: e.message };
  }
}

/** Read llms.txt / llms-full.txt for a site (entity/AEO signal + AI-crawlability). */
function readLlmFiles(siteKey) {
  const folder = SITE_FOLDERS[siteKey]?.[0] || siteKey;
  const out = {};
  for (const f of ['llms.txt', 'llms-full.txt', 'robots.txt', 'ai.txt']) {
    const p = path.join(NOTES_ROOT, folder, 'SEO-files', f);
    if (fs.existsSync(p)) out[f] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

module.exports = { listNotes, readNote, readLlmFiles, SITE_FOLDERS };
