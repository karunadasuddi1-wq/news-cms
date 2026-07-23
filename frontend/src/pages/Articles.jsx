import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusStamp from '../components/StatusStamp';
import ErrorBanner from '../components/ErrorBanner';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'In Review' },
  { value: 'published', label: 'Published' },
];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Articles() {
  const { can, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const dateFrom = params.get('dateFrom') || '';
  const dateTo = params.get('dateTo') || '';
  const authorId = params.get('authorId') || '';
  const assignedToId = params.get('assignedToId') || '';

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [authors, setAuthors] = useState([]);

  useEffect(() => {
    if (can.manageAny) {
      client.get('/users').then((res) => setAuthors(res.data.users)).catch(() => {});
    }
  }, [can.manageAny]);

  const load = useCallback(() => {
    setLoading(true);
    const query = {};
    if (status) query.status = status;
    if (dateFrom) query.dateFrom = dateFrom;
    if (dateTo) query.dateTo = dateTo;
    if (authorId) query.authorId = authorId;
    if (assignedToId) query.assignedToId = assignedToId;
    client
      .get('/articles', { params: query })
      .then((res) => setArticles(res.data.articles))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status, dateFrom, dateTo, authorId, assignedToId]);

  useEffect(load, [load]);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function transition(article, nextStatus) {
    setBusyId(article.id);
    setError('');
    try {
      await client.patch(`/articles/${article.id}/status`, { status: nextStatus });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(article) {
    if (!window.confirm(`Delete "${article.title}"? This can't be undone.`)) return;
    setBusyId(article.id);
    setError('');
    try {
      await client.delete(`/articles/${article.id}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-6 pb-6 border-b-2 border-ink-900">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400 mb-1">
            The Rundown
          </p>
          <h1 className="font-display font-bold text-3xl text-ink-900">Articles</h1>
        </div>
        <Link
          to="/articles/new"
          className="bg-press-red hover:bg-press-red-dark text-white text-sm font-medium px-5 py-2.5 rounded transition-colors"
        >
          + Write a story
        </Link>
      </div>

      <ErrorBanner message={error} />

      <div className="flex gap-1.5 mb-5 flex-wrap items-center">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => updateParam('status', f.value)}
            className={`text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
              status === f.value
                ? 'bg-ink-900 text-paper-50 border-ink-900'
                : 'border-paper-200 text-ink-600 hover:border-ink-600'
            }`}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={() => updateParam('assignedToId', assignedToId === String(user.id) ? '' : String(user.id))}
          className={`text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
            assignedToId === String(user.id)
              ? 'bg-press-red text-white border-press-red'
              : 'border-paper-200 text-ink-600 hover:border-ink-600'
          }`}
        >
          Assigned to Me
        </button>

        <div className="h-5 w-px bg-paper-200 mx-1" />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => updateParam('dateFrom', e.target.value)}
          className="text-xs border border-paper-200 rounded px-2 py-1.5 bg-white"
          title="From date"
        />
        <span className="text-xs text-ink-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => updateParam('dateTo', e.target.value)}
          className="text-xs border border-paper-200 rounded px-2 py-1.5 bg-white"
          title="To date"
        />

        {can.manageAny && (
          <select
            value={authorId}
            onChange={(e) => updateParam('authorId', e.target.value)}
            className="text-xs border border-paper-200 rounded px-2 py-1.5 bg-white"
          >
            <option value="">All authors</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        {(dateFrom || dateTo || authorId) && (
          <button
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete('dateFrom');
              next.delete('dateTo');
              next.delete('authorId');
              setParams(next);
            }}
            className="text-xs text-ink-400 hover:text-press-red underline ml-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="font-mono text-xs uppercase tracking-widest text-ink-400 py-12 text-center">
          Loading…
        </p>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-paper-200 rounded-lg">
          <p className="text-ink-600 mb-3">No articles here yet.</p>
          <Link to="/articles/new" className="text-press-red font-medium text-sm hover:underline">
            Write the first one →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-200 text-left">
                <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 font-medium">
                  Headline
                </th>
                <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 font-medium">
                  Byline
                </th>
                <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 font-medium">
                  Section
                </th>
                <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 font-medium">
                  Date
                </th>
                <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 font-medium">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-paper-100 last:border-0 hover:bg-paper-50/60">
                  <td className="px-5 py-3.5 max-w-xs">
                    <Link
                      to={`/articles/${a.id}`}
                      className="font-medium text-ink-900 hover:text-press-red transition-colors line-clamp-1"
                    >
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">
                    {a.author?.name}
                    {a.assignedTo && (
                      <p className="text-[11px] text-press-red font-mono mt-0.5">→ {a.assignedTo.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{a.category?.name}</td>
                  <td className="px-5 py-3.5 text-ink-600 font-mono text-xs">
                    {formatDate(a.status === 'published' ? a.publishedAt : a.updatedAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusStamp status={a.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <ArticleActions
                      article={a}
                      canManageAny={can.manageAny}
                      busy={busyId === a.id}
                      onTransition={transition}
                      onDelete={remove}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ArticleActions({ article, canManageAny, busy, onTransition, onDelete }) {
  const actions = [];

  if (article.status === 'draft') {
    actions.push({ label: 'Submit for review', next: 'pending_review' });
  }
  if (article.status === 'pending_review') {
    actions.push({ label: 'Send back to draft', next: 'draft' });
    if (canManageAny) actions.push({ label: 'Publish', next: 'published', emphasize: true });
  }
  if (article.status === 'published' && canManageAny) {
    actions.push({ label: 'Unpublish', next: 'draft' });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Link
        to={`/articles/${article.id}`}
        className="text-xs font-medium px-2.5 py-1 rounded text-ink-600 hover:text-ink-900 border border-paper-200 hover:border-ink-600 transition-colors"
      >
        Edit
      </Link>
      {actions.map((a) => (
        <button
          key={a.next}
          disabled={busy}
          onClick={() => onTransition(article, a.next)}
          className={`text-xs font-medium px-2.5 py-1 rounded transition-colors disabled:opacity-50 ${
            a.emphasize
              ? 'bg-wire-teal text-white hover:bg-wire-teal-dark'
              : 'text-ink-600 hover:text-ink-900 border border-paper-200 hover:border-ink-600'
          }`}
        >
          {a.label}
        </button>
      ))}
      <button
        disabled={busy}
        onClick={() => onDelete(article)}
        className="text-xs text-ink-400 hover:text-press-red px-1.5 disabled:opacity-50"
        aria-label="Delete"
      >
        Delete
      </button>
    </div>
  );
}
