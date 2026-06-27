import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { SbEntItem, Loading } from './ArticleCards';

function WeatherWidget() {
  return (
    <div className="sw">
      <div className="sw-head">ಹವಾಮಾನ</div>
      <div className="sw-body">
        <div className="weather-city">BENGALURU</div>
        <div className="weather-desc">Overcast Clouds</div>
        <div className="weather-row">
          <span className="weather-icon">☁️</span>
          <span className="weather-temp">20°</span>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [entArticles, setEntArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getArticlesByCategory('entertainment', { pageSize: 4 })
      .then(data => {
        const arr = data.articles || [];
        setEntArticles(arr.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside className="sidebar">
      <div className="sb-ad"><span>Advertisement 300×250</span></div>
      <WeatherWidget />
      <div className="sw">
        <div className="sw-head">ಮನರಂಜನೆ</div>
        <div className="sw-body">
          {loading && <Loading />}
          {!loading && entArticles.map(a => <SbEntItem key={a.id} a={a} />)}
          {!loading && entArticles.length === 0 && <div style={{fontSize:12,color:'#888',textAlign:'center',padding:'10px 0'}}>ಸುದ್ದಿ ಲಭ್ಯವಿಲ್ಲ</div>}
        </div>
      </div>
      <div className="sb-ad sb-ad-tall"><span>Advertisement 300×300</span></div>
    </aside>
  );
}
