import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function Page() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    window.scrollTo(0, 0);
    fetch(`${API}/public/pages/${slug}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(data => { if (data?.page) setPage(data.page); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="inline-block w-8 h-8 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !page) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="font-kannada font-bold text-2xl text-gray-800 mb-3">ಪುಟ ಸಿಗಲಿಲ್ಲ</h1>
      <Link to="/" className="text-white px-5 py-2 rounded text-sm inline-block" style={{ background: '#c0392b' }}>← ಮುಖಪುಟ</Link>
    </div>
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs font-ui text-gray-400 mb-5 flex items-center gap-1.5">
        <Link to="/" className="hover:text-red-600 transition-colors">ಮುಖಪುಟ</Link>
        <span>›</span>
        <span className="text-gray-600">{page.title}</span>
      </nav>

      {/* Title */}
      <h1 className="font-kannada font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100"
        style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
        {page.title}
      </h1>

      {/* Content */}
      <div className="article-body" dangerouslySetInnerHTML={{ __html: page.content }} />

      {/* Back link */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        <Link to="/" className="text-sm font-ui font-semibold transition-colors hover:underline" style={{ color: '#c0392b' }}>
          ← ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ
        </Link>
      </div>
    </main>
  );
}
