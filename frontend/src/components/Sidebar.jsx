import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◆', end: true },
  { to: '/articles', label: 'Articles', icon: '▤' },
  { to: '/categories', label: 'Categories', icon: '▥' },
  { to: '/analytics', label: 'Analytics', icon: '▲' },
  { to: '/pages', label: 'Pages', icon: '◧' },
  { to: '/users', label: 'Staff', icon: '☷', requiresAdmin: true },
];

export default function Sidebar() {
  const { user, logout, can } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-ink-900 text-paper-50 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-7 border-b border-white/10">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-black text-2xl tracking-tight">NEWSROOM</span>
          <span className="text-press-red text-2xl leading-none">.</span>
        </div>
        <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400">
          ಕನ್ನಡದುನಿಯಾ CMS
        </p>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {NAV_ITEMS.filter((item) => !item.requiresAdmin || can.manageUsers).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-press-red text-white'
                  : 'text-paper-200 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="text-base leading-none opacity-80">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-5 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-press-red/20 border border-press-red/40 flex items-center justify-center font-display font-bold text-sm text-press-red">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[11px] font-mono uppercase tracking-wide text-ink-400">
              {user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-xs font-mono uppercase tracking-wide text-ink-400 hover:text-press-red transition-colors py-1"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
