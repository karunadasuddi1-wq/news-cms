import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const DAYS = ['ಭಾನುವಾರ','ಸೋಮವಾರ','ಮಂಗಳವಾರ','ಬುಧವಾರ','ಗುರುವಾರ','ಶುಕ್ರವಾರ','ಶನಿವಾರ'];
const MONTHS = ['ಜನವರಿ','ಫೆಬ್ರವರಿ','ಮಾರ್ಚ್','ಏಪ್ರಿಲ್','ಮೇ','ಜೂನ್','ಜುಲೈ','ಆಗಸ್ಟ್','ಸೆಪ್ಟೆಂಬರ್','ಅಕ್ಟೋಬರ್','ನವೆಂಬರ್','ಡಿಸೆಂಬರ್'];
function kannadaDate() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Matches actual WP category slugs migrated to CMS
const NAV = [
  { label: 'ಹೋಂ',           to: '/',                    home: true },
  { label: 'ಕರುನಾಡು',       to: '/category/karunadu' },
  { label: 'ರಾಜ್ಯ',         to: '/category/state',      drop: true },
  { label: 'ರಾಜಕೀಯ',       to: '/category/politics' },
  { label: 'ದೇಶ',           to: '/category/national' },
  { label: 'ಅಂತಾರಾಷ್ಟ್ರೀಯ', to: '/category/international' },
  { label: 'ಮನರಂಜನೆ',      to: '/category/entertainment' },
  { label: 'ಕ್ರೀಡೆ',        to: '/category/sports',     drop: true },
  { label: 'ವಿಜ್ಞಾನ',       to: '/category/science' },
  { label: 'ಉದ್ಯೋಗ',        to: '/category/jobs' },
  { label: 'ಹಣಕಾಸು',       to: '/category/money' },
  { label: 'ಲೈಫಸ್ಟೈಲ್',    to: '/category/lifestyle' },
  { label: 'ಕ್ರೈಂ',         to: '/category/crime' },
];

export default function SiteHeader({ tickerArticles = [] }) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
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

      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo-wrap">
  <img 
    src="https://i0.wp.com/karunadasuddi.in/wp-content/uploads/2025/06/Karunada-Suddhi-Logo-1.jpeg"
    alt="ಕರುನಾಡ ಸುದ್ದಿ"
    style={{ height: '70px', width: 'auto', objectFit: 'contain' }}
  />
</Link>  
          <div className="header-banner">
            <div className="ad-placeholder">Advertisement 728×90</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="main-nav">
          <div className="container nav-list">
            {NAV.map(item => (
              <div key={item.to} className="nav-item">
                <Link
                  to={item.to}
                  className={`nav-link${item.home && location.pathname === '/' ? ' home' : ''}${!item.home && location.pathname === item.to ? ' active' : ''}`}
                >
                  {item.label}
                  {item.drop && <span className="nav-arrow">▾</span>}
                </Link>
              </div>
            ))}
            <button className="nav-search" onClick={() => setSearchOpen(s => !s)}>🔍</button>
          </div>

          {searchOpen && (
            <div style={{background:'#fff',borderTop:'1px solid #eee',padding:'8px 12px'}}>
              <form onSubmit={handleSearch} className="search-form" style={{maxWidth:560,margin:'0 auto'}}>
                <input className="search-inp" placeholder="ಸುದ್ದಿ ಹುಡುಕಿ..." value={query} onChange={e=>setQuery(e.target.value)} autoFocus/>
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
