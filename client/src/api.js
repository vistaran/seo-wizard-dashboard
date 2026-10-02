// Thin fetch wrapper for the SEO Wizard API.
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  sites: () => request('/sites'),
  meta: () => request('/meta'),
  unified: () => request('/unified'),
  overview: (key) => request(`/overview/${key}`),
  issues: (key) => request(`/issues/${key}`),
  runAudit: (key) => request(`/issues/${key}/audit`, { method: 'POST' }),
  verifyIssue: (id) => request(`/issues/${id}/verify`, { method: 'POST' }),
  issueLog: (id) => request(`/issues/${id}/log`),
  updateIssue: (id, body) => request(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  performance: (key) => request(`/performance/${key}`),
  content: (key) => request(`/content/${key}`),
  generateCalendar: (key) => request(`/content/${key}/generate`, { method: 'POST' }),
  authority: (key) => request(`/authority/${key}`),
  technical: (key) => request(`/technical/${key}`),
  notes: (key) => request(`/notes/${key}`),
  createNote: (key, body) => request(`/notes/${key}`, { method: 'POST', body: JSON.stringify(body) }),
  readNote: (key, path) => request(`/notes/${key}/read?path=${encodeURIComponent(path)}`),
};
