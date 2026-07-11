import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const EDITION_NO = Math.floor(
  (Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24)
);

const GREETINGS = {
  kannada: 'ನಮಸ್ಕಾರ',
  hindi: 'नमस्ते',
  tamil: 'வணக்கம்',
  telugu: 'నమస్కారం',
  malayalam: 'നമസ്കാരം',
  marathi: 'नमस्कार',
  bengali: 'নমস্কার',
  gujarati: 'નમસ્તે',
  punjabi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ',
  urdu: 'السلام علیکم',
  english: 'Hello',
};

const STATUS_META = {
  draft: { label: 'Draft', color: 'var(--color-ink-600)' },
  pending_review: { label: 'In review', color: 'var(--color-amber-proof)' },
  published: { label: 'Live', color: 'var(--color-wire-teal)' },
};

function Dispatch({ label, value, accent, to, trend }) {
  const content = (
    <div className="relative bg-white border border-paper-200 rounded-lg p-5 pt-7 hover:border-current transition-colors" style={{ color: accent }}>
      <span
        className="stamp absolute -top-2.5 left-4 bg-paper-50"
        style={{ color: accent, borderColor: accent }}
      >
        {label}
      </span>
      {trend !== undefined && (
        <span className={`absolute top-5 right-4 font-mono text-[11px] font-semibold ${trend === null ? 'text-ink-300' : trend >= 0 ? 'text-wire-teal' : 'text-press-red'}`}>
          {trend === null ? '—' : `${trend >= 0 ? '+' : ''}${trend}%`}
        </span>
      )}
      <p className="font-display font-bold text-4xl text-ink-900 tabular-nums">
        {value}
      </p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function SectionEyebrow({ children, right }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 border-b border-ink-900/10 pb-1 flex-1">
        {children}
      </p>
      {right}
    </div>
  );
}

function QuickAction({ to, icon, title, subtitle }) {
  return (
    <Link
      to={to}
      className="bg-white border border-paper-200 rounded-lg p-4 hover:border-press-red/50 hover:bg-press-red/5 transition-colors flex items-start gap-3"
    >
      <span className="text-xl leading-none mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [authorReport, setAuthorReport] = useState([]);
  const [authorReportDays, setAuthorReportDays] = useState(48);
  const [authorReportLoading, setAuthorReportLoading] = useState(true);
  const [recent, setRecent] = useState([]);
  const [aiUsage, setAiUsage] = useState(null);
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    client
      .get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(apiErrorMessage(err)));

    client.get('/dashboard/recent-articles?limit=5')
      .then((res) => setRecent(res.data.articles))
      .catch(() => {});

    client.get('/settings')
      .then((res) => {
        const key = res.data.settings?.content_language || 'kannada';
        setGreeting(GREETINGS[key] || 'Hello');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!can.manageAny) return;
    setAuthorReportLoading(true);
    client
      .get(`/dashboard/published-by-author?days=${authorReportDays}`)
      .then((res) => setAuthorReport(res.data.report))
      .catch(() => {})
      .finally(() => setAuthorReportLoading(false));

    client.get('/dashboard/ai-usage-today')
      .then((res) => setAiUsage(res.data))
      .catch(() => {});
  }, [can.manageAny, authorReportDays]);

  const firstName = user?.name?.split(' ')[0];
  const usagePct = aiUsage ? Math.min(100, Math.round((aiUsage.requests / aiUsage.dailyLimit) * 100)) : 0;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-10 pb-6 border-b-2 border-ink-900">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-400">
            Edition No. {EDITION_NO} · {TODAY}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            {can.manageAny ? 'Desk view' : 'Byline view'}
          </p>
        </div>
        <h1 className="font-display font-bold text-4xl text-ink-900 leading-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-ink-600 mt-1.5 text-sm">
          {can.manageAny
            ? "Here's what's moving through the queue right now."
            : "Here's where your byline stands."}
        </p>
      </div>

      <ErrorBanner message={error} />

      {stats && (
        <>
          <SectionEyebrow>The Queue</SectionEyebrow>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <Dispatch
              label="Draft"
              value={stats.articles.draft}
              accent="var(--color-ink-600)"
              to="/articles?status=draft"
            />
            <Dispatch
              label="In Review"
              value={stats.articles.pendingReview}
              accent="var(--color-amber-proof)"
              to="/articles?status=pending_review"
            />
            <Dispatch
              label="Live"
              value={stats.articles.published}
              accent="var(--color-wire-teal)"
              to="/articles?status=published"
              trend={stats.trends?.published}
            />
            <Dispatch
              label="All Time"
              value={stats.articles.total}
              accent="var(--color-press-red)"
              to="/articles"
              trend={stats.trends?.total}
            />
          </div>

          {can.manageAny && (
            <>
              <SectionEyebrow>The Desk</SectionEyebrow>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <Dispatch label="Staff" value={stats.users} accent="var(--color-ink-900)" to="/users" />
                <Dispatch
                  label="Sections"
                  value={stats.categories}
                  accent="var(--color-ink-900)"
                  to="/categories"
                />
              </div>
            </>
          )}

          <SectionEyebrow>Quick Actions</SectionEyebrow>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <QuickAction to="/articles/new" icon="✎" title="New article" subtitle="Write a story" />
            <QuickAction to="/ai-writer" icon="✦" title="AI writer" subtitle="Rewrite in your language" />
            <QuickAction to="/newsroom" icon="◈" title="Newsroom" subtitle="Discover score & fixes" />
            <QuickAction to="/analytics" icon="▲" title="Analytics" subtitle="Traffic & performance" />
          </div>

          <SectionEyebrow>Recent Activity</SectionEyebrow>
          <div className="bg-white border border-paper-200 rounded-lg divide-y divide-paper-100 mb-10">
            {recent.length === 0 ? (
              <p className="text-sm text-ink-400 px-5 py-4">Nothing yet — write your first story.</p>
            ) : (
              recent.map((a) => {
                const meta = STATUS_META[a.status] || { label: a.status, color: 'var(--color-ink-400)' };
                return (
                  <Link
                    key={a.id}
                    to={`/articles/${a.id}`}
                    className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-paper-50 transition-colors"
                  >
                    <span
                      className="stamp text-[9px] shrink-0"
                      style={{ color: meta.color, borderColor: meta.color, transform: 'rotate(0deg)' }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-ink-900 flex-1 truncate">{a.title}</span>
                    <span className="font-mono text-[11px] text-ink-400 shrink-0">
                      {new Date(a.status === 'published' ? a.publishedAt : a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          {can.manageAny && (
            <div className="mb-10">
              <SectionEyebrow
                right={
                  <label className="flex items-center gap-2 text-[11px] font-mono text-ink-400">
                    last
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={authorReportDays}
                      onChange={(e) => setAuthorReportDays(parseInt(e.target.value, 10) || 48)}
                      className="w-14 border border-paper-200 rounded px-1.5 py-1 text-xs bg-white text-center"
                    />
                    days
                  </label>
                }
              >
                Bylines — Most Published
              </SectionEyebrow>
              {authorReportLoading ? (
                <p className="font-mono text-xs uppercase tracking-widest text-ink-400 py-6 text-center">
                  Loading…
                </p>
              ) : authorReport.length === 0 ? (
                <p className="text-sm text-ink-400 py-4">No published articles in this range.</p>
              ) : (
                <div className="bg-white border border-paper-200 rounded-lg divide-y divide-paper-100">
                  {authorReport.map((a, i) => (
                    <div key={a.authorId} className="flex items-center gap-4 px-5 py-3 text-sm">
                      <span className="font-display font-bold text-lg text-ink-400 w-7 text-right shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium text-ink-900 flex-1">{a.name}</span>
                      <span className="font-mono text-xs text-ink-500 uppercase tracking-wide">
                        {a.role}
                      </span>
                      <span className="font-display font-bold text-base text-press-red w-24 text-right shrink-0">
                        {a.count} <span className="font-sans font-normal text-xs text-ink-400">pub.</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {can.manageAny && aiUsage && (
            <div className="mb-10">
              <SectionEyebrow>AI Usage Today</SectionEyebrow>
              <div className="bg-white border border-paper-200 rounded-lg p-5">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-400 mb-1">Requests</p>
                    <p className="font-display font-bold text-2xl text-ink-900">{aiUsage.requests}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-400 mb-1">Tokens used</p>
                    <p className="font-display font-bold text-2xl text-ink-900">{aiUsage.tokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-400 mb-1">Cost today</p>
                    <p className="font-display font-bold text-2xl text-ink-900">₹{aiUsage.costInr.toFixed(2)}</p>
                  </div>
                </div>
                <div className="h-1.5 bg-paper-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-wire-teal transition-all"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="font-mono text-[10px] text-ink-400 mt-1.5">
                  {aiUsage.requests} / {aiUsage.dailyLimit} daily requests
                </p>
              </div>
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
