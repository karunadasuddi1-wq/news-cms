import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Sidebar from '../components/Sidebar';
import { GridCard, MiniCard, SmallColItem, SecHead, Loading, Err } from '../components/ArticleCards';
import { api, timeAgo } from '../utils/api';

function HeroSection({ articles }) {
  if (!articles || articles.length === 0) return null;
  const [main, second, ...rest] = articles;
  function HeroCell({ a, spanClass }) {
    const img = a?.featured_image;
    return (
      <Link to={`/article/${a.slug}`} className={`hero-cell ${spanClass||''}`}>
        {img ? <img src={img} alt={a.title} className="hero-img" loading="eager"/> : <div className="hero-img img-placeholder-hero">📰</div>}
        <div className="hero-overlay">
          {a.category && <span className="hero-badge">{a.category.name}</span>}
          <div className="hero-title">{a.title}</div>
          <div className="hero-date">{timeAgo(a.published_at||a.created_at)}</div>
        </div>
      </Link>
    );
  }
  return (
    <div className="hero-grid content-block">
      {main && <HeroCell a={main} spanClass="span-rows" />}
      {second && <HeroCell a={second} spanClass="span-rows-mid" />}
      {rest[0] && <HeroCell a={rest[0]} />}
      {rest[1] && <HeroCell a={rest[1]} />}
    </div>
  );
}

function RajyaSection({ articles }) {
  if (!articles || articles.length === 0) return null;
  const [featured, ...listItems] = articles;
  const featImg = featured.featured_image;
  return (
    <div className="content-block">
      <SecHead title="ರಾಜ್ಯ" slug="rajya" />
      <div className="rajya-layout">
        <Link to={`/article/${featured.slug}`} className="rajya-featured">
          {featImg ? <img src={featImg} alt={featured.title} className="rajya-featured-img" loading="lazy"/> : <div className="rajya-featured-img img-placeholder-hero">📰</div>}
          <div className="rajya-featured-caption">
            {featured.category && <span className="hero-badge">{featured.category.name}</span>}
            <div className="rajya-featured-title">{featured.title}</div>
            <div className="rajya-featured-meta">{timeAgo(featured.published_at||featured.created_at)}</div>
          </div>
        </Link>
        <div className="rajya-list">
          {listItems.slice(0,4).map(a => {
            const img = a.featured_image;
            return (
              <div key={a.id} className="rajya-list-item">
                <Link to={`/article/${a.slug}`}>
                  {img ? <img src={img} alt={a.title} className="rajya-thumb" loading="lazy"/> : <div className="rajya-thumb img-placeholder-hero" style={{fontSize:18}}>📰</div>}
                </Link>
                <div className="rajya-item-body">
                  <Link to={`/article/${a.slug}`} className="rajya-item-title">{a.title}</Link>
                  <div className="rajya-item-meta">{timeAgo(a.published_at||a.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function useCatArticles(slug, limit=5) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.getArticlesByCategory(slug, { pageSize: limit })
      .then(res => setData(res.articles || []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [slug]);
  return { data, loading, err };
}

function GridSection({ title, slug, limit=4 }) {
  const { data, loading, err } = useCatArticles(slug, limit);
  if (loading) return <div className="content-block"><SecHead title={title} slug={slug}/><Loading/></div>;
  if (err || data.length === 0) return null;
  return (
    <div className="content-block">
      <SecHead title={title} slug={slug}/>
      <div className="two-card-grid">{data.slice(0,4).map(a => <GridCard key={a.id} a={a}/>)}</div>
    </div>
  );
}

function ListSection({ title, slug, limit=5 }) {
  const { data, loading, err } = useCatArticles(slug, limit);
  if (loading) return <div className="content-block"><SecHead title={title} slug={slug}/><Loading/></div>;
  if (err || data.length === 0) return null;
  return (
    <div className="content-block">
      <SecHead title={title} slug={slug}/>
      <div className="rajya-list">
        {data.map(a => {
          const img = a.featured_image;
          return (
            <div key={a.id} className="rajya-list-item">
              <Link to={`/article/${a.slug}`}>
                {img ? <img src={img} alt={a.title} className="rajya-thumb" loading="lazy"/> : <div className="rajya-thumb img-placeholder-hero" style={{fontSize:18}}>📰</div>}
              </Link>
              <div className="rajya-item-body">
                <Link to={`/article/${a.slug}`} className="rajya-item-title">{a.title}</Link>
                <div className="rajya-item-meta">{timeAgo(a.published_at||a.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniSection({ title, slug, limit=4 }) {
  const { data, loading, err } = useCatArticles(slug, limit);
  if (loading) return <div className="content-block"><SecHead title={title} slug={slug}/><Loading/></div>;
  if (err || data.length === 0) return null;
  return (
    <div className="content-block">
      <SecHead title={title} slug={slug}/>
      <div className="four-col">{data.slice(0,4).map(a => <MiniCard key={a.id} a={a}/>)}</div>
    </div>
  );
}

function SmallCol({ title, slug }) {
  const { data, loading } = useCatArticles(slug, 3);
  if (loading || data.length === 0) return null;
  return (
    <div className="small-col-section">
      <SecHead title={title} slug={slug}/>
      {data.map(a => <SmallColItem key={a.id} a={a}/>)}
    </div>
  );
}

export default function HomePage() {
  const [hero, setHero] = useState([]);
  const [ticker, setTicker] = useState([]);
  const [rajya, setRajya] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroErr, setHeroErr] = useState(false);

  useEffect(() => {
    api.getArticles({ pageSize: 10 })
      .then(res => {
        const arr = res.articles || [];
        setHero(arr.slice(0,4));
        setTicker(arr.slice(0,8));
      })
      .catch(() => setHeroErr(true))
      .finally(() => setHeroLoading(false));

    api.getArticlesByCategory('rajya', { pageSize: 5 })
      .then(res => setRajya(res.articles || []))
      .catch(() => {});
  }, []);

  return (
    <>
      <SiteHeader tickerArticles={ticker} />
      <main className="page-wrap">
        <div className="container">
          <div className="kannada-vichara">
            <span className="kv-placeholder">ಕನ್ನಡ ವಿಚಾರ 🎙</span>
          </div>
          {heroLoading && <div className="content-block"><Loading/></div>}
          {heroErr && <Err/>}
          {!heroLoading && !heroErr && <HeroSection articles={hero}/>}
          <div className="ad-strip" style={{marginBottom:14}}>
            <div style={{display:'inline-block',background:'#f0f0f0',border:'1px dashed #ccc',padding:'6px 20px',borderRadius:3,fontSize:11,color:'#aaa'}}>— Advertisement —</div>
          </div>
          <div className="two-col">
            <div>
              {rajya.length > 0 && <RajyaSection articles={rajya}/>}
              <GridSection title="ರಾಜಕೀಯ" slug="rajakeeyata"/>
              <div className="ad-strip" style={{marginBottom:14,background:'#f8f8f8',border:'1px solid #eee',borderRadius:3,padding:'10px 0'}}>
                <div style={{display:'inline-block',background:'#f0f0f0',border:'1px dashed #ccc',padding:'6px 20px',borderRadius:3,fontSize:11,color:'#aaa'}}>— Advertisement —</div>
              </div>
              <ListSection title="ಅಂತರಾಷ್ಟ್ರೀಯ" slug="antarashetriya"/>
              <GridSection title="ದೇಶ" slug="desh"/>
              <MiniSection title="ಶ್ರೀಡಾ ಸುದ್ದಿ" slug="sports"/>
              <div className="three-col-grid">
                <SmallCol title="ವಿಜ್ಞಾನ" slug="science"/>
                <SmallCol title="ಉದ್ಯೋಗ" slug="employment"/>
                <SmallCol title="ಹಣಕಾಸು" slug="finance"/>
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
