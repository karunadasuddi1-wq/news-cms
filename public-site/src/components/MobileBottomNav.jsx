import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/category/latest-news', label: 'News', icon: '📰' },
  { to: '/category/entertainment', label: 'Videos', icon: '▶️' },
  { to: '/?search=', label: 'Discover', icon: '🔍' },
  { to: '/category/special', label: 'Saved', icon: '🔖' },
];

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav">
      {NAV.map(item => (
        <NavLink key={item.label} to={item.to} end={item.end}
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon">{item.icon}</span>
          <span className="mobile-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
