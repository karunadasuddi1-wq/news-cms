import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchArticle, fetchArticles } from '../api/client';
import SeoHead from '../components/SeoHead';
import { InArticleAd, SidebarAd } from '../components/AdSlot';

// ── Reading progress bar ──
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? Math.min(100, (el.scrollTop / total) * 100) : 0);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, height: 3, width: `${pct}%`, background: '#c0392b', zIndex: 9999, transition: 'width 0.1s ease' }} />
  );
}

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
  return new Date(dateStr).toLocaleDateString('kn-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function readingTime(text) {
  const words = (text || '').replace(/<[^>]+>/g, '').trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} ನಿಮಿಷ ಓದು`;
}

function articleUrl(article) {
  const cat = article.category?.slug || 'news';
  return `/${cat}/${article.slug}`;
}

// ── Format content ──
function formatContent(raw) {
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return raw
      .replace(/<blockquote>/gi, '<blockquote class="pull-quote">')
      .replace(/(<h[23][^>]*)>/gi, '$1 style="font-family: Anek Kannada, sans-serif; font-weight: 700;">');
  }
  const paras = raw.split(/\n\n+|\n/).map(p => p.trim()).filter(Boolean);
  let html = '';
  let pullAdded = false;
  let paraCount = 0;
  paras.forEach((para, i) => {
    const isSentenceEnd = /[.!?।]$/.test(para);
    const isShort = para.length < 60;
    const endsColon = /[:：]$/.test(para);
    if ((isShort && !isSentenceEnd) || endsColon) {
      html += `<h2 style="font-family:Anek Kannada,sans-serif;font-weight:700">${para}</h2>`;
      return;
    }
    paraCount++;
    html += `<p>${para}</p>`;
    if (paraCount === 3 && !pullAdded) {
      const sents = para.split(/[।.!?]+/).filter(s => s.trim().length > 50);
      if (sents.length > 0) {
        html += `<div class="pull-quote">"${sents[0].trim()}"</div>`;
        pullAdded = true;
      }
    }
    if (paraCount % 6 === 0 && i < paras.length - 2) html += '<hr>';
  });
  if (!pullAdded && paras.length >= 5) {
    const mid = paras[Math.floor(paras.length / 2)];
    const sents = mid.split(/[।.!?]+/).filter(s => s.trim().length > 50);
    if (sents.length > 0) {
      html = html.replace(`<p>${mid}</p>`, `<p>${mid}</p><div class="pull-quote">"${sents[0].trim()}"</div>`);
    }
  }
  return html;
}

function loadSocialScripts() {
  if (document.querySelector('.instagram-media') && !window.instgrm) {
    const s = document.createElement('script'); s.src = '//www.instagram.com/embed.js'; s.async = true; document.body.appendChild(s);
  } else if (window.instgrm) window.instgrm.Embeds.process();
  if (document.querySelector('.twitter-tweet') && !window.twttr) {
    const s = document.createElement('script'); s.src = 'https://platform.twitter.com/widgets.js'; s.async = true; document.body.appendChild(s);
  } else if (window.twttr) window.twttr.widgets.load();
}

// ── Share button ──
function ShareBtn({ label, href, bg, icon }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-white text-xs font-ui font-semibold px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
      style={{ background: bg }}>
      {icon && <span>{icon}</span>}{label}
    </a>
  );
}

// ── Related article card ──
function RelatedCard({ article }) {
  return (
    <Link to={articleUrl(article)} className="group bg-white rounded overflow-hidden block">
      <div className="relative overflow-hidden" style={{ height: 100 }}>
        {article.featuredImage
          ? <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: '#e8e8e8' }}>📰</div>
        }
        {article.category && (
          <span className="absolute top-1.5 left-1.5 text-white text-xs font-ui font-bold px-2 py-0.5 rounded uppercase tracking-wide" style={{ background: '#c0392b', fontSize: 9 }}>
            {article.category.name}
          </span>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <h4 className="font-kannada font-semibold text-gray-900 group-hover:text-red-700 transition-colors line-clamp-2" style={{ fontSize: 12, lineHeight: 1.4 }}>
          {article.title}
        </h4>
        <p className="font-ui text-gray-400" style={{ fontSize: 10, marginTop: 4 }}>{timeAgo(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

// ── Read more card ──
function ReadMoreCard({ article }) {
  return (
    <Link to={articleUrl(article)} className="group bg-white rounded flex gap-2.5 p-2.5 block">
      <div className="flex-shrink-0 rounded overflow-hidden" style={{ width: 72, height: 52 }}>
        {article.featuredImage
          ? <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: '#e8e8e8' }}>📰</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        {article.category && (
          <span className="font-ui font-bold uppercase tracking-wide" style={{ fontSize: 9, color: '#c0392b' }}>{article.category.name}</span>
        )}
        <h4 className="font-kannada font-semibold text-gray-900 group-hover:text-red-700 transition-colors line-clamp-2" style={{ fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>
          {article.title}
        </h4>
        <p className="font-ui text-gray-400" style={{ fontSize: 10, marginTop: 3 }}>{timeAgo(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

// ── Sidebar article card ──
function SidebarCard({ article }) {
  return (
    <Link to={articleUrl(article)} className="group flex gap-2 py-2 border-b border-gray-50 last:border-0 block">
      <div className="flex-shrink-0 rounded overflow-hidden" style={{ width: 60, height: 42 }}>
        {article.featuredImage
          ? <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: '#e8e8e8' }}>📰</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        {article.category && (
          <span className="font-ui font-bold uppercase tracking-wide" style={{ fontSize: 9, color: '#c0392b' }}>{article.category.name}</span>
        )}
        <h4 className="font-kannada font-semibold text-gray-900 group-hover:text-red-700 transition-colors line-clamp-2" style={{ fontSize: 11, lineHeight: 1.4 }}>
          {article.title}
        </h4>
        <p className="font-ui text-gray-400" style={{ fontSize: 10, marginTop: 2 }}>{timeAgo(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

export default function Article() {
  const params = useParams();
  const slug = params.slug;

  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [readMore, setReadMore] = useState([]);
  const [trending, setTrending] = useState([]);
  const [sidebarCat, setSidebarCat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    window.scrollTo(0, 0);

    fetchArticle(slug)
      .then(async (a) => {
        setArticle(a);

        const [relRes, latestRes, catRes] = await Promise.all([
          a.category ? fetchArticles({ category: a.category.slug, pageSize: 8 }) : Promise.resolve({ articles: [] }),
          fetchArticles({ pageSize: 10 }),
          a.category ? fetchArticles({ category: a.category.slug, pageSize: 6 }) : Promise.resolve({ articles: [] }),
        ]);

        setRelated((relRes.articles || []).filter(r => r.id !== a.id).slice(0, 3));
        setReadMore((latestRes.articles || []).filter(r => r.id !== a.id).slice(0, 4));
        setTrending((latestRes.articles || []).slice(0, 6));
        setSidebarCat((catRes.articles || []).filter(r => r.id !== a.id).slice(0, 4));
      })
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (article && !loading) setTimeout(loadSocialScripts, 300);
  }, [article, loading]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="inline-block w-10 h-10 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
      <p className="mt-4 text-gray-400 font-kannada text-sm">ಲೇಖನ ಲೋಡ್ ಆಗುತ್ತಿದೆ...</p>
    </div>
  );

  if (notFound || !article) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-4">📰</div>
      <h1 className="font-bold text-2xl text-gray-800 mb-3 font-kannada">ಲೇಖನ ಸಿಗಲಿಲ್ಲ</h1>
      <Link to="/" className="text-white px-6 py-2.5 rounded-full font-ui text-sm inline-block" style={{ background: '#c0392b' }}>← ಮುಖಪುಟ</Link>
    </div>
  );

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const categorySlug = article.category?.slug || 'news';
  const publishDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('kn-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const formattedContent = formatContent(article.content);
  const estReadTime = readingTime(article.content);
  const tags = Array.isArray(article.tags) ? article.tags : [];

  const waShare = `https://wa.me/?text=${encodeURIComponent(article.title + '\n' + pageUrl)}`;
  const tgShare = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(article.title)}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  const twShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(pageUrl)}`;

  return (
    <>
      <SeoHead article={article} />
      <ReadingProgress />

      <main className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Main article (3 cols) ── */}
          <article className="lg:col-span-3">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs font-ui text-gray-400 mb-3 flex-wrap">
              <Link to="/" className="hover:text-red-600 transition-colors">ಮುಖಪುಟ</Link>
              {article.category && <><span>›</span>
                <Link to={`/category/${categorySlug}`} className="hover:text-red-600 transition-colors">{article.category.name}</Link>
              </>}
              <span>›</span>
              <span className="text-gray-500 truncate max-w-xs">{article.title}</span>
            </nav>

            {/* Category badge */}
            {article.category && (
              <Link to={`/category/${categorySlug}`}
                className="inline-block text-white text-xs font-ui font-bold uppercase tracking-widest px-3 py-1 rounded mb-3"
                style={{ background: '#c0392b', fontSize: 10 }}>
                {article.category.name}
              </Link>
            )}

            {/* Headline */}
            <h1 className="font-kannada font-bold text-gray-900 mb-2"
              style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', lineHeight: 1.35 }}>
              {article.title}
            </h1>

            {/* Dek */}
            {article.excerpt && (
              <p className="font-kannada text-gray-600 mb-3"
                style={{ fontSize: '1.05rem', lineHeight: 1.7, borderLeft: '3px solid #c0392b', paddingLeft: '0.75rem', fontWeight: 500 }}>
                {article.excerpt}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 py-2.5 border-y border-gray-100 mb-3">
              {article.author && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: '#c0392b' }}>{article.author.name[0]}</div>
                  <span className="font-ui text-sm font-semibold text-gray-700">{article.author.name}</span>
                </div>
              )}
              {publishDate && <><span className="text-gray-200">|</span><span className="font-kannada text-xs text-gray-500">{publishDate}</span></>}
              <span className="text-gray-200">|</span>
              <span className="font-ui text-xs text-gray-400">⏱ {estReadTime}</span>
            </div>

            {/* Share buttons */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-xs font-ui font-semibold text-gray-400 uppercase tracking-wide">Share:</span>
              <ShareBtn label="WhatsApp" href={waShare} bg="#25D366" icon="💬" />
              <ShareBtn label="Telegram" href={tgShare} bg="#0088cc" icon="✈️" />
              <ShareBtn label="Facebook" href={fbShare} bg="#1877F2" icon="f" />
              <ShareBtn label="Twitter" href={twShare} bg="#000" icon="𝕏" />
            </div>

            {/* Featured image */}
            {article.featuredImage && (
              <figure className="mb-4 rounded overflow-hidden">
                <img src={article.featuredImage} alt={article.title}
                  className="w-full object-cover" style={{ maxHeight: 460, minHeight: 200 }}
                  loading="eager" />
              </figure>
            )}

            {/* Body */}
            <div ref={contentRef} className="article-body"
              dangerouslySetInnerHTML={{ __html: formattedContent }} />

            {/* In-article ad */}
            <InArticleAd />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 my-4">
                <span className="text-xs font-ui text-gray-400 uppercase tracking-wide font-semibold self-center">Tags:</span>
                {tags.map(tag => (
                  <span key={tag} className="text-xs font-ui bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Bottom share */}
            <div className="flex items-center justify-between flex-wrap gap-3 py-3 border-t border-b border-gray-100 my-4">
              <span className="font-kannada font-semibold text-gray-700 text-sm">ಈ ಸುದ್ದಿ ಶೇರ್ ಮಾಡಿ</span>
              <div className="flex gap-2 flex-wrap">
                <ShareBtn label="WhatsApp" href={waShare} bg="#25D366" icon="💬" />
                <ShareBtn label="Telegram" href={tgShare} bg="#0088cc" icon="✈️" />
                <ShareBtn label="Facebook" href={fbShare} bg="#1877F2" icon="f" />
              </div>
            </div>

            {/* Author box */}
            {article.author && (
              <div className="bg-white rounded border border-gray-100 flex items-center gap-4 p-4 mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ background: '#c0392b' }}>{article.author.name[0]}</div>
                <div>
                  <p className="font-ui font-bold text-gray-900">{article.author.name}</p>
                  <p className="font-ui text-xs text-gray-400 mt-0.5">ಲೇಖಕರು · KannadaDunia.com</p>
                </div>
              </div>
            )}

            {/* ── Related articles ── */}
            {related.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid #1a1a1a' }}>
                  <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: '#c0392b' }} />
                  <h2 className="font-kannada font-bold text-sm text-gray-900 uppercase tracking-wide">ಸಂಬಂಧಿತ ಸುದ್ದಿ</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {related.map(a => <RelatedCard key={a.id} article={a} />)}
                </div>
              </section>
            )}

            {/* ── Read more ── */}
            {readMore.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid #1a1a1a' }}>
                  <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: '#c0392b' }} />
                  <h2 className="font-kannada font-bold text-sm text-gray-900 uppercase tracking-wide">ಇನ್ನಷ್ಟು ಓದಿ</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {readMore.map(a => <ReadMoreCard key={a.id} article={a} />)}
                </div>
              </section>
            )}
          </article>

          {/* ── Sidebar (1 col) ── */}
          <aside className="lg:col-span-1 space-y-4">

            {/* Sidebar ad — top */}
            <SidebarAd />

            {/* Trending */}
            {trending.length > 0 && (
              <div className="bg-white rounded border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid #c0392b' }}>
                  <span>🔥</span>
                  <h3 className="font-kannada font-bold text-sm text-gray-900">ಟ್ರೆಂಡಿಂಗ್</h3>
                </div>
                {trending.map((a, i) => (
                  <Link key={a.id} to={articleUrl(a)}
                    className="group flex items-start gap-2.5 py-2.5 border-b border-gray-50 last:border-0 block">
                    <span className="font-ui font-bold flex-shrink-0 w-6 text-center leading-none pt-0.5"
                      style={{ fontSize: 18, color: i < 3 ? '#c0392b' : '#d0d0d0' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-kannada font-semibold text-gray-800 group-hover:text-red-700 transition-colors line-clamp-2"
                      style={{ fontSize: 12, lineHeight: 1.45 }}>
                      {a.title}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Same category */}
            {sidebarCat.length > 0 && article.category && (
              <div className="bg-white rounded border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid #1a1a1a' }}>
                  <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: '#c0392b' }} />
                  <h3 className="font-kannada font-bold text-sm text-gray-900">{article.category.name} ಸುದ್ದಿ</h3>
                </div>
                {sidebarCat.map(a => <SidebarCard key={a.id} article={a} />)}
                <Link to={`/category/${categorySlug}`}
                  className="block text-center mt-3 text-xs font-ui font-semibold py-2 rounded border-2 transition-colors hover:text-white"
                  style={{ color: '#c0392b', borderColor: '#c0392b' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#c0392b'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c0392b'; }}>
                  ಎಲ್ಲ ಸುದ್ದಿ →
                </Link>
              </div>
            )}

            {/* Sidebar ad — bottom */}
            <div className="bg-white rounded border border-gray-100 p-2">
              <p className="text-center font-ui uppercase tracking-widest mb-1" style={{ fontSize: 9, color: '#ccc' }}>Advertisement</p>
              <SidebarAd />
            </div>

          </aside>
        </div>
      </main>
    </>
  );
}
