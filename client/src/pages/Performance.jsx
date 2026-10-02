import { useTenant } from '../context/TenantContext';
import { useFetch } from '../hooks';
import { api } from '../api';
import { Loading, Empty, Section, StatCard, TrendDelta } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

function wowPct(cur, prev, field) {
  if (!cur || !prev || !prev[field]) return null;
  return ((cur[field] - prev[field]) / prev[field]) * 100;
}

export default function Performance() {
  const { tenant } = useTenant();
  const { data, loading, error } = useFetch(() => (tenant === 'unified' ? Promise.resolve(null) : api.performance(tenant)), [tenant]);

  if (tenant === 'unified') return <div className="card text-slate-300">Select a website to view its performance snapshot.</div>;
  if (loading) return <Loading label="Loading performance snapshot…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;

  const { totalsWow, trajectory, visibility, topGsc, topGa4, heatmap, snapshot } = data;
  const cur = totalsWow?.current;
  const prev = totalsWow?.previous;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Performance Snapshot</h1>
        <p className="text-sm text-slate-400">30-day trajectory · visibility matrix · top performers · CTR heatmap.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-slate-500">Clicks (WoW)</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-100">{cur?.clicks ?? 0}</span>
            <TrendDelta value={wowPct(cur, prev, 'clicks')} />
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-slate-500">Impressions</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-100">{cur?.impressions ?? 0}</span>
            <TrendDelta value={wowPct(cur, prev, 'impressions')} />
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-slate-500">Avg Position</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-100">{cur?.position?.toFixed(1) ?? '—'}</span>
            <TrendDelta value={wowPct(cur, prev, 'position')} invert />
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-slate-500">Sessions</div>
          <div className="mt-1 text-2xl font-bold text-slate-100">{snapshot?.sessions ?? 0}</div>
          <div className="text-xs text-slate-500">{snapshot?.activeUsers} users</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-slate-500">Engagement</div>
          <div className="mt-1 text-2xl font-bold text-slate-100">{snapshot?.avgEngagement ?? 0}s</div>
          <div className="text-xs text-slate-500">per session</div>
        </div>
      </div>

      <Section title="30-Day Trajectory" subtitle="Daily sessions (GA4)">
        {trajectory?.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectory}>
                <defs>
                  <linearGradient id="gTraj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} stroke="#273550" />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} stroke="#273550" width={34} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #273550', borderRadius: 8 }} />
                <Area type="monotone" dataKey="sessions" stroke="#38bdf8" strokeWidth={2} fill="url(#gTraj)" name="Sessions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty>No trajectory data.</Empty>}
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Visibility Matrix" subtitle="Top 10 queries by impressions — WoW position change">
          {visibility?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2">Query</th><th className="py-2">Clicks</th><th className="py-2">Impr.</th><th className="py-2">Pos</th><th className="py-2">Δ WoW</th>
                </tr>
              </thead>
              <tbody>
                {visibility.map((q, i) => (
                  <tr key={i} className="border-b border-ink-800">
                    <td className="py-2 pr-2 text-slate-200">{q.query}</td>
                    <td className="py-2 font-mono text-slate-300">{q.clicks}</td>
                    <td className="py-2 font-mono text-slate-300">{q.impressions}</td>
                    <td className="py-2 font-mono text-slate-300">{q.position.toFixed(1)}</td>
                    <td className="py-2"><TrendDelta value={q.posDelta} invert /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No query data.</Empty>}
        </Section>

        <Section title="CTR Heatmap" subtitle="High impressions + low CTR — title/meta optimization candidates">
          {heatmap?.length ? (
            <div className="space-y-2">
              {heatmap.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-2 rounded-full" style={{ background: `hsl(${Math.max(0, 120 - p.impressions / 8)}, 80%, 55%)` }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-slate-300">{p.page}</div>
                    <div className="text-[11px] text-slate-500">{p.impressions} impr · {(p.ctr * 100).toFixed(2)}% CTR</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty>No low-CTR pages detected.</Empty>}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Top Pages — GSC (impressions)" subtitle="Highest organic impressions">
          {topGsc?.length ? (
            <ListPages pages={topGsc} />
          ) : <Empty>No page data.</Empty>}
        </Section>
        <Section title="Top Landing Pages — GA4" subtitle="Highest sessions + engagement">
          {topGa4?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2">Page</th><th className="py-2">Sessions</th><th className="py-2">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {topGa4.map((p, i) => (
                  <tr key={i} className="border-b border-ink-800">
                    <td className="max-w-[220px] truncate py-2 pr-2 font-mono text-xs text-slate-300">{p.page}</td>
                    <td className="py-2 font-mono text-slate-200">{p.sessions}</td>
                    <td className="py-2"><div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-ink-700"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${p.engagementRate}%` }} /></div><span className="font-mono text-xs text-slate-400">{p.engagementRate}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No GA4 landing pages.</Empty>}
        </Section>
      </div>
    </div>
  );
}

function ListPages({ pages }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-slate-500">
          <th className="py-2">Page</th><th className="py-2">Impr.</th><th className="py-2">Clicks</th><th className="py-2">CTR</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((p, i) => (
          <tr key={i} className="border-b border-ink-800">
            <td className="max-w-[220px] truncate py-2 pr-2 font-mono text-xs text-slate-300">{p.page}</td>
            <td className="py-2 font-mono text-slate-200">{p.impressions}</td>
            <td className="py-2 font-mono text-slate-200">{p.clicks}</td>
            <td className="py-2 font-mono text-slate-200">{(p.ctr * 100).toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
