import { useTenant } from '../context/TenantContext';
import { useFetch } from '../hooks';
import { api } from '../api';
import { Loading, Empty, Badge, Section, StatCard } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const BAND_TONE = {
  'Top 3': 'green',
  'Top 10': 'green',
  'Striking distance': 'amber',
  'Page 2+': 'sky',
  'Not ranking': 'slate',
};

export default function Authority() {
  const { tenant } = useTenant();
  const { data, loading, error } = useFetch(() => (tenant === 'unified' ? Promise.resolve(null) : api.authority(tenant)), [tenant]);

  if (tenant === 'unified') return <div className="card text-slate-300">Select a website to view authority & keyword tracking.</div>;
  if (loading) return <Loading label="Loading authority & keywords…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;

  const { vault, drHistory, latestDr, backlinks, netBacklinks, competitors, shareOfVoice } = data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Authority &amp; Keyword Tracking</h1>
        <p className="text-sm text-slate-400">Target keyword vault · DR trend · backlink velocity · share of voice.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Domain Rating" value={`≈ ${latestDr ?? '—'}`} sub="estimated (no API key)" tone="violet" />
        <StatCard label="Backlinks (30d)" value={`${backlinks?.gained ?? 0} gained`} sub={`${backlinks?.lost ?? 0} lost`} tone="emerald" />
        <StatCard label="Net Referring Domains" value={netBacklinks >= 0 ? `+${netBacklinks}` : netBacklinks} tone="sky" />
        <StatCard label="Tracked Keywords" value={vault.length} tone="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Domain Rating Trendline" subtitle="Historical DR/DA growth (12 months)">
          {drHistory?.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={drHistory}>
                  <CartesianGrid stroke="#1b2740" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(d) => d.slice(2, 7)} stroke="#273550" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} stroke="#273550" width={30} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #273550', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="dr" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3 }} name="DR" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>No DR history.</Empty>}
        </Section>

        <Section title="Backlink Velocity" subtitle="Referring domains gained vs. lost (last 30 days)">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-end gap-8">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-emerald-400">+{backlinks?.gained ?? 0}</span>
                <span className="mt-1 text-xs text-slate-500">Gained</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-rose-400">-{backlinks?.lost ?? 0}</span>
                <span className="mt-1 text-xs text-slate-500">Lost</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-slate-100">{netBacklinks >= 0 ? `+${netBacklinks}` : netBacklinks}</span>
                <span className="mt-1 text-xs text-slate-500">Net</span>
              </div>
            </div>
            <p className="text-xs text-slate-600">Estimated — connect Ahrefs/Semrush for live backlink data.</p>
          </div>
        </Section>
      </div>

      <Section title="Target Keyword Vault" subtitle="Live rank + volume + difficulty, mapped to URLs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-3">Keyword</th>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Band</th>
                <th className="py-2 pr-3">Volume</th>
                <th className="py-2 pr-3">KD</th>
                <th className="py-2 pr-3">Intent</th>
                <th className="py-2">Target URL</th>
              </tr>
            </thead>
            <tbody>
              {vault.map((k, i) => (
                <tr key={i} className="border-b border-ink-800">
                  <td className="py-2.5 pr-3 text-slate-200">{k.keyword}</td>
                  <td className="py-2.5 pr-3 font-mono text-slate-200">{k.position ? k.position.toFixed(1) : '—'}</td>
                  <td className="py-2.5 pr-3"><Badge tone={BAND_TONE[k.band]}>{k.band}</Badge></td>
                  <td className="py-2.5 pr-3 font-mono text-slate-300">{k.search_volume}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-ink-700"><div className="h-full rounded-full bg-amber-400" style={{ width: `${k.difficulty}%` }} /></div>
                      <span className="font-mono text-xs text-slate-400">{k.difficulty}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-slate-400">{k.intent}</td>
                  <td className="max-w-[220px] truncate py-2.5 font-mono text-xs text-slate-500">{k.target_url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Competitor Share of Voice" subtitle="You vs. top 3 competitors per target keyword (estimated)">
        <div className="space-y-2">
          {shareOfVoice.map((s, i) => (
            <div key={i} className="rounded-lg border border-ink-700 bg-ink-800/20 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{s.keyword}</span>
                {s.top3Owned ? <Badge tone="green">You rank top 3</Badge> : <Badge tone="slate">Outside top 3</Badge>}
                <span className="ml-auto text-[11px] text-slate-500">estimated rank</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-4">
                {s.ranking.map((r, j) => (
                  <div key={j} className={`flex items-center justify-between rounded px-2 py-1 text-xs ${r.name === 'You' ? 'bg-accent/15 text-accent' : 'bg-ink-900/60 text-slate-300'}`}>
                    <span className="truncate">{r.name === 'You' ? 'You' : r.name}</span>
                    <span className="font-mono">#{r.position}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
