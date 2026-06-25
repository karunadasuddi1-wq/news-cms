import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchArticles, fetchCategories } from '../api/client';
import { ArticleCardLarge, ArticleCardMedium, ArticleCardSmall } from '../components/ArticleCard';
import BreakingTicker from '../components/BreakingTicker';
import SeoHead from '../components/SeoHead';
import { LeaderboardAd, InFeedAd } from '../components/AdSlot';
import MobileFeed from '../components/MobileFeed';

function articleUrl(article) {
  const cat = article.category?.slug || 'news';
  return `/${cat}/${article.slug}`;
}

const NAV_LABELS = {
  'latest-news': 'ತಾಜಾ ಸುದ್ದಿ',
  'karnataka': 'ಕರ್ನಾಟಕ',
  'india-news': 'ರಾಷ್ಟ್ರೀಯ',
  'sports': 'ಕ್ರೀಡೆ',
  'entertainment': 'ಮನರಂಜನೆ',
  'business': 'ವ್ಯಾಪಾರ',
};

function SectionHeader({ title, catSlug }) {
  return (
    <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '2px solid #1a1a1a' }}>
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: '#c0392b' }} />
        <h2 className="font-kannada font-bold text-base text-gray-900 uppercase tracking-wide">{title}</h2>
      </div>
      {catSlug && (
        <Link to={`/category/${catSlug}`}
          className="text-xs font-ui font-semibold transition-colors hover:underline"
          style={{ color: '#c0392b' }}>
          ಎಲ್ಲ ನೋಡಿ →
        </Link>
      )}
    </div>
  );
}

function TrendingBox({ articles }) {
  if (!articles.length) return null;
  return (
    <div className="bg-white rounded border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '2px solid #c0392b' }}>
        <span className="text-base">🔥</span>
        <h3 className="font-kannada font-bold text-sm text-gray-900">ಟ್ರೆಂಡಿಂಗ್</h3>
      </div>
      {articles.slice(0, 7).map((a, i) => (
        <Link key={a.id} to={articleUrl(a)}
          className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 group">
          <span className="font-ui font-bold text-xl leading-none flex-shrink-0 w-6 text-center"
            style={{ color: i < 3 ? '#c0392b' : '#d0d0d0' }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="text-sm font-kannada font-medium text-gray-800 leading-snug group-hover:text-red-700 transition-colors line-clamp-2">
            {a.title}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [latest, setLatest] = useState([]);
  const [breaking, setBreaking] = useState([]);
  const [categoryData, setCategoryData] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileCat, setMobileCat] = useState('');
  const [mobileArticles, setMobileArticles] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const SECTION_CATS = ['karnataka', 'sports', 'entertainment', 'business'];

  useEffect(() => {
    async function load() {
      try {
        const params = searchQuery ? { search: searchQuery, pageSize: 20 } : { pageSize: 20 };
        const [articlesRes, cats] = await Promise.all([
          fetchArticles(params),
          searchQuery ? Promise.resolve([]) : fetchCategories(),
        ]);
        setLatest(articlesRes.articles || []);
        setMobileArticles(articlesRes.articles || []);
        setBreaking((articlesRes.articles || []).slice(0, 10));

        if (!searchQuery && cats.length) {
          setCategories(cats);
          const sectionCats = cats.filter(c => SECTION_CATS.includes(c.slug));
          const catResults = await Promise.all(
            sectionCats.map(c => fetchArticles({ category: c.slug, pageSize: 6 }))
          );
          const data = {};
          sectionCats.forEach((c, i) => { data[c.slug] = catResults[i].articles || []; });
          setCategoryData(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchQuery]);

  async function handleMobileCatChange(slug) {
    setMobileCat(slug);
    try {
      const params = slug ? { category: slug, pageSize: 30 } : { pageSize: 30 };
      const res = await fetchArticles(params);
      setMobileArticles(res.articles || []);
    } catch(e) {}
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hero = latest[0];
  const heroSide = latest.slice(1, 4);
  const latestGrid = latest.slice(4, 10);
  const trending = latest.slice(0, 7);

  return (
    <>
      <SeoHead />
      <BreakingTicker articles={breaking} />

      {/* Leaderboard ad — below breaking ticker, above content */}
      {/* Mobile — DailyHunt style feed */}
      {isMobile && (
        <MobileFeed
          articles={mobileArticles}
          categories={categories}
          activeCategory={mobileCat}
          onCategoryChange={handleMobileCatChange}
        />
      )}

      {/* Desktop layout */}
      {!isMobile && <LeaderboardAd />}
      {!isMobile && <main className="max-w-7xl mx-auto px-4 py-5">

        {/* Search results */}
        {searchQuery && (
          <div className="mb-6">
            <h1 className="font-kannada font-bold text-xl text-gray-900 mb-1">
              "{searchQuery}" ಗಾಗಿ ಫಲಿತಾಂಶಗಳು
            </h1>
            <p className="text-sm text-gray-400 font-ui">{latest.length} articles found</p>
          </div>
        )}

        {latest.length === 0 && (
          <div className="text-center py-20 text-gray-400 font-kannada text-lg">ಯಾವುದೇ ಸುದ್ದಿ ಲಭ್ಯವಿಲ್ಲ</div>
        )}

        {/* Hero + Trending sidebar */}
        {hero && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
            {/* Left: hero + side stack */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Big hero */}
                <div className="lg:col-span-2">
                  <ArticleCardLarge article={hero} />
                </div>
                {/* Side 3 */}
                <div className="flex flex-col divide-y divide-gray-100 bg-white rounded border border-gray-100 px-3">
                  {heroSide.map(a => (
                    <div key={a.id} className="py-3 first:pt-3">
                      <ArticleCardMedium article={a} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest news grid */}
              {latestGrid.length > 0 && (
                <div>
                  <SectionHeader title="ತಾಜಾ ಸುದ್ದಿ" catSlug="latest-news" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {latestGrid.map(a => <ArticleCardLarge key={a.id} article={a} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Trending */}
            <div className="lg:col-span-1">
              <TrendingBox articles={trending} />
            </div>
          </div>
        )}

        {/* In-feed ad — between hero and category sections */}
        {!searchQuery && <InFeedAd />}

        {/* Category sections */}
        {!searchQuery && SECTION_CATS.map((slug, idx) => {
          const arts = categoryData[slug] || [];
          if (!arts.length) return null;
          const cat = categories.find(c => c.slug === slug);
          const label = NAV_LABELS[slug] || cat?.name || slug;
          const catHero = arts[0];
          const catRest = arts.slice(1, 4);
          const catList = arts.slice(1, 6);

          return (
            <div key={slug}>
              <section className="mb-8">
                <SectionHeader title={label} catSlug={slug} />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <ArticleCardLarge article={catHero} />
                  </div>
                  <div className="lg:col-span-1 flex flex-col divide-y divide-gray-50 bg-white rounded border border-gray-100 px-3">
                    {catRest.map(a => (
                      <div key={a.id} className="py-2.5 first:pt-2.5">
                        <ArticleCardSmall article={a} />
                      </div>
                    ))}
                  </div>
                  <div className="lg:col-span-1 flex flex-col divide-y divide-gray-50 bg-white rounded border border-gray-100 px-3">
                    {catList.map(a => (
                      <div key={a.id} className="py-2.5 first:pt-2.5">
                        <ArticleCardSmall article={a} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* In-feed ad after every 2nd category section */}
              {idx === 1 && <InFeedAd />}
            </div>
          );
        })}
      </main>}
    </>
  );
}
