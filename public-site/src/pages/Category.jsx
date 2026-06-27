import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Sidebar from '../components/Sidebar';
import { GridCard, Loading, Err } from '../components/ArticleCards';
import { api } from '../utils/api';

export default function CategoryPage() {
  const { slug } = useParams();
  const [articles, setArticles] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [catName, setCatName] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setPage(1);
    api.getCategories().then(data => {
      const arr = data.categories || [];
      const found = arr.find(c => c.slug === slug);
      if (found) setCatName(found.name);
    }).catch(()=>{});
  }, [slug]);

  useEffect(() => {
    setLoading(true); setErr(false);
    api.getArticlesByCategory(slug, { page, pageSize: 12 })
      .then(data => {
        setArticles(data.articles || []);
        setPagination(data.pagination || {});
      })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [slug, page]);

  const totalPages = pagination.totalPages || 1;

  return (
    <>
      <SiteHeader/>
      <div className="cat-hero"><div className="container"><h1>{catName||slug}</h1><p>{pagination.total||0} ಲೇಖನಗಳು</p></div></div>
      <main className="page-wrap" style={{paddingTop:0}}>
        <div className="container">
          <div className="breadcrumb"><Link to="/">ಮುಖಪುಟ</Link><span>›</span><span>{catName||slug}</span></div>
          <div className="two-col">
            <div>
              {loading && <Loading/>}
              {err && <Err/>}
              {!loading && !err && articles.length === 0 && <div className="err">ಈ ವಿಭಾಗದಲ್ಲಿ ಇನ್ನೂ ಸುದ್ದಿಗಳಿಲ್ಲ.</div>}
              {!loading && !err && <div className="cat-grid">{articles.map(a => <GridCard key={a.id} a={a}/>)}</div>}
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="pg-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
                  {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p=>(
                    <button key={p} className={`pg-btn${p===page?' on':''}`} onClick={()=>setPage(p)}>{p}</button>
                  ))}
                  <button className="pg-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
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
