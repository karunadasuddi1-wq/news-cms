import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Sidebar from '../components/Sidebar';
import { GridCard, MiniCard, SmallColItem, SecHead, Loading, Err } from '../components/ArticleCards';
import { api, timeAgo } from '../utils/api';

/* ── HERO ── */
function HeroSection({ articles }) {
  if (!articles || articles.length === 0) return null;
  const [main, second, third, fourth] = articles;
  function Cell({ a, spanClass }) {
    if (!a) return null;
    return (
      <Link to={`/article/${a.slug}`} className={`hero-cell ${spanClass||''}`}>
        {a.featuredImage || a.featured_image
          ? <img src={a.featuredImage || a.featured_image} alt={a.title} className="hero-img" loading="eager"/>
          : <div className="hero-img img-placeholder-hero">📰</div>}
        <div className="hero-overlay">
          {a.category && <span className="hero-badge">{a.category.name}</span>}
          <div className="hero-title">{a.title}</div>
          <div className="hero-date">{timeAgo(a.publishedAt||a.published_at||a.createdAt||a.created_at)}</div>
        </div>
      </Link>
    );
  }
  return (
    <div className="hero-grid content-block">
      <Cell a={main}   spanClass="span-rows" />
      <Cell a={second} spanClass="span-rows-mid" />
      <Cell a={third}  />
      <Cell a={fourth} />
    </div>
  );
}

/* ── ರಾಜ್ಯ: big image left + list right ── */
function FeaturedListSection({ title, slug, featuredCount=1, listCount=4 }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getArticlesByCategory(slug, { pageSize: featuredCount + listCount })
      .then(r => setArticles(r.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="content-block"><SecHead title={title} slug={slug}/><Loading/></div>;
  if (articles.length === 0) return null;

  const [featured, ...rest] = articles;
  return (
    <div className="content-block">
      <SecHead title={title} slug={slug}/>
      <div className="rajya-layout">
        <Link to={`/article/${featured.slug}`} className="rajya-featured">
          {featured.featuredImage || featured.featured_image
            ? <img src={featured.featuredImage || featured.featured_image} alt={featured.title} className="rajya-featured-img" loading="lazy"/>
            : <div className="rajya-featured-img img-placeholder-hero">📰</div>}
          <div className="rajya-featured-caption">
            {featured.category && <span className="hero-badge">{featured.category.name}</span>}
            <div className="rajya-featured-title">{featured.title}</div>
            <div className="rajya-featured-meta">{timeAgo(featured.publishedAt||featured.published_at||featured.createdAt||featured.created_at)}</div>
          </div>
        </Link>
        <div className="rajya-list">
          {rest.slice(0, listCount).map(a => (
            <div key={a.id} className="rajya-list-item">
              <Link to={`/article/${a.slug}`}>
                {a.featuredImage || a.featured_image
                  ? <img src={a.featuredImage || a.featured_image} alt={a.title} className="rajya-thumb" loading="lazy"/>
                  : <div className="rajya-thumb img-placeholder-hero" style={{fontSize:16}}>📰</div>}
              </Link>
              <div className="rajya-item-body">
                <Link to={`/article/${a.slug}`} className="rajya-item-title">{a.title}</Link>
                <div className="rajya-item-meta">{timeAgo(a.publishedAt||a.published_at||a.createdAt||a.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 2-col grid section ── */
function GridSection({ title, slug, limit=4 }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getArticlesByCategory(slug, { pageSize: limit })
      .then(r => setArticles(r.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);
  if (loading) return <div className="content-block"><SecHead title={title} slug={slug}/><Loading/></div>;
  if (articles.length === 0) return null;
  return (
    <div className="content-block">
      <SecHead title={title} slug={slug}/>
      <div className="two-card-grid">{articles.slice(0,4).map(a => <GridCard key={a.id} a={a}/>)}</div>
    </div>
  );
}

/* ── List section ── */
function ListSection({ title, slug, limit=5 }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getArticlesByCategory(slug, { pageSize: limit })
      .then(r => setArticles(r.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);
  if (loading) return <div className="content-block"><SecHead title={title} slug={slug}/><Loading/></div>;
  if (articles.length === 0) return null;
  return (
    <div className="content-block">
      <SecHead title={title} slug={slug}/>
      <div className="rajya-list">
        {articles.map(a => (
          <div key={a.id} className="rajya-list-item">
            <Link to={`/article/${a.slug}`}>
              {a.featuredImage || a.featured_image
                ? <img src={a.featuredImage || a.featured_image} alt={a.title} className="rajya-thumb" loading="lazy"/>
                : <div className="rajya-thumb img-placeholder-hero" style={{fontSize:16}}>📰</div>}
            </Link>
            <div className="rajya-item-body">
              <Link to={`/article/${a.slug}`} className="rajya-item-title">{a.title}</Link>
              <div className="rajya-item-meta">{timeAgo(a.publishedAt||a.published_at||a.createdAt||a.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 4-col mini section ── */
function MiniSection({ title, slug, limit=4 }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getArticlesByCategory(slug, { pageSize: limit })
      .then(r => setArticles(r.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);
  if (loading) return <div className="content-block"><SecHead title={title} slug={slug}/><Loading/></div>;
  if (articles.length === 0) return null;
  return (
    <div className="content-block">
      <SecHead title={title} slug={slug}/>
      <div className="four-col">{articles.slice(0,4).map(a => <MiniCard key={a.id} a={a}/>)}</div>
    </div>
  );
}

/* ── Small col (bottom 3-col) ── */
function SmallCol({ title, slug }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getArticlesByCategory(slug, { pageSize: 3 })
      .then(r => setArticles(r.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);
  if (loading || articles.length === 0) return null;
  return (
    <div className="small-col-section">
      <SecHead title={title} slug={slug}/>
      {articles.map(a => <SmallColItem key={a.id} a={a}/>)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function HomePage() {
  const [hero, setHero] = useState([]);
  const [ticker, setTicker] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroErr, setHeroErr] = useState(false);

  useEffect(() => {
    api.getArticles({ pageSize: 10 })
      .then(r => {
        const arr = r.articles || [];
        setHero(arr.slice(0, 4));
        setTicker(arr.slice(0, 8));
      })
      .catch(() => setHeroErr(true))
      .finally(() => setHeroLoading(false));
  }, []);

  return (
    <>
      <SiteHeader tickerArticles={ticker} />
      <main className="page-wrap">
        <div className="container">

          {/* ಕನ್ನಡ ವಿಚಾರ */}
          <div className="kannada-vichara">
            <span className="kv-placeholder">ಕನ್ನಡ ವಿಚಾರ 🎙</span>
          </div>

          {/* Hero */}
          {heroLoading && <div className="content-block"><Loading/></div>}
          {heroErr && <Err/>}
          {!heroLoading && !heroErr && <HeroSection articles={hero}/>}

          {/* Ad */}
          <div className="ad-strip" style={{marginBottom:14}}>
            <div style={{display:'inline-block',background:'#f0f0f0',border:'1px dashed #ccc',padding:'6px 20px',borderRadius:3,fontSize:11,color:'#aaa'}}>— Advertisement —</div>
          </div>

          <div className="two-col">
            <div>
              {/* ರಾಜ್ಯ — big left + list right */}
              <FeaturedListSection title="ರಾಜ್ಯ" slug="state"/>

              {/* ರಾಜಕೀಯ — 2-col grid */}
              <GridSection title="ರಾಜಕೀಯ" slug="politics"/>

              {/* Ad */}
              <div className="ad-strip" style={{marginBottom:14,background:'#f8f8f8',border:'1px solid #eee',borderRadius:3,padding:'10px 0'}}>
                <div style={{display:'inline-block',background:'#f0f0f0',border:'1px dashed #ccc',padding:'6px 20px',borderRadius:3,fontSize:11,color:'#aaa'}}>— Advertisement —</div>
              </div>

              {/* ಅಂತಾರಾಷ್ಟ್ರೀಯ — list */}
              <ListSection title="ಅಂತಾರಾಷ್ಟ್ರೀಯ" slug="international"/>

              {/* ದೇಶ — 2-col grid */}
              <GridSection title="ದೇಶ" slug="national"/>

              {/* ಕರುನಾಡು — list */}
              <ListSection title="ಕರುನಾಡು" slug="karunadu"/>

              {/* ಶ್ರೀಡಾ ಸುದ್ದಿ — 4-col mini */}
              <MiniSection title="ಶ್ರೀಡಾ ಸುದ್ದಿ" slug="sports"/>

              {/* ಮನರಂಜನೆ — 4-col mini */}
              <MiniSection title="ಮನರಂಜನೆ" slug="entertainment"/>

              {/* Bottom 3-col */}
              <div className="three-col-grid">
                <SmallCol title="ವಿಜ್ಞಾನ"    slug="science"/>
                <SmallCol title="ಉದ್ಯೋಗ"     slug="jobs"/>
                <SmallCol title="ಹಣಕಾಸು"     slug="money"/>
              </div>
            </div>
            <Sidebar/>
          </div>

        </div>
      </main>
      <SiteFooter/>
    </>
  );
}
