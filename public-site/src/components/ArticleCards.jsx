import { Link } from 'react-router-dom';
import { timeAgo } from '../utils/api';

// API returns featuredImage (camelCase)
function getImg(a) { return a.featuredImage || a.featured_image || ''; }
function getCat(a) { return a.category || null; }
function getDate(a) { return a.publishedAt || a.published_at || a.createdAt || a.created_at || ''; }

export function Loading() {
  return <div className="spinner-wrap"><div className="spin"/><span>ಲೋಡ್ ಆಗುತ್ತಿದೆ...</span></div>;
}
export function Err({ msg='ಸುದ್ದಿ ಲೋಡ್ ಆಗಲಿಲ್ಲ.' }) {
  return <div className="err">{msg}</div>;
}
export function SecHead({ title, slug }) {
  return (
    <div className="sec-head">
      <h2 className="sec-title">{title}</h2>
      <div style={{display:'flex',gap:10}}>
        {slug && <Link to={`/category/${slug}`} className="sec-more">ಇನ್ನಷ್ಟು »</Link>}
      </div>
    </div>
  );
}

export function GridCard({ a }) {
  const img = getImg(a); const cat = getCat(a);
  return (
    <div className="grid-card">
      <Link to={`/article/${a.slug}`}>
        {img ? <img src={img} alt={a.title} className="grid-card-img" loading="lazy"/> : <div className="grid-card-img img-placeholder-hero">📰</div>}
      </Link>
      <div className="grid-card-body">
        {cat && <div className="grid-card-cat"><Link to={`/category/${cat.slug}`}>{cat.name}</Link></div>}
        <Link to={`/article/${a.slug}`} className="grid-card-title">{a.title}</Link>
        <div className="grid-card-date">{timeAgo(getDate(a))}</div>
      </div>
    </div>
  );
}

export function MiniCard({ a }) {
  const img = getImg(a); const cat = getCat(a);
  return (
    <div className="mini-card">
      <Link to={`/article/${a.slug}`}>
        {img ? <img src={img} alt={a.title} className="mini-card-img" loading="lazy"/> : <div className="mini-card-img img-placeholder-hero">📰</div>}
      </Link>
      <div className="mini-card-body">
        {cat && <div className="mini-card-cat">{cat.name}</div>}
        <Link to={`/article/${a.slug}`} className="mini-card-title">{a.title}</Link>
        <div className="mini-card-date">{timeAgo(getDate(a))}</div>
      </div>
    </div>
  );
}

export function SbEntItem({ a }) {
  const img = getImg(a);
  return (
    <div className="sb-ent-item">
      <Link to={`/article/${a.slug}`}>
        {img ? <img src={img} alt={a.title} className="sb-ent-img" loading="lazy"/> : <div className="sb-ent-img img-placeholder-hero">📰</div>}
      </Link>
      <div>
        <Link to={`/article/${a.slug}`} className="sb-ent-title">{a.title}</Link>
        <div className="sb-ent-date">{timeAgo(getDate(a))}</div>
      </div>
    </div>
  );
}

export function SmallColItem({ a }) {
  const img = getImg(a);
  return (
    <div className="small-col-item">
      <Link to={`/article/${a.slug}`}>
        {img ? <img src={img} alt={a.title} className="small-col-img" loading="lazy"/> : <div className="small-col-img img-placeholder-hero" style={{fontSize:16}}>📰</div>}
      </Link>
      <div>
        <Link to={`/article/${a.slug}`} className="small-col-title">{a.title}</Link>
        <div className="small-col-date">{timeAgo(getDate(a))}</div>
      </div>
    </div>
  );
}
