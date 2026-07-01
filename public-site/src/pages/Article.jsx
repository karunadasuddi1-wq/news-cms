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

                  {author && (author.bio || author.avatar) && (
                    <div className="author-bio-box" style={{display:'flex',alignItems:'flex-start',gap:16,background:'#f9f6f1',border:'1px solid #e8e2d9',borderRadius:8,padding:'16px 20px',margin:'24px 0'}}>
                      {author.avatar && (
                        <img src={author.avatar} alt={author.name} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'2px solid #e8e2d9'}}/>
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                          <span style={{fontWeight:700,fontSize:15,color:'#1a1a1a'}}>{author.name}</span>
                          {author.role && <span style={{fontSize:11,fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'0.1em',color:'#888',background:'#eee',padding:'2px 8px',borderRadius:3}}>{author.role}</span>}
                        </div>
                        {author.bio && <p style={{fontSize:13,color:'#555',lineHeight:1.6,margin:0}}>{author.bio}</p>}
                        {author.socialLinks && (
                          <div style={{display:'flex',gap:12,marginTop:8}}>
                            {author.socialLinks.twitter && <a href={author.socialLinks.twitter} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#c0392b',textDecoration:'none'}}>𝕏 Twitter</a>}
                            {author.socialLinks.instagram && <a href={author.socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#c0392b',textDecoration:'none'}}>📸 Instagram</a>}
                            {author.socialLinks.facebook && <a href={author.socialLinks.facebook} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#c0392b',textDecoration:'none'}}>👍 Facebook</a>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
