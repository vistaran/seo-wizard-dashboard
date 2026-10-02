import { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { useFetch } from '../hooks';
import { api } from '../api';
import { Loading, Empty, Badge, Section } from '../components/ui';

const SEVERITY_TONE = { critical: 'red', warning: 'amber', opportunity: 'sky' };
const STATUS_TONE = { open: 'amber', pending_review: 'violet', resolved: 'green' };
const CATEGORY_TONE = { technical: 'sky', onpage: 'sky', content: 'violet', links: 'violet', aeo: 'green', geo: 'violet' };

function IssueRow({ issue, onVerify, onLog }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  const verify = async () => {
    setVerifying(true);
    setResult(null);
    try {
      const r = await api.verifyIssue(issue.id);
      setResult(r.verification);
      onVerify(r.issue);
    } catch (e) {
      setResult({ summary: e.message, resolved: false });
    } finally {
      setVerifying(false);
    }
  };

  const toggleLog = async () => {
    if (!showLog && !log.length) {
      setLogLoading(true);
      try {
        const r = await api.issueLog(issue.id);
        setLog(r.log);
      } catch { /* ignore */ }
      setLogLoading(false);
    }
    setShowLog(!showLog);
  };

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-800/30 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={SEVERITY_TONE[issue.severity]}>{issue.severity}</Badge>
            <Badge tone={CATEGORY_TONE[issue.category]}>{issue.category}</Badge>
            <Badge tone={STATUS_TONE[issue.status]}>{issue.status.replace('_', ' ')}</Badge>
          </div>
          <div className="text-sm font-medium text-slate-100">{issue.title}</div>
          <div className="break-all font-mono text-xs text-slate-500">{issue.url}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={verify} disabled={verifying} className="btn-primary">
            {verifying ? 'Verifying…' : '🔍 Verify'}
          </button>
          <button onClick={toggleLog} className="btn-ghost">History</button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
        <div className="rounded bg-ink-800/60 p-2">
          <span className="text-slate-500">Issue: </span>
          <span className="text-slate-300">{issue.description}</span>
        </div>
        <div className="rounded bg-ink-800/60 p-2">
          <span className="text-slate-500">Fix: </span>
          <span className="text-slate-300">{issue.recommended_fix}</span>
        </div>
      </div>

      {result && (
        <div className={`mt-2 rounded p-2 text-xs ${result.resolved ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
          {result.resolved ? '✅ Resolved — ' : '❌ Not resolved — '}
          {result.summary}
          {issue.last_verified && <span className="ml-2 text-slate-500">verified {new Date(issue.last_verified).toLocaleString()}</span>}
        </div>
      )}

      {showLog && (
        <div className="mt-2 rounded border border-ink-700 bg-ink-900/60 p-2">
          <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Audit log</div>
          {logLoading ? <div className="text-xs text-slate-500">Loading…</div> : (
            <div className="space-y-1">
              {log.length ? log.map((l, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-300"><span className="text-slate-500">{l.event}</span> {l.detail ? `— ${l.detail}` : ''}</span>
                  <span className="font-mono text-slate-500">{new Date(l.timestamp).toLocaleString()}</span>
                </div>
              )) : <div className="text-xs text-slate-500">No events.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Issues() {
  const { tenant } = useTenant();
  const { data, loading, error, refetch } = useFetch(() => (tenant === 'unified' ? Promise.resolve(null) : api.issues(tenant)), [tenant]);
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [filter, setFilter] = useState('all');

  if (tenant === 'unified') {
    return <div className="card text-slate-300">Select a specific website (A / B / C) to manage its issue queue.</div>;
  }
  if (loading) return <Loading label="Loading issue queue…" />;
  if (error) return <div className="card text-rose-300">{error}</div>;

  const runAudit = async () => {
    setAuditing(true);
    setAuditResult(null);
    try {
      const r = await api.runAudit(tenant);
      setAuditResult(r);
      refetch();
    } catch (e) {
      setAuditResult({ error: e.message });
    } finally {
      setAuditing(false);
    }
  };

  const issues = data?.issues || [];
  const filtered = filter === 'all' ? issues : issues.filter((i) => i.status === filter);
  const counts = data?.summary || {};

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Issue &amp; Action Tracker</h1>
          <p className="text-sm text-slate-400">AI auto-audit · live verification · historical changelog.</p>
        </div>
        <button onClick={runAudit} disabled={auditing} className="btn-primary">
          {auditing ? 'Auditing…' : '⚡ Run AI Auto-Audit'}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCardMini label="Total" value={counts?.total} tone="sky" />
        <StatCardMini label="Open" value={counts?.byStatus?.open} tone="amber" />
        <StatCardMini label="Pending" value={counts?.byStatus?.pending_review} tone="violet" />
        <StatCardMini label="Resolved" value={counts?.byStatus?.resolved} tone="green" />
      </div>

      {auditResult && !auditResult.error && (
        <div className="card border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-300">
          ✅ Audit complete — crawled {auditResult.pages.length} pages, added {auditResult.added} new issues.
        </div>
      )}
      {auditResult?.error && <div className="card text-rose-300">{auditResult.error}</div>}

      <Section
        title="Actionable Issue Queue"
        subtitle="Grouped by category & severity — verify fixes live"
        right={
          <div className="flex gap-1">
            {['all', 'open', 'pending_review', 'resolved'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'btn-primary' : 'btn-ghost'}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        }
      >
        {filtered.length ? (
          <div className="space-y-2">
            {filtered.map((i) => (
              <IssueRow key={i.id} issue={i} onVerify={refetch} onLog={() => {}} />
            ))}
          </div>
        ) : (
          <Empty>No issues in this view. Run an auto-audit to populate the queue.</Empty>
        )}
      </Section>
    </div>
  );
}

function StatCardMini({ label, value, tone }) {
  const tones = { sky: 'text-sky-300', amber: 'text-amber-300', violet: 'text-violet-300', green: 'text-emerald-300' };
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value ?? 0}</div>
    </div>
  );
}
