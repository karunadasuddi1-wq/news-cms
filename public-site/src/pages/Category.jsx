import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchArticles, fetchCategories } from '../api/client';
import { ArticleCardLarge, ArticleCardMedium } from '../components/ArticleCard';
import SeoHead from '../components/SeoHead';

export default function Category() {
  const { slug } = useParams();
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchArticles({ category: slug, page, pageSize: 15 }),
      fetchCategories(),
    ]).then(([res, cats]) => {
      setArticles(res.articles || []);
      setPagination(res.pagination || {});
      const found = cats.find(c => c.slug === slug);
      if (found) setCategory(found);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, page]);

  useEffect(() => { setPage(1); }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hero = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      <SeoHead category={category || { name: slug, slug }} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Category header */}
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-gray-900">
          <div className="w-1.5 h-6 rounded-full" style={{ background: '#c0392b' }} />
          <h1 className="font-kannada font-bold text-xl text-gray-900">
            {category?.name || slug} ಸುದ್ದಿ
          </h1>
          {pagination.total > 0 && (
            <span className="text-sm text-gray-400 font-ui ml-2">({pagination.total} articles)</span>
          )}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-20 text-gray-400 font-kannada text-lg">
            ಈ ವಿಭಾಗದಲ್ಲಿ ಯಾವುದೇ ಸುದ್ದಿ ಇಲ್ಲ
          </div>
        )}

        {hero && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <ArticleCardLarge article={hero} />
            </div>
            <div className="space-y-1">
              {rest.slice(0, 4).map(a => <ArticleCardMedium key={a.id} article={a} />)}
            </div>
          </div>
        )}

        {rest.slice(4).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {rest.slice(4).map(a => <ArticleCardLarge key={a.id} article={a} />)}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-sm font-ui border border-gray-300 rounded hover:border-red-500 disabled:opacity-40 transition-colors">
              ← ಹಿಂದೆ
            </button>
            <span className="text-sm font-ui text-gray-500 px-3">
              {page} / {pagination.totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 text-sm font-ui border border-gray-300 rounded hover:border-red-500 disabled:opacity-40 transition-colors">
              ಮುಂದೆ →
            </button>
          </div>
        )}
      </main>
    </>
  );
}
