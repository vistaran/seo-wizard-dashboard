import { useTenant } from '../context/TenantContext';
import { useFetch } from '../hooks';
import { api } from '../api';
import { Loading, Empty, ScoreGauge, Badge, StatCard, Section, TrendDelta } from '../components/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function ScoreBoard({ seo, geo, aeo }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="card flex flex-col items-center gap-3">
        <ScoreGauge value={seo.score} label="SEO Score" color="#38bdf8" size={120} />
        <Badge tone={seo.score >= 65 ? 'green' : 'amber'}>{seo.label}</Badge>
        <ComponentBars components={seo.components} color="#38bdf8" />
      </div>
      <div className="card flex flex-col items-center gap-3">
        <ScoreGauge value={geo.score} label="GEO Score" color="#a78bfa" size={120} />
        <Badge tone={geo.score >= 65 ? 'green' : 'amber'}>{geo.label}</Badge>
        <ComponentBars components={geo.components} color="#a78bfa" />
      </div>
      <div className="card flex flex-col items-center gap-3">
        <ScoreGauge value={aeo.score} label="AEO Score" color="#34d399" size={120} />
        <Badge tone={aeo.score >= 65 ? 'green' : 'amber'}>{aeo.label}</Badge>
        <ComponentBars components={aeo.components} color="#34d399" />
      </div>
    </div>
  );
}

function ComponentBars({ components, color }) {
  return (
    <div className="w-full space-y-2 pt-2">
      {components.map((c, i) => (
        <div key={i}>
          <div className="mb-0.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {c.name}{c.estimated && <span className="ml-1 text-slate-600">(est.)</span>}
            </span>
            <span className="font-mono text-slate-300">{c.score}/{c.max}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div className="h-full rounded-full" style={{ width: `${(c.score / c.max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Recommendations({ recs }) {
  if (!recs?.length) return <Empty>No recommendations yet.</Empty>;
  return (
    <div className="space-y-2">
      {recs.map((r, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-ink-700 bg-ink-800/40 p-3">
          <div className="mt-0.5">
            <Badge tone={r.category === 'SEO' ? 'sky' : r.category === 'GEO' ? 'violet' : 'green'}>{r.category}</Badge>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-200">{r.title}</div>
            <div className="mt-0.5 text-xs text-slate-400">{r.detail}</div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
              <span>Impact <span className="font-mono text-slate-300">{r.impact}/5</span></span>
              <span>Effort <span className="font-mono text-slate-300">{r.effort}/5</span></span>
              <span className="text-slate-600">priority {r.priority.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AiSplit({ aiSplit }) {
  const data = [
    { name: 'Organic search', value: aiSplit?.organic || 0, color: '#38bdf8' },
    { name: 'AI referrals', value: aiSplit?.ai || 0, color: '#a78bfa' },
    { name: 'Other / direct', value: aiSplit?.other || 0, color: '#334155' },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #273550', borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            <span className="flex-1 text-slate-300">{d.name}</span>
            <span className="font-mono text-slate-200">{d.value}</span>
            <span className="w-12 text-right font-mono text-xs text-slate-500">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
        {aiSplit?.aiBreakdown?.length > 0 && (
          <div className="mt-2 border-t border-ink-700 pt-2 text-[11px] text-slate-500">
            {aiSplit.aiBreakdown.map((b, i) => (
              <div key={i} className="flex justify-between">
                <span>{b.source}</span>
                <span className="font-mono">{b.sessions} sessions</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Unified portfolio view
function UnifiedView() {
  const { data, loading, error } = useFetch(() => api.unified());
  if (loading) return <Loading label="Aggregating portfolio…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;
  const { portfolio, aggregate } = data;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Unified Portfolio View</h1>
        <p className="text-sm text-slate-400">High-level health across all three properties.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Clicks (30d)" value={aggregate.totalClicks} sub="portfolio organic" tone="sky" />
        <StatCard label="Impressions" value={aggregate.totalImpressions} tone="sky" />
        <StatCard label="AI Referrals" value={aggregate.totalAi} sub={`${aggregate.totalOrganic} organic`} tone="violet" />
        <StatCard label="Avg SEO" value={aggregate.avgSeo} sub={`GEO ${aggregate.avgGeo} · AEO ${aggregate.avgAeo}`} tone="emerald" />
        <StatCard label="Open Issues" value={aggregate.openIssues} tone="rose" />
      </div>

      <Section title="Portfolio Health Breakdown" subtitle="Site-by-site comparative status grid">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4">Property</th>
                <th className="py-2 pr-4">SEO</th>
                <th className="py-2 pr-4">GEO</th>
                <th className="py-2 pr-4">AEO</th>
                <th className="py-2 pr-4">Clicks</th>
                <th className="py-2 pr-4">Impressions</th>
                <th className="py-2 pr-4">AI Refs</th>
                <th className="py-2">Issues</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((p) => (
                <tr key={p.key} className="border-b border-ink-800">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-200">{p.label}</div>
                    <div className="text-xs text-slate-500">{p.domain}</div>
                  </td>
                  <td className="py-3 pr-4"><ScoreDot value={p.scores.seo} color="#38bdf8" /></td>
                  <td className="py-3 pr-4"><ScoreDot value={p.scores.geo} color="#a78bfa" /></td>
                  <td className="py-3 pr-4"><ScoreDot value={p.scores.aeo} color="#34d399" /></td>
                  <td className="py-3 pr-4 font-mono text-slate-300">{p.traffic?.clicks ?? 0}</td>
                  <td className="py-3 pr-4 font-mono text-slate-300">{p.traffic?.impressions ?? 0}</td>
                  <td className="py-3 pr-4 font-mono text-slate-300">{p.aiSplit?.ai ?? 0}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Badge tone={p.issues.open ? 'amber' : 'slate'}>{p.issues.open} open</Badge>
                      <Badge tone="green">{p.issues.resolved} done</Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function ScoreDot({ value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="font-mono text-slate-200">{value}</span>
    </div>
  );
}

// Single-site bird's-eye view
function SiteOverview({ siteKey }) {
  const { data, loading, error } = useFetch(() => api.overview(siteKey), [siteKey]);
  if (loading) return <Loading label="Fetching scores & signals…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;
  const { seo, geo, aeo, recommendations, aiSplit, gscTotals, auditSummary } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Executive Overview</h1>
          <p className="text-sm text-slate-400">Composite SEO · GEO · AEO health with live GSC/GA4 signals.</p>
        </div>
        <div className="flex gap-2">
          <StatCard label="Clicks (30d)" value={gscTotals.clicks} tone="sky" />
          <StatCard label="Impressions" value={gscTotals.impressions} tone="sky" />
          <StatCard label="Avg Position" value={gscTotals.position?.toFixed(1)} tone="emerald" />
        </div>
      </header>

      <ScoreBoard seo={seo} geo={geo} aeo={aeo} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          title="AI Recommendations Engine"
          subtitle="Top priority actions ranked by impact vs. effort"
        >
          <Recommendations recs={recommendations} />
        </Section>
        <Section
          title="Organic vs. AI Referral Distribution"
          subtitle="Traditional search vs. generative-AI referral traffic (GA4)"
        >
          <AiSplit aiSplit={aiSplit} />
          {auditSummary && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-ink-800/50 p-2">
                <div className="text-slate-500">Canonical</div>
                <div className="text-slate-200">{auditSummary.canonical === null ? 'n/a' : auditSummary.canonical ? 'Present' : 'Missing'}</div>
              </div>
              <div className="rounded-lg bg-ink-800/50 p-2">
                <div className="text-slate-500">llms.txt</div>
                <div className="text-slate-200">{auditSummary.llmsTxt ? 'Present' : 'Missing'}</div>
              </div>
              <div className="rounded-lg bg-ink-800/50 p-2">
                <div className="text-slate-500">Schema types</div>
                <div className="text-slate-200">{auditSummary.schemaKinds?.length ? auditSummary.schemaKinds.join(', ') : 'none'}</div>
              </div>
              <div className="rounded-lg bg-ink-800/50 p-2">
                <div className="text-slate-500">Domain Rating</div>
                <div className="text-slate-200">≈ {auditSummary.dr} (est.)</div>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

export default function Overview() {
  const { tenant } = useTenant();
  return tenant === 'unified' ? <UnifiedView /> : <SiteOverview siteKey={tenant} />;
}
