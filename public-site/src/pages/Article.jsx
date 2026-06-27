import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Sidebar from '../components/Sidebar';
import { Loading, Err } from '../components/ArticleCards';
import { api, formatDate, timeAgo } from '../utils/api';

function RelatedItem({ a }) {
  const img = a.featuredImage || a.featured_image;
  return (
    <div className="rajya-list-item">
      <Link to={`/article/${a.slug}`}>
        {img ? <img src={img} alt={a.title} className="rajya-thumb" loading="lazy"/> : <div className="rajya-thumb img-placeholder-hero" style={{fontSize:18}}>📰</div>}
      </Link>
      <div className="rajya-item-body">
        <Link to={`/article/${a.slug}`} className="rajya-item-title">{a.title}</Link>
        <div className="rajya-item-meta">{timeAgo(a.published_at||a.created_at)}</div>
      </div>
    </div>
  );
}

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setLoading(true); setErr(false);
    api.getArticle(slug)
      .then(data => {
        const a = data.article || data;
        setArticle(a);
        if (a.category?.slug) {
          api.getArticlesByCategory(a.category.slug, { pageSize: 5 })
            .then(res => {
              const arr = res.articles || [];
              setRelated(arr.filter(r => r.slug !== slug).slice(0, 4));
            }).catch(()=>{});
        }
      })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const img = article?.featuredImage || article?.featured_image;
  const cat = article?.category;
  const author = article?.author;

  return (
    <>
      <SiteHeader/>
      <main className="page-wrap">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">ಮುಖಪುಟ</Link> <span>›</span>
            {cat && <><Link to={`/category/${cat.slug}`}>{cat.name}</Link><span>›</span></>}
            <span style={{color:'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:300}}>{article?.title}</span>
          </div>
          <div className="two-col">
            <div>
              {loading && <Loading/>}
              {err && <Err msg="ಲೇಖನ ಲೋಡ್ ಆಗಲಿಲ್ಲ."/>}
              {!loading && !err && article && (
                <div className="art-wrap">
                  <div className="art-head">
                    {cat && <div className="art-cat"><Link to={`/category/${cat.slug}`}>{cat.name}</Link></div>}
                    <h1 className="art-title">{article.title}</h1>
                    <div className="art-meta">
                      {author?.name && <span>✍ {author.name}</span>}
                      <span>📅 {formatDate(article.publishedAt||article.published_at||article.createdAt||article.created_at)}</span>
                    </div>
                  </div>
                  {img && <img src={img} alt={article.title} className="art-hero-img"/>}
                  <div className="art-body" dangerouslySetInnerHTML={{__html: article.content||''}}/>
                  <div className="ad-strip" style={{padding:'12px 20px'}}>
                    <div style={{display:'inline-block',background:'#f0f0f0',border:'1px dashed #ccc',padding:'6px 20px',borderRadius:3,fontSize:11,color:'#aaa'}}>Advertisement</div>
                  </div>
                </div>
              )}
              {related.length > 0 && (
                <div className="content-block" style={{marginTop:18}}>
                  <div className="sec-head"><h2 className="sec-title">ಸಂಬಂಧಿತ ಸುದ್ದಿ</h2></div>
                  <div className="rajya-list">{related.map(a => <RelatedItem key={a.id} a={a}/>)}</div>
                </div>
              )}
            </div>
            <Sidebar/>
          </div>
        </div>
      </main>
      <SiteFooter/>
    </>
  );
}
