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

  useEffect(() => {
    client
      .get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

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
