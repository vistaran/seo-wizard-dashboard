import { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { useFetch } from '../hooks';
import { api } from '../api';
import { Loading, Empty, Badge, Section } from '../components/ui';

const PRIORITY_TONE = { high: 'red', medium: 'amber', low: 'sky' };
const TYPE_ICON = { ranking_drop: '📉', ctr: '🖱️', striking_distance: '🎯' };

function Insights({ insights }) {
  if (!insights?.length) return <Empty>No actionable insights this week.</Empty>;
  return (
    <div className="space-y-2">
      {insights.map((t, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-ink-700 bg-ink-800/30 p-3">
          <span className="text-xl">{TYPE_ICON[t.type] || '💡'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">{i + 1}. {t.title}</span>
              <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">{t.detail}</div>
            {t.url && <div className="mt-0.5 truncate font-mono text-xs text-slate-500">{t.url}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewNoteForm({ onCreated }) {
  const { tenant } = useTenant();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setSaving(true);
    try {
      await api.createNote(tenant, { title, content, tags, date: new Date().toISOString().slice(0, 10) });
      setTitle(''); setContent(''); setTags('');
      onCreated();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-ink-700 bg-ink-800/20 p-3">
      <input className="input w-full" placeholder="Note title (e.g. Core update observed)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-[70px] w-full" placeholder="Log an algorithm update, site change, or experiment…" value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="flex items-center gap-2">
        <input className="input flex-1" placeholder="tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : '＋ Add note'}</button>
      </div>
    </form>
  );
}

export default function Notes() {
  const { tenant } = useTenant();
  const { data, loading, error, refetch } = useFetch(() => (tenant === 'unified' ? Promise.resolve(null) : api.notes(tenant)), [tenant]);
  const [activeNote, setActiveNote] = useState(null);
  const [noteContent, setNoteContent] = useState(null);

  if (tenant === 'unified') return <div className="card text-slate-300">Select a website to view its notes & action center.</div>;
  if (loading) return <Loading label="Loading notes & insights…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;

  const openNote = async (path) => {
    setActiveNote(path);
    setNoteContent('loading');
    try {
      const r = await api.readNote(tenant, path);
      setNoteContent(r.content || r.error || '(empty)');
    } catch (e) {
      setNoteContent(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Notes &amp; Action Center</h1>
        <p className="text-sm text-slate-400">Contextual notebook · AI actionable insights · knowledge-base links.</p>
      </header>

      <Section title="🤖 AI Actionable Insights" subtitle="Weekly top-3 to-do generated from live GSC/GA4 signals">
        <Insights insights={data.insights} />
      </Section>

      <Section title="📓 Contextual SEO Notebook" subtitle="Log experiments & site changes — overlaid on GA4/GSC timelines">
        <NewNoteForm onCreated={refetch} />
        <div className="mt-3 space-y-2">
          {data.userNotes?.length ? data.userNotes.map((n, i) => (
            <div key={i} className="rounded-lg border border-ink-700 bg-ink-800/30 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{n.title}</span>
                <span className="font-mono text-xs text-slate-500">{n.date}</span>
                {n.tags && <Badge tone="slate">{n.tags}</Badge>}
              </div>
              <div className="mt-1 text-xs text-slate-400">{n.content}</div>
            </div>
          )) : <Empty>No notes yet — add one above.</Empty>}
        </div>
      </Section>

      <Section title="🗂️ Knowledge-Base Notes" subtitle={`${data.kbNotes?.length || 0} markdown files from the internal Notes database`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {data.kbNotes?.length ? data.kbNotes.map((n, i) => (
              <button
                key={i}
                onClick={() => openNote(n.path)}
                className={`block w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${activeNote === n.path ? 'border-accent/40 bg-accent/10' : 'border-ink-700 hover:bg-ink-800/50'}`}
              >
                <div className="truncate text-xs font-medium text-slate-200">{n.title}</div>
                <div className="truncate text-[11px] text-slate-500">{n.folder} · {new Date(n.mtime).toLocaleDateString()}</div>
              </button>
            )) : <Empty>No KB notes found for this site.</Empty>}
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-ink-700 bg-ink-900/60 p-3">
            {noteContent === null ? (
              <div className="py-8 text-center text-xs text-slate-600">Select a note to preview its content.</div>
            ) : noteContent === 'loading' ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading…</div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">{noteContent}</pre>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
