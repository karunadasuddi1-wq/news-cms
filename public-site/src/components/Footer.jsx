import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchCategories } from '../api/client';

const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'ಕನ್ನಡ ನ್ಯೂಸ್';
const LOGO_URL = import.meta.env.VITE_LOGO_URL || '';

const NAV_LABELS = {
  'latest-news': 'ತಾಜಾ ಸುದ್ದಿ', 'karnataka': 'ಕರ್ನಾಟಕ', 'india-news': 'ರಾಷ್ಟ್ರೀಯ',
  'international': 'ಅಂತರರಾಷ್ಟ್ರೀಯ', 'sports': 'ಕ್ರೀಡೆ', 'entertainment': 'ಮನರಂಜನೆ',
  'business': 'ವ್ಯಾಪಾರ', 'automobile-news': 'ಆಟೋ', 'lifestyle': 'ಜೀವನಶೈಲಿ',
  'crime-news': 'ಅಪರಾಧ', 'special': 'ವಿಶೇಷ', 'health': 'ಆರೋಗ್ಯ',
  'agriculture': 'ಕೃಷಿ', 'jobs': 'ಉದ್ಯೋಗ',
};

export default function Footer() {
  const [categories, setCategories] = useState([]);
  const [pages, setPages] = useState([]);
  const API = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetch(`${API}/public/pages`)
      .then(r => r.json())
      .then(d => setPages((d.pages || []).filter(p => p.showInFooter)))
      .catch(() => {});
  }, []);

  return (
    <footer style={{ background: '#1a1a1a' }} className="text-gray-400 mt-10">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div>
            {LOGO_URL ? (
              <img src={LOGO_URL} alt={SITE_NAME} className="h-10 w-auto object-contain mb-3 brightness-0 invert" />
            ) : (
              <div className="font-kannada font-bold text-xl mb-2" style={{ color: '#e55' }}>
                ಕನ್ನಡದುನಿಯಾ
              </div>
            )}
            <p className="text-xs font-kannada text-gray-500 leading-relaxed mb-4">
              ವಿಶ್ವಾಸಾರ್ಹ ಕನ್ನಡ ಸುದ್ದಿ ಮಾಧ್ಯಮ. ಇತ್ತೀಚಿನ ಸ್ಥಳೀಯ ಮತ್ತು ರಾಷ್ಟ್ರೀಯ ಸುದ್ದಿಗಳು.
            </p>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/KannadaDunia" target="_blank" rel="noopener noreferrer"
                className="text-xs font-ui text-gray-500 hover:text-white transition-colors">Facebook</a>
              <a href="https://www.instagram.com/kannada_dunia_official" target="_blank" rel="noopener noreferrer"
                className="text-xs font-ui text-gray-500 hover:text-white transition-colors">Instagram</a>
              <a href="https://www.youtube.com/@kannadaduniaa" target="_blank" rel="noopener noreferrer"
                className="text-xs font-ui text-gray-500 hover:text-white transition-colors">YouTube</a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm uppercase tracking-wide mb-3">ವಿಭಾಗಗಳು</h4>
            <ul className="space-y-1.5">
              {categories.slice(0, 8).map(cat => (
                <li key={cat.id}>
                  <Link to={`/category/${cat.slug}`}
                    className="text-xs font-kannada text-gray-500 hover:text-white transition-colors">
                    {NAV_LABELS[cat.slug] || cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More categories */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm uppercase tracking-wide mb-3">ಇನ್ನಷ್ಟು</h4>
            <ul className="space-y-1.5">
              {categories.slice(8, 16).map(cat => (
                <li key={cat.id}>
                  <Link to={`/category/${cat.slug}`}
                    className="text-xs font-kannada text-gray-500 hover:text-white transition-colors">
                    {NAV_LABELS[cat.slug] || cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About + Contact */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm uppercase tracking-wide mb-3">About</h4>
            <ul className="space-y-1.5">
              {pages.map(p => (
                <li key={p.id}>
                  <Link to={`/page/${p.slug}`} className="text-xs font-kannada text-gray-500 hover:text-white transition-colors">
                    {p.title}
                  </Link>
                </li>
              ))}
              {pages.length === 0 && (
                <>
                  <li><Link to="/page/about-us" className="text-xs text-gray-500 hover:text-white transition-colors">About Us</Link></li>
                  <li><Link to="/page/contact-us" className="text-xs text-gray-500 hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link to="/page/privacy-policy" className="text-xs text-gray-500 hover:text-white transition-colors">Privacy Policy</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs font-ui text-gray-600">
            © {new Date().getFullYear()} KannadaDunia.com · ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ
          </p>
          <p className="text-xs font-ui text-gray-700">
            Powered by Pressroom CMS
          </p>
        </div>
      </div>
    </footer>
  );
}
