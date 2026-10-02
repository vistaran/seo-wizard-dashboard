import { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { useFetch } from '../hooks';
import { api } from '../api';
import { Loading, Empty, Badge, Section } from '../components/ui';

const STATUS_TONE = { planned: 'sky', drafting: 'amber', published: 'green' };
const STATUS_LABEL = { planned: 'Planned', drafting: 'Drafting', published: 'Published' };

function Calendar({ calendar }) {
  const cols = ['planned', 'drafting', 'published'];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cols.map((status) => {
        const items = calendar.filter((c) => c.status === status);
        return (
          <div key={status} className="rounded-lg border border-ink-700 bg-ink-800/20 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">{STATUS_LABEL[status]}</span>
              <Badge tone={STATUS_TONE[status]}>{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.length ? items.map((c, i) => (
                <div key={i} className="rounded border border-ink-700 bg-ink-900/60 p-2.5">
                  <div className="text-xs font-medium text-slate-200">{c.title}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <Badge tone="slate">{c.cluster}</Badge>
                    {c.publish_date && <span className="font-mono">{c.publish_date}</span>}
                  </div>
                  {c.target_keywords && <div className="mt-1 truncate text-[11px] text-slate-500">🔑 {c.target_keywords}</div>}
                </div>
              )) : <div className="py-4 text-center text-xs text-slate-600">Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClusterMap({ clusters }) {
  return (
    <div className="space-y-3">
      {clusters.map((c, i) => (
        <div key={i} className="rounded-lg border border-ink-700 bg-ink-800/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">{c.name}</span>
            <Badge tone={c.pillar === 'pillar' ? 'violet' : 'slate'}>{c.pillar}</Badge>
            <div className="ml-auto flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-ink-700">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${c.completeness}%` }} />
              </div>
              <span className="font-mono text-xs text-slate-400">{c.completeness}%</span>
            </div>
          </div>
          {c.description && <p className="mt-1 text-xs text-slate-500">{c.description}</p>}
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Existing pages</div>
              {c.published.length ? (
                <ul className="space-y-0.5">{c.published.map((t, j) => <li key={j} className="text-slate-300">✅ {t}</li>)}</ul>
              ) : <span className="text-slate-600">none published</span>}
              {c.drafting.length > 0 && <div className="mt-1 text-amber-300">{c.drafting.length} drafting</div>}
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Gaps to publish</div>
              {c.gaps.length ? (
                <ul className="space-y-0.5">{c.gaps.map((g, j) => <li key={j} className="text-rose-300">⚠ {g}</li>)}</ul>
              ) : <span className="text-emerald-300">✓ Authority complete</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Content() {
  const { tenant } = useTenant();
  const { data, loading, error, refetch } = useFetch(() => (tenant === 'unified' ? Promise.resolve(null) : api.content(tenant)), [tenant]);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  if (tenant === 'unified') return <div className="card text-slate-300">Select a website to view its content strategy.</div>;
  if (loading) return <Loading label="Loading content operations…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;

  const generate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const r = await api.generateCalendar(tenant);
      setGenResult(r.plan.length);
      refetch();
    } catch (e) {
      setGenResult(-1);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Content Strategy &amp; Operations</h1>
          <p className="text-sm text-slate-400">Blog calendar · topical clusters · decay alerts.</p>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? 'Generating…' : '✨ Auto-Generate 3-Month Schedule'}
        </button>
      </header>

      {genResult === -1 && <div className="card text-rose-300">Generation failed.</div>}
      {genResult > 0 && <div className="card border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-300">✨ Added {genResult} planned articles to the calendar.</div>}

      <Section title="Dynamic Blog Calendar" subtitle="Planned → Drafting → Published (Kanban)">
        <Calendar calendar={data.calendar || []} />
      </Section>

      <Section title="Content Decay Alerts" subtitle="Posts that lost >15% of organic clicks in the last 90 days">
        {data.decay?.length ? (
          <div className="space-y-2">
            {data.decay.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <Badge tone="red">-{d.dropPct}%</Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-slate-300">{d.page}</div>
                  <div className="text-[11px] text-slate-500">now pos {d.positionNow?.toFixed(1)}</div>
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  {d.clicksBefore} → {d.clicksNow} clicks
                </div>
              </div>
            ))}
          </div>
        ) : <Empty>No content decay detected — all pages holding or growing.</Empty>}
      </Section>

      <Section title="Topical Cluster Map" subtitle="Pillar/support clusters with existing pages & authority gaps">
        <ClusterMap clusters={data.clusters || []} />
      </Section>
    </div>
  );
}
