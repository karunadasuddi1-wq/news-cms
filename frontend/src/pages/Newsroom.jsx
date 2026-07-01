import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

// ── Discover/News scoring (same logic as DiscoverMeter in ArticleEditor) ──
function scoreArticle(a) {
  const title = a.title || '';
  const wordCount = Math.round(
    (a.content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  );
  const checks = [
    { key: 'title_length',   label: 'Title 40–70 chars',         pass: title.length >= 40 && title.length <= 70 },
    { key: 'has_image',      label: 'Featured image',            pass: !!a.featuredImage },
    { key: 'word_count',     label: '600+ words',                pass: wordCount >= 600 },
    { key: 'has_category',   label: 'Category assigned',         pass: !!a.categoryId },
    { key: 'seo_title',      label: 'SEO title (30+ chars)',      pass: (a.seoTitle || '').length >= 30 },
    { key: 'meta_desc',      label: 'Meta description (70+ chars)', pass: (a.seoDescription || '').length >= 70 },
    { key: 'no_noindex',     label: 'Not no-indexed',            pass: !a.noIndex },
    { key: 'kannada',        label: 'Kannada content',           pass: /[\u0C80-\u0CFF]/.test(a.content || '') },
  ];
  const passed = checks.filter(c => c.pass).length;
  const pct = Math.round((passed / checks.length) * 100);
  return { checks, passed, total: checks.length, pct, wordCount };
}

function scoreBadge(pct) {
  if (pct >= 80) return { label: 'Ready', color: '#2e6f6b', bg: '#2e6f6b18' };
  if (pct >= 50) return { label: 'Needs Work', color: '#c98a2c', bg: '#c98a2c18' };
  return { label: 'Not Ready', color: '#b23a2e', bg: '#b23a2e18' };
}

function ScoreBar({ pct }) {
  const { color } = scoreBadge(pct);
  return (
    <div className="w-full h-1.5 bg-paper-200 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-paper-200 rounded-lg p-4">
      <p className="text-xs font-mono uppercase tracking-wide text-ink-500 mb-1">{label}</p>
      <p className="text-3xl font-display font-bold" style={{ color: color || '#16151a' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Score: High → Low' },
  { value: 'score_asc',  label: 'Score: Low → High' },
  { value: 'date_desc',  label: 'Newest first' },
  { value: 'views_desc', label: 'Most viewed' },
  { value: 'words_desc', label: 'Longest articles' },
];

const FILTER_OPTIONS = [
  { value: 'all',       label: 'All articles' },
  { value: 'ready',     label: '✓ Discover Ready (80%+)' },
  { value: 'needs',     label: '⚠ Needs Work (50–79%)' },
  { value: 'not_ready', label: '✗ Not Ready (<50%)' },
  { value: 'no_image',  label: '📷 Missing image' },
  { value: 'short',     label: '📝 Under 600 words' },
  { value: 'no_seo',    label: '🔍 Missing SEO title' },
];

export default function Newsroom() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('score_asc'); // default: worst first (actionable)
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  useEffect(() => {
    setLoading(true);
    // Fetch all published articles — we need content for scoring
    Promise.all([
      client.get('/articles?status=published&pageSize=100&page=1'),
      client.get('/articles?status=published&pageSize=100&page=2'),
      client.get('/articles?status=published&pageSize=100&page=3'),
    ])
      .then(results => {
        const all = results.flatMap(r => r.data.articles || []);
        setArticles(all);
      })
      .catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const scored = useMemo(() => articles.map(a => ({ ...a, _score: scoreArticle(a) })), [articles]);

  const filtered = useMemo(() => {
    let list = scored;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => (a.title || '').toLowerCase().includes(q));
    }
    switch (filter) {
      case 'ready':     list = list.filter(a => a._score.pct >= 80); break;
      case 'needs':     list = list.filter(a => a._score.pct >= 50 && a._score.pct < 80); break;
      case 'not_ready': list = list.filter(a => a._score.pct < 50); break;
      case 'no_image':  list = list.filter(a => !a.featuredImage); break;
      case 'short':     list = list.filter(a => a._score.wordCount < 600); break;
      case 'no_seo':    list = list.filter(a => !(a.seoTitle || '').length); break;
    }
    switch (sort) {
      case 'score_desc': list = [...list].sort((a, b) => b._score.pct - a._score.pct); break;
      case 'score_asc':  list = [...list].sort((a, b) => a._score.pct - b._score.pct); break;
      case 'date_desc':  list = [...list].sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)); break;
      case 'views_desc': list = [...list].sort((a, b) => (b.views || 0) - (a.views || 0)); break;
      case 'words_desc': list = [...list].sort((a, b) => b._score.wordCount - a._score.wordCount); break;
    }
    return list;
  }, [scored, filter, sort, search]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // KPI calculations
  const kpis = useMemo(() => {
    if (!scored.length) return {};
    const ready = scored.filter(a => a._score.pct >= 80).length;
    const avgScore = Math.round(scored.reduce((s, a) => s + a._score.pct, 0) / scored.length);
    const noImage = scored.filter(a => !a.featuredImage).length;
    const shortContent = scored.filter(a => a._score.wordCount < 600).length;
    return { ready, avgScore, noImage, shortContent, total: scored.length };
  }, [scored]);

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">📊 Newsroom Dashboard</h1>
        <p className="text-sm text-ink-500">Google Discover &amp; News readiness scores for all published articles.</p>
      </div>

      <ErrorBanner message={error} />

      {/* KPI row */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Articles" value={kpis.total} />
          <KpiCard label="Discover Ready" value={kpis.ready} sub={`${Math.round((kpis.ready / kpis.total) * 100)}% of total`} color="#2e6f6b" />
          <KpiCard label="Avg Score" value={`${kpis.avgScore}%`} color={kpis.avgScore >= 80 ? '#2e6f6b' : kpis.avgScore >= 50 ? '#c98a2c' : '#b23a2e'} />
          <KpiCard label="Missing Image" value={kpis.noImage} sub="Required for Discover" color={kpis.noImage > 0 ? '#b23a2e' : '#2e6f6b'} />
        </div>
      )}

      {/* Quick fix banners */}
      {!loading && kpis.noImage > 0 && (
        <div className="bg-press-red/5 border border-press-red/20 rounded p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-press-red font-medium">⚠ {kpis.noImage} articles missing featured image — Discover requires one</span>
          <button onClick={() => { setFilter('no_image'); setPage(1); }} className="text-xs font-mono text-press-red underline">Show these →</button>
        </div>
      )}
      {!loading && kpis.shortContent > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-amber-700 font-medium">⚠ {kpis.shortContent} articles under 600 words — too short for Google Discover</span>
          <button onClick={() => { setFilter('short'); setPage(1); }} className="text-xs font-mono text-amber-700 underline">Show these →</button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="border border-paper-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-press-red/20 focus:border-press-red/40 flex-1 min-w-48"
          placeholder="Search articles…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border border-paper-200 rounded px-3 py-2 text-sm bg-white"
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1); }}
        >
          {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="border border-paper-200 rounded px-3 py-2 text-sm bg-white"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs font-mono text-ink-400 self-center">{filtered.length} articles</span>
      </div>

      {/* Table */}
      {loading && <div className="p-12 text-center text-ink-400 text-sm">Loading articles…</div>}
      {!loading && paginated.length === 0 && (
        <div className="p-12 text-center text-ink-400 text-sm">No articles match this filter.</div>
      )}
      {!loading && paginated.length > 0 && (
        <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-200 bg-paper-50">
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wide text-ink-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wide text-ink-500">Article</th>
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wide text-ink-500 w-36">Discover Score</th>
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wide text-ink-500 w-20">Words</th>
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wide text-ink-500 w-16">Views</th>
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wide text-ink-500 w-24">Issues</th>
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wide text-ink-500 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((a, i) => {
                const { pct, passed, total, wordCount, checks } = a._score;
                const badge = scoreBadge(pct);
                const issues = checks.filter(c => !c.pass);
                const rank = (page - 1) * PER_PAGE + i + 1;
                return (
                  <tr key={a.id} className="border-b border-paper-100 last:border-b-0 hover:bg-paper-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-ink-400">{rank}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900 leading-snug line-clamp-2 text-sm">{a.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {a.category && <span className="text-[10px] font-mono text-ink-400 bg-paper-100 px-1.5 py-0.5 rounded">{a.category.name}</span>}
                        {!a.featuredImage && <span className="text-[10px] font-mono text-press-red bg-press-red/10 px-1.5 py-0.5 rounded">No image</span>}
                        {wordCount < 300 && <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Very short</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold" style={{ color: badge.color }}>{pct}%</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: badge.color, borderColor: badge.color, background: badge.bg }}>{badge.label}</span>
                      </div>
                      <ScoreBar pct={pct} />
                      <span className="text-[10px] font-mono text-ink-400 mt-0.5">{passed}/{total} checks</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-ink-600">{wordCount}</td>
                    <td className="px-4 py-3 text-xs font-mono text-ink-600">{a.views || 0}</td>
                    <td className="px-4 py-3">
                      {issues.slice(0, 2).map(c => (
                        <div key={c.key} className="text-[10px] text-ink-400 leading-snug">✗ {c.label}</div>
                      ))}
                      {issues.length > 2 && <div className="text-[10px] text-ink-400">+{issues.length - 2} more</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/articles/${a.id}`} className="text-xs font-mono text-press-red hover:underline">Fix →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-paper-200 rounded disabled:opacity-40 hover:bg-paper-50">‹ Prev</button>
          <span className="px-3 py-1.5 text-sm text-ink-500 font-mono">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-paper-200 rounded disabled:opacity-40 hover:bg-paper-50">Next ›</button>
        </div>
      )}
    </div>
  );
}
