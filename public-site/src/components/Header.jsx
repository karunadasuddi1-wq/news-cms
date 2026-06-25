import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { fetchCategories } from '../api/client';

const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'ಕನ್ನಡ ನ್ಯೂಸ್';
const LOGO_URL = import.meta.env.VITE_LOGO_URL || '';

// Top-level nav categories (shown in main nav bar)
const TOP_NAV = ['latest-news', 'karnataka', 'india-news', 'sports', 'entertainment', 'business', 'automobile-news', 'lifestyle', 'special'];

const NAV_LABELS = {
  'latest-news': 'ತಾಜಾ ಸುದ್ದಿ',
  'karnataka': 'ಕರ್ನಾಟಕ',
  'india-news': 'ರಾಷ್ಟ್ರೀಯ',
  'international': 'ಅಂತರರಾಷ್ಟ್ರೀಯ',
  'sports': 'ಕ್ರೀಡೆ',
  'entertainment': 'ಮನರಂಜನೆ',
  'business': 'ವ್ಯಾಪಾರ',
  'automobile-news': 'ಆಟೋ',
  'lifestyle': 'ಜೀವನಶೈಲಿ',
  'crime-news': 'ಅಪರಾಧ',
  'special': 'ವಿಶೇಷ',
  'health': 'ಆರೋಗ್ಯ',
  'agriculture': 'ಕೃಷಿ',
  'jobs': 'ಉದ್ಯೋಗ',
};

export default function Header() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [today, setToday] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    setToday(new Date().toLocaleDateString('kn-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/?search=${encodeURIComponent(search.trim())}`);
      setMenuOpen(false);
    }
  }

  const navCategories = categories.filter(c => TOP_NAV.includes(c.slug));
  navCategories.sort((a, b) => TOP_NAV.indexOf(a.slug) - TOP_NAV.indexOf(b.slug));

  return (
    <header>
      {/* Top utility bar */}
      <div style={{ background: '#1a1a1a' }} className="text-white py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs font-ui text-gray-400">{today}</span>
          <div className="flex items-center gap-4">
            <a href="https://www.facebook.com/KannadaDunia" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white transition-colors font-ui">Facebook</a>
            <a href="https://www.instagram.com/kannada_dunia_official" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white transition-colors font-ui">Instagram</a>
            <a href="https://www.youtube.com/@kannadaduniaa" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white transition-colors font-ui">YouTube</a>
          </div>
        </div>
      </div>

      {/* Logo + Search */}
      <div className="bg-white border-b-4 px-4 py-3" style={{ borderColor: '#c0392b' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex-shrink-0 flex items-center gap-3">
            {LOGO_URL ? (
              <img src={LOGO_URL} alt={SITE_NAME} className="h-12 w-auto object-contain" />
            ) : (
              <div className="flex flex-col">
                <span className="font-kannada font-bold leading-tight" style={{ fontSize: '1.75rem', color: '#c0392b' }}>
                  ಕನ್ನಡದುನಿಯಾ
                </span>
                <span className="font-ui text-xs text-gray-400 tracking-widest uppercase">KannadaDunia.com</span>
              </div>
            )}
          </Link>

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:flex">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ಸುದ್ದಿ ಹುಡುಕಿ..."
              className="flex-1 border border-gray-300 rounded-l px-3 py-2 text-sm font-kannada focus:outline-none focus:border-red-600"
            />
            <button type="submit" style={{ background: '#c0392b' }}
              className="text-white px-4 py-2 rounded-r text-sm font-ui hover:bg-red-800 transition-colors">
              ಹುಡುಕಿ
            </button>
          </form>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(o => !o)} className="sm:hidden p-2 text-gray-600">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {menuOpen
                ? <path d="M6 18L18 6M6 6l12 12" />
                : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Category nav bar */}
      <nav style={{ background: '#1a1a1a' }} className="hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto">
          <NavLink to="/" end className={({ isActive }) =>
            `px-4 py-2.5 text-sm font-kannada font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${isActive ? 'border-red-500 text-white' : 'border-transparent text-gray-300 hover:text-white hover:border-red-500'}`
          }>ಮುಖಪುಟ</NavLink>

          {navCategories.map(cat => (
            <NavLink key={cat.id} to={`/category/${cat.slug}`}
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm font-kannada font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${isActive ? 'border-red-500 text-white' : 'border-transparent text-gray-300 hover:text-white hover:border-red-500'}`
              }>
              {NAV_LABELS[cat.slug] || cat.name}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile expanded menu */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 px-4 pb-4">
          <form onSubmit={handleSearch} className="flex mt-3 mb-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ಸುದ್ದಿ ಹುಡುಕಿ..."
              className="flex-1 border border-gray-300 rounded-l px-3 py-2 text-sm font-kannada focus:outline-none" />
            <button type="submit" style={{ background: '#c0392b' }}
              className="text-white px-3 py-2 rounded-r text-sm">ಹುಡುಕಿ</button>
          </form>
          <div className="grid grid-cols-3 gap-2">
            <Link to="/" onClick={() => setMenuOpen(false)}
              className="text-center py-2 text-sm font-kannada bg-gray-100 rounded hover:bg-red-50">ಮುಖಪುಟ</Link>
            {navCategories.map(cat => (
              <Link key={cat.id} to={`/category/${cat.slug}`} onClick={() => setMenuOpen(false)}
                className="text-center py-2 text-sm font-kannada bg-gray-100 rounded hover:bg-red-50">
                {NAV_LABELS[cat.slug] || cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
