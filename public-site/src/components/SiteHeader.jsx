import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const DAYS = ['ಭಾನುವಾರ','ಸೋಮವಾರ','ಮಂಗಳವಾರ','ಬುಧವಾರ','ಗುರುವಾರ','ಶುಕ್ರವಾರ','ಶನಿವಾರ'];
const MONTHS = ['ಜನವರಿ','ಫೆಬ್ರವರಿ','ಮಾರ್ಚ್','ಏಪ್ರಿಲ್','ಮೇ','ಜೂನ್','ಜುಲೈ','ಆಗಸ್ಟ್','ಸೆಪ್ಟೆಂಬರ್','ಅಕ್ಟೋಬರ್','ನವೆಂಬರ್','ಡಿಸೆಂಬರ್'];

function kannadaDate() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const NAV = [
  { label: 'ಮುಖಪುಟ', to: '/', home: true },
  { label: 'ಕರ್ನಾಟಕ', to: '/category/karnataka', drop: true },
  { label: 'ರಾಜ್ಯ', to: '/category/rajya', drop: true },
  { label: 'ರಾಜಕೀಯ', to: '/category/rajakeeyata' },
  { label: 'ದೇಶ', to: '/category/desh' },
  { label: 'ಅಂತರಾಷ್ಟ್ರೀಯ', to: '/category/antarashetriya' },
  { label: 'ಮನರಂಜನೆ', to: '/category/entertainment' },
  { label: 'ಕ್ರೀಡೆ', to: '/category/sports', drop: true },
  { label: 'ವಿಜ್ಞಾನ', to: '/category/science' },
  { label: 'ಉದ್ಯೋಗ', to: '/category/employment' },
  { label: 'ಹಣಕಾಸು', to: '/category/finance' },
  { label: 'MORE', to: '#', drop: true },
];

export default function SiteHeader({ tickerArticles = [] }) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) { navigate(`/search?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); setQuery(''); }
  }

  const ticker = tickerArticles.length > 0 ? [...tickerArticles, ...tickerArticles] : [];

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <div className="container inner">
          <span className="top-bar-date">{kannadaDate()}</span>
          <div className="top-bar-links">
            <Link to="/page/privacy-policy">Privacy Policy</Link>
            <Link to="/page/advertise">Advertise With Us</Link>
            <Link to="/page/contact">Contact Us</Link>
            <Link to="/page/terms">Terms of Service</Link>
          </div>
        </div>
      </div>

      {/* Header with logo + banner ad */}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo-wrap">
            <div className="logo-text">
              <span className="logo-kannada">ಕಯ್ನಾಡ ಸುದ್ದಿ</span>
            </div>
          </Link>
          <div className="header-banner">
            <div className="ad-placeholder">Advertisement 728×90</div>
          </div>
        </div>

        {/* Nav bar */}
        <nav className="main-nav">
          <div className="container nav-list">
            {NAV.map(item => (
              <div key={item.to} className="nav-item">
                <Link
                  to={item.to}
                  className={`nav-link${item.home && location.pathname === '/' ? ' home' : ''}${location.pathname === item.to && !item.home ? ' active' : ''}`}
                >
                  {item.label}
                  {item.drop && <span className="nav-arrow">▾</span>}
                </Link>
              </div>
            ))}
            <button className="nav-search" onClick={() => setSearchOpen(s => !s)}>🔍</button>
          </div>

          {searchOpen && (
            <div style={{ background: '#fff', borderTop: '1px solid #eee', padding: '8px 12px' }}>
              <form onSubmit={handleSearch} className="search-form" style={{ maxWidth: 560, margin: '0 auto' }}>
                <input className="search-inp" placeholder="ಸುದ್ದಿ ಹುಡುಕಿ..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
                <button type="submit" className="search-go">ಹುಡುಕು</button>
              </form>
            </div>
          )}
        </nav>
      </header>

      {/* Ticker */}
      {ticker.length > 0 && (
        <div className="ticker-wrap">
          <span className="ticker-label">ತಾಜಾ ಸುದ್ದಿ</span>
          <div className="ticker-body">
            <div className="ticker-inner">
              {ticker.map((a, i) => (
                <span key={i} className="ticker-item" onClick={() => navigate(`/article/${a.slug}`)}>
                  {a.title} &nbsp;|&nbsp;
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
