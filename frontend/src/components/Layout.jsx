import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const MAIN_NAV = [
  { to: '/', label: 'Dashboard', icon: '◆', end: true },
  { to: '/articles', label: 'Articles', icon: '▤' },
  { to: '/ai-writer', label: 'AI Writer', icon: '✦' },
  { to: '/newsroom', label: 'Newsroom', icon: '◈' },
  { to: '/analytics', label: 'Analytics', icon: '▲' },
];

const CONTENT_NAV = [
  { to: '/categories', label: 'Categories', icon: '▥' },
  { to: '/pages', label: 'Pages', icon: '◧' },
];

const ADMIN_NAV = [
  { to: '/usage', label: 'AI Costs', icon: '💰', requiresAdmin: true },
  { to: '/settings', label: 'Settings', icon: '⚙', requiresAdmin: true },
  { to: '/users', label: 'Staff', icon: '☷', requiresAdmin: true },
];

export default function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!can.manageAny) return;
    let cancelled = false;
    const fetchCounts = () => {
      client.get('/dashboard/stats')
        .then(r => {
          if (cancelled) return;
          setPendingReviewCount(r.data.articles?.pendingReview || 0);
          setTotalArticles(r.data.articles?.total || 0);
          setStaffCount(r.data.users || 0);
        })
        .catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [can.manageAny]);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/articles?search=${encodeURIComponent(searchQuery.trim())}`);
  }

  const NAV_COUNTS = { '/articles': pendingReviewCount || undefined, '/users': staffCount || undefined };

  function renderNavGroup(items, label) {
    const visible = items.filter(i => !i.requiresAdmin || can.manageUsers);
    if (visible.length === 0) return null;
    return (
      <div className="mb-4">
        {label && (
          <p className="px-3 mb-1.5 text-[10px] font-mono font-semibold text-ink-400 uppercase tracking-widest">
            {label}
          </p>
        )}
        <nav className="space-y-0.5">
          {visible.map(item => (
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
              {NAV_COUNTS[item.to] > 0 && (
                <span className="ml-auto bg-amber-500 text-ink-900 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {NAV_COUNTS[item.to]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    );
  }

  const SidebarContent = () => (
    <aside className="w-60 shrink-0 bg-ink-900 text-paper-50 flex flex-col h-full">
      <div className="px-6 py-7 border-b border-white/10 flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-black text-2xl tracking-tight">{import.meta.env.VITE_SITE_SHORT_NAME || 'NEWSROOM'}</span>
            <span className="text-press-red text-2xl leading-none">.</span>
          </div>
          <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400">
            {import.meta.env.VITE_SITE_NAME || 'ಕನ್ನಡದುನಿಯಾ CMS'}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-ink-400 hover:text-white mt-1 text-xl leading-none"
          aria-label="Close menu"
        >✕</button>
      </div>

      <div className="px-4 pt-4">
        <NavLink
          to="/articles/new"
          className="w-full bg-press-red hover:bg-press-red-dark text-white rounded-lg py-2.5 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <span className="text-base leading-none">+</span> Write a Story
        </NavLink>
      </div>

      <div className="flex-1 px-3 pt-5 pb-5 overflow-y-auto">
        {renderNavGroup(MAIN_NAV, 'Main')}
        {renderNavGroup(CONTENT_NAV, 'Content')}
        {renderNavGroup(ADMIN_NAV, 'Admin')}
      </div>

      <div className="px-4 py-5 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-press-red/20 border border-press-red/40 flex items-center justify-center font-display font-bold text-sm text-press-red shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[11px] font-mono uppercase tracking-wide text-ink-400">{user?.role}</p>
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

  return (
    <div className="flex min-h-screen bg-paper-50">
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <SidebarContent />
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-ink-900 text-white flex items-center gap-3 px-4 py-3 shadow-md">
          <button
            onClick={() => setOpen(true)}
            className="text-white p-1 -ml-1"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-black text-lg tracking-tight">{import.meta.env.VITE_SITE_SHORT_NAME || 'NEWSROOM'}</span>
            <span className="text-press-red text-lg leading-none">.</span>
          </div>
        </header>

        <header className="hidden lg:flex items-center gap-4 px-6 py-3 border-b border-paper-200 bg-white sticky top-0 z-20">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
            <div className="flex items-center gap-2 bg-paper-50 border border-paper-200 rounded-lg px-3 py-2">
              <span className="text-ink-400 text-sm">⌕</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search articles by title…"
                className="bg-transparent border-none outline-none text-sm text-ink-900 placeholder-ink-400 w-full"
              />
            </div>
          </form>
          {can.manageAny && (
            <div className="ml-auto flex items-center gap-4 text-xs font-mono text-ink-400">
              <span>{totalArticles} articles total</span>
            </div>
          )}
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
