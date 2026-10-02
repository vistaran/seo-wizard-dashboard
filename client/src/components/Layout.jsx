import { NavLink } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

const NAV = [
  { to: '/', label: 'Overview', icon: '🦅', end: true },
  { to: '/issues', label: 'Issues & Actions', icon: '🛠️' },
  { to: '/performance', label: 'Performance', icon: '📈' },
  { to: '/content', label: 'Content Strategy', icon: '📝' },
  { to: '/authority', label: 'Authority & Keywords', icon: '🔗' },
  { to: '/technical', label: 'Technical Health', icon: '⚙️' },
  { to: '/notes', label: 'Notes & Actions', icon: '🗒️' },
];

function TenantSwitcher() {
  const { sites, tenant, setTenant, currentSite } = useTenant();
  return (
    <div className="px-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tenant</div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setTenant('unified')}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${tenant === 'unified' ? 'bg-accent/15 text-accent' : 'text-slate-300 hover:bg-ink-700'}`}
        >
          <span className="text-base">🌐</span> Unified View
        </button>
        {sites.map((s) => (
          <button
            key={s.key}
            onClick={() => setTenant(s.key)}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${tenant === s.key ? 'bg-accent/15 text-accent' : 'text-slate-300 hover:bg-ink-700'}`}
          >
            <span className="text-base">{s.label.slice(-1) === 'A' ? '🅰️' : s.label.slice(-1) === 'B' ? '🅱️' : '🅲'}</span>
            <span className="flex-1 truncate">{s.label} · {s.domain}</span>
          </button>
        ))}
      </div>
      {currentSite && (
        <div className="mt-3 rounded-lg border border-ink-700 bg-ink-800/50 px-2.5 py-2 text-xs text-slate-400">
          <div className="font-medium text-slate-300">{currentSite.name}</div>
          <div>{currentSite.keywordCount} tracked keywords</div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { currentSite, tenant } = useTenant();
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
        <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-4">
          <span className="text-2xl">🧙</span>
          <div>
            <div className="text-sm font-bold text-slate-100">SEO Wizard</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">SEO · AEO · GEO</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <TenantSwitcher />
          <nav className="mt-3 flex flex-col gap-0.5 px-3">
            <div className="mb-1 mt-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Modules</div>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${isActive ? 'bg-accent/15 text-accent' : 'text-slate-300 hover:bg-ink-700'}`
                }
              >
                <span>{item.icon}</span> {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t border-ink-700 px-4 py-3 text-[10px] text-slate-600">
          {tenant === 'unified' ? 'Portfolio · 3 properties' : `Tenant · ${currentSite?.domain || '…'}`}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
