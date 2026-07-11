import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

function KpiCard({ label, value, sub, color, breakdown }) {
  return (
    <div className="bg-white border border-paper-200 rounded-lg p-4">
      <p className="text-xs font-mono uppercase tracking-wide text-ink-500 mb-1">{label}</p>
      <p className="text-3xl font-display font-bold" style={{ color: color || '#16151a' }}>{value ?? '—'}</p>
      {breakdown && <p className="text-[11px] text-ink-400 font-mono mt-1">{breakdown}</p>}
      {sub && !breakdown && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, maxViews, maxArticles }) {
  if (!data || !data.length) return null;
  const max = Math.max(maxViews, 1);
  return (
    <div className="bg-white border border-paper-200 rounded-lg p-5 mb-6">
      <p className="text-xs font-mono uppercase tracking-wide text-ink-500 mb-4">Daily Activity</p>
      <div className="flex items-end gap-0.5 h-36 overflow-x-auto pb-2">
        {data.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-0.5 flex-1 min-w-4 group relative">
            <div className="absolute bottom-full mb-1 bg-ink-900 text-white text-xs rounded px-1.5 py-1 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              {d.date}: {d.articles} articles, {d.views} views
            </div>
            <div className="w-full rounded-t" style={{ height: `${Math.round((d.views / max) * 100)}%`, minHeight: d.views > 0 ? 2 : 0, background: '#b23a2e', opacity: 0.85 }} />
            <div className="w-full rounded-t" style={{ height: `${Math.round((d.articles / Math.max(maxArticles, 1)) * 30)}%`, minHeight: d.articles > 0 ? 2 : 0, background: '#16151a' }} />
            {data.length <= 14 && (
              <span className="text-ink-400 font-mono" style={{ fontSize: 9 }}>{d.date.slice(5)}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded" style={{ background: '#b23a2e' }} /><span className="text-xs font-mono text-ink-400">Views</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded bg-ink-900" /><span className="text-xs font-mono text-ink-400">Articles</span></div>
      </div>
    </div>
  );
}

function fmtViews(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function fmtHours(h) {
  if (h === null || h === undefined) return '—';
  if (h < 1) return Math.round(h * 60) + 'm';
  if (h < 24) return h + 'h';
  return (h / 24).toFixed(1) + 'd';
}

export default function Analytics() {
  const { user, can } = useAuth();
  const [preset, setPreset] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [authors, setAuthors] = useState([]);
  const [tab, setTab] = useState('articles');
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [arts, setArts] = useState([]);
  const [artPage, setArtPage] = useState(1);
  const [artPagination, setArtPagination] = useState({});
  const [artSort, setArtSort] = useState('views');
  const [authorStats, setAuthorStats] = useState([]);
  const [catStats, setCatStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ga4Syncing, setGa4Syncing] = useState(false);
  const [ga4Message, setGa4Message] = useState('');

  async function handleGa4Sync() {
    setGa4Syncing(true);
    setGa4Message('');
    try {
      const res = await client.post('/analytics/sync-ga4');
      setGa4Message(res.data.message);
    } catch (err) {
      setGa4Message(apiErrorMessage(err));
    } finally {
      setGa4Syncing(false);
    }
  }

  const params = useCallback(() => {
    const p = preset === 'custom' ? { from, to } : { range: preset };
    if (authorFilter) p.authorId = authorFilter;
    return p;
  }, [preset, from, to, authorFilter]);

  useEffect(() => {
    if (can.manageAny) {
      client.get('/users').then(r => setAuthors(r.data.users)).catch(() => {});
    }
  }, [can.manageAny]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const p = params();
    Promise.all([
      client.get('/analytics/overview', { params: p }),
      client.get('/analytics/daily', { params: p }),
    ]).then(([ov, dv]) => {
      setOverview(ov.data);
      setDaily(dv.data.daily || []);
    }).catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const p = params();
    if (tab === 'articles') {
      client.get('/analytics/articles', { params: { ...p, sort: artSort, page: artPage, pageSize: 25 } })
        .then(r => { setArts(r.data.articles || []); setArtPagination(r.data.pagination || {}); })
        .catch(() => {});
    }
    if (tab === 'authors' && can.manageAny) {
      client.get('/analytics/authors', { params: p }).then(r => setAuthorStats(r.data.authors || [])).catch(() => {});
    }
    if (tab === 'categories') {
      client.get('/analytics/categories', { params: p }).then(r => setCatStats(r.data.categories || [])).catch(() => {});
    }
  }, [tab, params, artSort, artPage, can.manageAny]);

  const maxViews = Math.max(...daily.map(d => d.views || 0), 1);
  const maxArticles = Math.max(...daily.map(d => d.articles || 0), 1);

  const tabCls = t =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-press-red text-press-red' : 'border-transparent text-ink-500 hover:text-ink-900'}`;

  const hasSplit = overview && ((overview.totalDirectViews || 0) > 0 || (overview.totalDailyhuntViews || 0) > 0);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6 pb-6 border-b-2 border-ink-900">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-400 mb-1">Newsroom</p>
        <h1 className="font-display font-bold text-3xl text-ink-900">Analytics</h1>
        {overview && (
          <p className="text-xs text-ink-400 font-mono mt-1">
            {new Date(overview.range.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' – '}
            {new Date(overview.range.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PRESETS.map(p => (
          <button key={p.value} onClick={() => setPreset(p.value)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors border ${preset === p.value ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-600 border-paper-200 hover:border-ink-900'}`}>
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-xs border border-paper-200 rounded px-2 py-1.5 font-mono focus:outline-none focus:border-press-red" />
            <span className="text-xs text-ink-400">to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-xs border border-paper-200 rounded px-2 py-1.5 font-mono focus:outline-none focus:border-press-red" />
          </>
        )}
        {can.manageAny && (
          <select value={authorFilter} onChange={e => setAuthorFilter(e.target.value)}
            className="text-xs border border-paper-200 rounded px-2 py-1.5 font-mono focus:outline-none focus:border-press-red bg-white ml-2">
            <option value="">All authors</option>
            {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={handleGa4Sync}
            disabled={ga4Syncing}
            className="text-xs font-medium px-3 py-1.5 rounded border border-ink-300 text-ink-700 hover:bg-ink-50 disabled:opacity-60 ml-2"
            title="Pull real pageview counts from Google Analytics (requires setup in Settings)"
          >
            {ga4Syncing ? 'Syncing…' : '🔄 Sync views from Google Analytics'}
          </button>
        )}
      </div>

      {ga4Message && (
        <div className="text-xs text-ink-600 bg-paper-50 border border-paper-200 rounded px-3 py-2 mb-4">{ga4Message}</div>
      )}

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded mb-4">{error}</div>}
      {loading && <div className="text-center py-12 text-ink-400 font-mono text-sm">Loading…</div>}

      {!loading && overview && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <KpiCard label="Published" value={overview.totalPublished} sub="in range" />
            <KpiCard
              label="Total Views"
              value={fmtViews(overview.totalViews)}
              sub="in range"
              color="#2e6f6b"
              breakdown={hasSplit ? `D: ${fmtViews(overview.totalDirectViews)} · DH: ${fmtViews(overview.totalDailyhuntViews)}` : null}
            />
            <KpiCard label="Avg Views" value={fmtViews(overview.avgViewsPerArticle)} sub="per article" />
            <KpiCard label="In Review" value={overview.totalPendingReview} sub="waiting" color="#c98a2c" />
            <KpiCard label="Drafts" value={overview.totalDraft} sub="in progress" />
            <KpiCard label="Avg to Publish" value={fmtHours(overview.avgTimeToPublishHours)} sub="draft → live" color="#b23a2e" />
          </div>

          {/* All-time strip */}
          {can.manageAny && (
            <div className="flex flex-wrap gap-4 bg-ink-900 text-white rounded-lg px-5 py-3 mb-4 text-sm">
              <div><span className="font-mono text-ink-400 text-xs uppercase tracking-wide">All-time published </span><span className="font-bold ml-1">{overview.allTimePublished}</span></div>
              <div className="border-l border-ink-700" />
              <div><span className="font-mono text-ink-400 text-xs uppercase tracking-wide">All-time views </span><span className="font-bold ml-1">{fmtViews(overview.allTimeViews)}</span></div>
              {overview.topArticle && (
                <>
                  <div className="border-l border-ink-700" />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-ink-400 text-xs uppercase tracking-wide flex-shrink-0">Top </span>
                    <Link to={`/articles/${overview.topArticle.id}`} className="font-medium hover:text-wire-teal transition-colors truncate max-w-xs">
                      {overview.topArticle.title}
                    </Link>
                    <span className="text-ink-400 text-xs flex-shrink-0">{fmtViews(overview.topArticle.views)} views</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bar chart */}
          <BarChart data={daily} maxViews={maxViews} maxArticles={maxArticles} />

          {/* Tabs */}
          <div className="border-b border-paper-200 mb-6 flex gap-1">
            <button className={tabCls('articles')} onClick={() => setTab('articles')}>Articles</button>
            {can.manageAny && <button className={tabCls('authors')} onClick={() => setTab('authors')}>Authors</button>}
            <button className={tabCls('categories')} onClick={() => setTab('categories')}>Categories</button>
          </div>

          {/* Articles tab */}
          {tab === 'articles' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-ink-400 font-mono">{artPagination.total || 0} articles</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-500 font-mono">Sort:</span>
                  {['views', 'publishedAt', 'title'].map(s => (
                    <button key={s} onClick={() => { setArtSort(s); setArtPage(1); }}
                      className={`text-xs px-2 py-1 rounded font-mono border transition-colors ${artSort === s ? 'bg-ink-900 text-white border-ink-900' : 'border-paper-200 text-ink-600 hover:border-ink-900'}`}>
                      {s === 'publishedAt' ? 'Date' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-paper-50 border-b border-paper-200 text-xs font-mono uppercase tracking-wide text-ink-500">
                  <div className="col-span-4">Headline</div>
                  <div className="col-span-2">Author</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2 text-right">Views</div>
                  <div className="col-span-2 text-right">Published</div>
                </div>
                {arts.map(a => (
                  <div key={a.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-paper-50 last:border-0 hover:bg-paper-50 transition-colors text-sm items-center">
                    <div className="col-span-4 min-w-0">
                      <Link to={`/articles/${a.id}`} className="font-medium text-ink-900 hover:text-press-red transition-colors line-clamp-1">{a.title}</Link>
                    </div>
                    <div className="col-span-2 text-ink-500 text-xs truncate">{a.author?.name || '—'}</div>
                    <div className="col-span-2 text-ink-500 text-xs truncate">{a.category?.name || '—'}</div>
                    <div className="col-span-2 text-right">
                      <div className="font-mono font-bold text-xs" style={{ color: '#2e6f6b' }}>{fmtViews(a.views || 0)}</div>
                      {(a.directViews > 0 || a.dailyhuntViews > 0) && (
                        <div className="text-[10px] text-ink-400 font-mono mt-0.5">
                          D: {fmtViews(a.directViews || 0)} · DH: {fmtViews(a.dailyhuntViews || 0)}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right text-xs text-ink-400 font-mono">
                      {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                  </div>
                ))}
                {arts.length === 0 && <div className="text-center py-12 text-ink-400 text-sm">No articles in this range</div>}
                {arts.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-paper-50 border-t-2 border-ink-900 items-center">
                    <div className="col-span-8 text-xs font-mono uppercase tracking-wide text-ink-500 font-semibold">
                      Total {hasSplit ? '(all matching articles, not just this page)' : ''}
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="font-mono font-bold text-sm" style={{ color: '#2e6f6b' }}>{fmtViews(overview.totalViews)}</div>
                      {hasSplit && (
                        <div className="text-[10px] text-ink-400 font-mono mt-0.5">
                          D: {fmtViews(overview.totalDirectViews)} · DH: {fmtViews(overview.totalDailyhuntViews)}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2" />
                  </div>
                )}
              </div>
              {artPagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => setArtPage(p => Math.max(1, p - 1))} disabled={artPage === 1}
                    className="px-3 py-1.5 text-xs border border-paper-200 rounded disabled:opacity-40 hover:border-press-red transition-colors font-mono">← Prev</button>
                  <span className="px-3 py-1.5 text-xs font-mono text-ink-500">{artPage} / {artPagination.totalPages}</span>
                  <button onClick={() => setArtPage(p => Math.min(artPagination.totalPages, p + 1))} disabled={artPage === artPagination.totalPages}
                    className="px-3 py-1.5 text-xs border border-paper-200 rounded disabled:opacity-40 hover:border-press-red transition-colors font-mono">Next →</button>
                </div>
              )}
            </div>
          )}

          {/* Authors tab */}
          {tab === 'authors' && can.manageAny && (
            <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-paper-50 border-b border-paper-200 text-xs font-mono uppercase tracking-wide text-ink-500">
                <div className="col-span-3">Author</div>
                <div className="col-span-1 text-center">Published</div>
                <div className="col-span-1 text-center">Drafts</div>
                <div className="col-span-1 text-center">Review</div>
                <div className="col-span-2 text-right">Views</div>
                <div className="col-span-2 text-right">Avg Views</div>
                <div className="col-span-2 text-right">Avg to Publish</div>
              </div>
              {authorStats.map((s, i) => (
                <div key={s.author.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-paper-50 last:border-0 hover:bg-paper-50 transition-colors text-sm items-center">
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="text-xs font-mono text-ink-400 w-4">{i + 1}</span>
                    <div>
                      <p className="font-medium text-ink-900 text-sm">{s.author.name}</p>
                      <p className="text-xs text-ink-400 font-mono">{s.author.role}</p>
                    </div>
                  </div>
                  <div className="col-span-1 text-center font-mono font-bold text-ink-900">{s.published}</div>
                  <div className="col-span-1 text-center font-mono text-ink-400">{s.drafts}</div>
                  <div className="col-span-1 text-center font-mono" style={{ color: '#c98a2c' }}>{s.pending}</div>
                  <div className="col-span-2 text-right font-mono font-bold" style={{ color: '#2e6f6b' }}>{fmtViews(s.views)}</div>
                  <div className="col-span-2 text-right font-mono text-ink-500 text-xs">{fmtViews(s.avgViews)}</div>
                  <div className="col-span-2 text-right font-mono text-ink-400 text-xs">{fmtHours(s.avgTimeToPublishHours)}</div>
                </div>
              ))}
              {authorStats.length === 0 && <div className="text-center py-12 text-ink-400 text-sm">No data</div>}
            </div>
          )}

          {/* Categories tab */}
          {tab === 'categories' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {catStats.slice(0, 6).map(s => (
                  <div key={s.category.id} className="bg-white border border-paper-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-ink-900">{s.category.name}</span>
                      <span className="text-xs font-mono text-ink-400">{s.published} articles</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-2xl font-display font-bold" style={{ color: '#2e6f6b' }}>{fmtViews(s.views)}</p>
                        <p className="text-xs text-ink-400">total views</p>
                      </div>
                      <div className="border-l border-paper-200 pl-3">
                        <p className="text-lg font-display font-bold text-ink-700">{fmtViews(s.avgViews)}</p>
                        <p className="text-xs text-ink-400">avg / article</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-paper-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: catStats[0]?.views > 0 ? `${Math.round((s.views / catStats[0].views) * 100)}%` : '0%',
                        background: '#b23a2e'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-paper-50 border-b border-paper-200 text-xs font-mono uppercase tracking-wide text-ink-500">
                  <div>Category</div><div className="text-center">Articles</div><div className="text-right">Views</div><div className="text-right">Avg Views</div>
                </div>
                {catStats.map((s, i) => (
                  <div key={s.category.id} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-paper-50 last:border-0 hover:bg-paper-50 transition-colors text-sm items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-ink-400 w-4">{i + 1}</span>
                      <span className="font-medium text-ink-900">{s.category.name}</span>
                    </div>
                    <div className="text-center font-mono text-ink-700">{s.published}</div>
                    <div className="text-right font-mono font-bold" style={{ color: '#2e6f6b' }}>{fmtViews(s.views)}</div>
                    <div className="text-right font-mono text-ink-500 text-xs">{fmtViews(s.avgViews)}</div>
                  </div>
                ))}
                {catStats.length === 0 && <div className="text-center py-12 text-ink-400 text-sm">No data</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
