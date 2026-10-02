// Shared UI primitives.

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Empty({ children = 'No data yet.' }) {
  return <div className="py-8 text-center text-sm text-slate-500">{children}</div>;
}

// Circular score gauge (0-100).
export function ScoreGauge({ value, label, color = '#38bdf8', size = 96 }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const dash = (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1b2740" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="50" y="54" textAnchor="middle" className="fill-slate-100" fontSize="26" fontWeight="700">
          {Math.round(pct)}
        </text>
      </svg>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}

// Status / severity pill.
export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  };
  return <span className={`pill border ${tones[tone] || tones.slate}`}>{children}</span>;
}

// Week-over-week / period-over-period delta badge.
export function TrendDelta({ value, invert = false, suffix = '%' }) {
  if (value === null || value === undefined) return <Badge tone="slate">—</Badge>;
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  const tone = good ? 'green' : bad ? 'red' : 'slate';
  const arrow = good ? '▲' : bad ? '▼' : '▬';
  return <Badge tone={tone}>{arrow} {Math.abs(value).toFixed(1)}{suffix}</Badge>;
}

// Core Web Vitals traffic-light indicator.
export function TrafficLight({ value }) {
  const map = { good: 'green', 'needs improvement': 'amber', poor: 'red' };
  const tone = map[value] || 'slate';
  const dot = { green: 'bg-emerald-400', amber: 'bg-amber-400', red: 'bg-rose-400', slate: 'bg-slate-400' }[tone];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <span className="text-xs capitalize text-slate-300">{value === 'needs improvement' ? 'Needs improvement' : value || '—'}</span>
    </span>
  );
}

export function StatCard({ label, value, sub, tone = 'sky' }) {
  const tones = {
    sky: 'from-sky-500/10 to-transparent',
    violet: 'from-violet-500/10 to-transparent',
    emerald: 'from-emerald-500/10 to-transparent',
    amber: 'from-amber-500/10 to-transparent',
    rose: 'from-rose-500/10 to-transparent',
  };
  return (
    <div className={`card bg-gradient-to-br ${tones[tone] || tones.sky}`}>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-100">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Section({ title, subtitle, right, children }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
