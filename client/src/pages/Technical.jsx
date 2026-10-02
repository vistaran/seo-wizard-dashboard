import { useTenant } from '../context/TenantContext';
import { useFetch } from '../hooks';
import { api } from '../api';
import { Loading, Empty, Badge, Section, TrafficLight } from '../components/ui';

function CwvCard({ title, cwv, estimated }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-800/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        {estimated && <Badge tone="amber">estimated</Badge>}
      </div>
      <div className="space-y-3">
        <Metric label="LCP" value={cwv.lcp} detail={cwv.lcpMs ? `${cwv.lcpMs}ms` : ''} />
        <Metric label="INP" value={cwv.inp} detail={cwv.inpMs ? `${cwv.inpMs}ms` : ''} />
        <Metric label="CLS" value={cwv.cls} detail={cwv.clsScore !== undefined ? cwv.clsScore : ''} />
      </div>
    </div>
  );
}

function Metric({ label, value, detail }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-8 font-mono text-xs text-slate-400">{label}</span>
        <TrafficLight value={value} />
      </div>
      {detail !== '' && <span className="font-mono text-xs text-slate-500">{detail}</span>}
    </div>
  );
}

export default function Technical() {
  const { tenant } = useTenant();
  const { data, loading, error } = useFetch(() => (tenant === 'unified' ? Promise.resolve(null) : api.technical(tenant)), [tenant]);

  if (tenant === 'unified') return <div className="card text-slate-300">Select a website to view its technical health.</div>;
  if (loading) return <Loading label="Crawling & checking technical health…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;

  const { cwv, indexation, orphans } = data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Technical SEO Health &amp; Indexing</h1>
        <p className="text-sm text-slate-400">Core Web Vitals · indexation monitor · orphan page detector.</p>
      </header>

      <Section title="Core Web Vitals" subtitle="Traffic-light status for LCP · INP · CLS">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CwvCard title="Mobile" cwv={cwv?.mobile || {}} estimated={cwv?.mobile?.estimated} />
          <CwvCard title="Desktop" cwv={cwv?.desktop || {}} estimated={cwv?.desktop?.estimated} />
        </div>
        {cwv?.mobile?.estimated && (
          <p className="mt-2 text-xs text-slate-600">Field data unavailable (CrUX quota) — values estimated. Connect a PageSpeed API key for live CWV.</p>
        )}
      </Section>

      <Section title="Indexation Monitor" subtitle="Direct GSC cross-check — valid pages vs. errors">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card">
            <div className="text-xs uppercase tracking-wider text-slate-500">Sitemap URLs</div>
            <div className="mt-1 text-2xl font-bold text-slate-100">{indexation?.sitemapTotal}</div>
            <div className="text-xs text-slate-500">{indexation?.sitemapCount} sitemaps</div>
          </div>
          <div className="card">
            <div className="text-xs uppercase tracking-wider text-slate-500">Indexed (valid)</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">{indexation?.indexed}</div>
          </div>
          <div className="card">
            <div className="text-xs uppercase tracking-wider text-slate-500">Errors / Not Indexed</div>
            <div className="mt-1 text-2xl font-bold text-rose-400">{indexation?.errorCount}</div>
          </div>
          <div className="card">
            <div className="text-xs uppercase tracking-wider text-slate-500">Indexation Rate</div>
            <div className="mt-1 text-2xl font-bold text-slate-100">
              {indexation?.sitemapTotal ? Math.round((indexation.indexed / indexation.sitemapTotal) * 100) : 0}%
            </div>
          </div>
        </div>
        {indexation?.errors?.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Flagged URLs ({indexation.errors.length})</div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {indexation.errors.map((e, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-rose-500/20 bg-rose-500/5 px-2 py-1.5 text-xs">
                  <Badge tone="red">{e.type.replace(/_/g, ' ')}</Badge>
                  <span className="truncate font-mono text-slate-300">{e.url}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Orphan Page Detector" subtitle="Sitemap URLs with zero incoming internal links">
        {orphans?.count > 0 ? (
          <div>
            <div className="mb-3 text-sm text-amber-300">⚠ {orphans.count} orphan page(s) detected</div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {orphans.pages.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-ink-700 bg-ink-800/30 px-2 py-1.5 text-xs">
                  <span className="truncate font-mono text-slate-300">{p.url}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <Empty>No orphan pages — all sitemap URLs are internally linked.</Empty>}
      </Section>
    </div>
  );
}
