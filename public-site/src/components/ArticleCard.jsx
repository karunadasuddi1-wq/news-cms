import { Link } from 'react-router-dom';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ಈಗಷ್ಟೇ';
  if (m < 60) return `${m} ನಿಮಿಷ ಹಿಂದೆ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ಗಂಟೆ ಹಿಂದೆ`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ದಿನ ಹಿಂದೆ`;
  return new Date(dateStr).toLocaleDateString('kn-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const AKHAND = "'Anek Kannada', sans-serif";

// Build SEO-friendly URL: /category-slug/article-slug
function articleUrl(article) {
  const cat = article.category?.slug || 'news';
  return `/${cat}/${article.slug}`;
}

export function ArticleCardLarge({ article }) {
  return (
    <Link to={articleUrl(article)} className="group block">
      <div className="relative aspect-video bg-gray-100 overflow-hidden rounded-lg mb-3 shadow-sm">
        {article.featuredImage
          ? <img src={article.featuredImage} alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-300 text-5xl">📰</div>
        }
        {article.category && (
          <span className="absolute top-2.5 left-2.5 text-white text-xs font-ui font-bold px-2.5 py-1 rounded uppercase tracking-wide shadow"
            style={{ background: '#c0392b' }}>
            {article.category.name}
          </span>
        )}
      </div>
      <h2 className="font-bold text-lg leading-snug text-gray-900 group-hover:text-red-700 transition-colors mb-2 line-clamp-2"
        style={{ fontFamily: AKHAND, fontSize: '1.2rem', lineHeight: 1.35 }}>
        {article.title}
      </h2>
      {article.excerpt && (
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-2" style={{ fontFamily: 'Noto Sans Kannada, sans-serif' }}>
          {article.excerpt}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-400 font-ui">
        {article.author && <span className="font-medium">{article.author.name}</span>}
        {article.author && <span>·</span>}
        <span>{timeAgo(article.publishedAt)}</span>
      </div>
    </Link>
  );
}

export function ArticleCardMedium({ article }) {
  return (
    <Link to={articleUrl(article)} className="group flex gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-shrink-0 w-24 h-16 bg-gray-100 overflow-hidden rounded-md">
        {article.featuredImage
          ? <img src={article.featuredImage} alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 text-xl">📰</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        {article.category && (
          <span className="text-xs font-ui font-bold uppercase tracking-wide" style={{ color: '#c0392b' }}>
            {article.category.name}
          </span>
        )}
        <h3 className="font-semibold text-sm leading-snug text-gray-900 group-hover:text-red-700 transition-colors mt-0.5 line-clamp-2"
          style={{ fontFamily: AKHAND, lineHeight: 1.4 }}>
          {article.title}
        </h3>
        <p className="text-xs text-gray-400 font-ui mt-1">{timeAgo(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

export function ArticleCardSmall({ article }) {
  return (
    <Link to={articleUrl(article)} className="group block py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#c0392b' }} />
        <h4 className="text-sm leading-snug text-gray-800 group-hover:text-red-700 transition-colors line-clamp-2"
          style={{ fontFamily: AKHAND, lineHeight: 1.45 }}>
          {article.title}
        </h4>
      </div>
      <p className="text-xs text-gray-400 font-ui mt-1 ml-3.5">{timeAgo(article.publishedAt)}</p>
    </Link>
  );
}
