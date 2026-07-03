import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';

const USD_TO_INR = 83.5;

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

const PROVIDER_COLORS = {
  anthropic: '#c8341a',
  openai: '#10a37f',
  gemini: '#4285f4',
  groq: '#f55036',
  mistral: '#ff7000',
};

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-paper-200 rounded-lg p-4">
      <p className="text-xs font-mono uppercase tracking-wide text-ink-500 mb-1">{label}</p>
      <p className="text-2xl font-display font-bold" style={{ color: color || '#16151a' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  );
}

function ProviderBadge({ provider }) {
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border capitalize"
      style={{ color: PROVIDER_COLORS[provider] || '#666', borderColor: PROVIDER_COLORS[provider] || '#ddd', background: (PROVIDER_COLORS[provider] || '#666') + '15' }}>
      {provider}
    </span>
  );
}

export default function UsageDashboard() {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    setLoading(true);
    client.get(`/usage?period=${period}`)
      .then(r => setData(r.data))
      .catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [period]);

  if (!can.manageUsers) {
    return <div className="px-8 py-16 text-center text-ink-400 text-sm">Admin access required.</div>;
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">💰 AI Usage & Costs</h1>
          <p className="text-sm text-ink-500">Track AI usage and costs across all providers.</p>
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setPeriod(o.value)}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${period === o.value ? 'bg-ink-900 text-white border-ink-900' : 'border-paper-200 text-ink-600 hover:bg-paper-50'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading && <div className="p-12 text-center text-ink-400 text-sm">Loading usage data…</div>}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total Cost (USD)" value={data.summary.totalCost.usd} color="#b23a2e" />
            <KpiCard label="Total Cost (INR)" value={data.summary.totalCost.inr} color="#c98a2c" />
            <KpiCard label="Total AI Calls" value={data.summary.totalCalls} />
            <KpiCard label="Total Tokens" value={`${((data.summary.totalInputTokens + data.summary.totalOutputTokens) / 1000).toFixed(1)}K`}
              sub={`${(data.summary.totalInputTokens/1000).toFixed(1)}K in / ${(data.summary.totalOutputTokens/1000).toFixed(1)}K out`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By Action */}
            <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-paper-50 border-b border-paper-200">
                <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">Cost by Action</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-100">
                    <th className="text-left px-4 py-2 text-xs font-mono text-ink-500">Action</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">Calls</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">USD</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">INR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAction.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-400 text-xs">No usage recorded yet</td></tr>
                  )}
                  {data.byAction.map((a, i) => (
                    <tr key={i} className="border-b border-paper-100 last:border-0 hover:bg-paper-50">
                      <td className="px-4 py-2.5 text-xs font-medium text-ink-800">{a.label}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-500 text-right">{a.calls}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{a.cost.usd}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{a.cost.inr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By Provider */}
            <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-paper-50 border-b border-paper-200">
                <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">Cost by Provider</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-100">
                    <th className="text-left px-4 py-2 text-xs font-mono text-ink-500">Provider</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">Calls</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">USD</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">INR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProvider.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-400 text-xs">No usage recorded yet</td></tr>
                  )}
                  {data.byProvider.map((p, i) => (
                    <tr key={i} className="border-b border-paper-100 last:border-0 hover:bg-paper-50">
                      <td className="px-4 py-2.5"><ProviderBadge provider={p.provider} /></td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-500 text-right">{p.calls}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{p.cost.usd}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{p.cost.inr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By User */}
            <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-paper-50 border-b border-paper-200">
                <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">Cost by Author</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-100">
                    <th className="text-left px-4 py-2 text-xs font-mono text-ink-500">Author</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">Calls</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">USD</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">INR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byUser.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-400 text-xs">No usage recorded yet</td></tr>
                  )}
                  {data.byUser.map((u, i) => (
                    <tr key={i} className="border-b border-paper-100 last:border-0 hover:bg-paper-50">
                      <td className="px-4 py-2.5 text-xs font-medium text-ink-800">{u.name}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-500 text-right">{u.calls}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{u.cost.usd}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{u.cost.inr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Daily chart */}
            <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-paper-50 border-b border-paper-200">
                <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">Daily Usage</h2>
              </div>
              <div className="p-4">
                {data.byDay.length === 0 && <p className="text-xs text-ink-400 text-center py-4">No usage recorded yet</p>}
                {data.byDay.length > 0 && (
                  <div className="space-y-2">
                    {data.byDay.slice(-10).map((d, i) => {
                      const maxCost = Math.max(...data.byDay.map(x => x.costUsd), 0.001);
                      const pct = Math.round((d.costUsd / maxCost) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-ink-400 w-20 shrink-0">{d.date.slice(5)}</span>
                          <div className="flex-1 h-4 bg-paper-100 rounded overflow-hidden">
                            <div className="h-full bg-press-red/70 rounded transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-ink-500 w-16 text-right shrink-0">{d.cost.usd} / {d.calls} calls</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent logs */}
          <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-paper-50 border-b border-paper-200">
              <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">Recent AI Calls</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-200 bg-paper-50">
                    <th className="text-left px-4 py-2 text-xs font-mono text-ink-500">Time</th>
                    <th className="text-left px-4 py-2 text-xs font-mono text-ink-500">Action</th>
                    <th className="text-left px-4 py-2 text-xs font-mono text-ink-500">Provider</th>
                    <th className="text-left px-4 py-2 text-xs font-mono text-ink-500">Author</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">Tokens</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">Cost USD</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-ink-500">Cost INR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLogs.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-400 text-xs">No AI calls recorded yet. Use AI Writer or Generate SEO to see costs here.</td></tr>
                  )}
                  {data.recentLogs.map((log, i) => (
                    <tr key={i} className="border-b border-paper-100 last:border-0 hover:bg-paper-50">
                      <td className="px-4 py-2.5 text-[10px] font-mono text-ink-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-700">{log.action}</td>
                      <td className="px-4 py-2.5"><ProviderBadge provider={log.provider} /></td>
                      <td className="px-4 py-2.5 text-xs text-ink-500">{log.user}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-ink-400 text-right">{(log.inputTokens + log.outputTokens).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{log.cost.usd}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-ink-700 text-right">{log.cost.inr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
