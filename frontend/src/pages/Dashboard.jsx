import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function StatCard({ label, value, accent, to }) {
  const content = (
    <div className="bg-white border border-paper-200 rounded-lg p-5 hover:border-press-red/40 transition-colors">
      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-400 mb-2">
        {label}
      </p>
      <p className="font-display font-bold text-4xl" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [authorReport, setAuthorReport] = useState([]);
  const [authorReportDays, setAuthorReportDays] = useState(48);
  const [authorReportLoading, setAuthorReportLoading] = useState(true);

  useEffect(() => {
    client
      .get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!can.manageAny) return;
    setAuthorReportLoading(true);
    client
      .get(`/dashboard/published-by-author?days=${authorReportDays}`)
      .then((res) => setAuthorReport(res.data.report))
      .catch(() => {})
      .finally(() => setAuthorReportLoading(false));
  }, [can.manageAny, authorReportDays]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8 pb-6 border-b-2 border-ink-900">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400 mb-1">
          {TODAY}
        </p>
        <h1 className="font-display font-bold text-3xl text-ink-900">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-ink-600 mt-1 text-sm">
          {can.manageAny
            ? "Here's the state of the newsroom queue."
            : "Here's the state of your byline."}
        </p>
      </div>

      <ErrorBanner message={error} />

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Drafts"
              value={stats.articles.draft}
              accent="var(--color-ink-600)"
              to="/articles?status=draft"
            />
            <StatCard
              label="In Review"
              value={stats.articles.pendingReview}
              accent="var(--color-amber-proof)"
              to="/articles?status=pending_review"
            />
            <StatCard
              label="Published"
              value={stats.articles.published}
              accent="var(--color-wire-teal)"
              to="/articles?status=published"
            />
            <StatCard
              label="Total Stories"
              value={stats.articles.total}
              accent="var(--color-press-red)"
              to="/articles"
            />
          </div>

          {can.manageAny && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Staff" value={stats.users} accent="var(--color-ink-900)" to="/users" />
              <StatCard
                label="Categories"
                value={stats.categories}
                accent="var(--color-ink-900)"
                to="/categories"
              />
            </div>
          )}

          {can.manageAny && (
            <div className="mb-10">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400">
                  Published — Last {authorReportDays} Days, by Author
                </p>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={authorReportDays}
                  onChange={(e) => setAuthorReportDays(parseInt(e.target.value, 10) || 48)}
                  className="w-20 border border-paper-200 rounded px-2.5 py-1.5 text-xs bg-white"
                />
              </div>
              {authorReportLoading ? (
                <p className="font-mono text-xs uppercase tracking-widest text-ink-400 py-6 text-center">
                  Loading…
                </p>
              ) : authorReport.length === 0 ? (
                <p className="text-sm text-ink-400 py-4">No published articles in this range.</p>
              ) : (
                <div className="bg-white border border-paper-200 rounded-lg divide-y divide-paper-100">
                  {authorReport.map((a) => (
                    <div key={a.authorId} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <span className="font-medium text-ink-900">{a.name}</span>
                      <span className="font-mono text-xs text-ink-700">{a.count} published</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Link
          to="/articles/new"
          className="bg-press-red hover:bg-press-red-dark text-white text-sm font-medium px-5 py-2.5 rounded transition-colors"
        >
          + Write a story
        </Link>
        <Link
          to="/articles"
          className="border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white text-sm font-medium px-5 py-2.5 rounded transition-colors"
        >
          View all articles
        </Link>
      </div>
    </div>
  );
}
