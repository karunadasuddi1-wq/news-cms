import { useState, useEffect } from 'react';
import client from '../api/client';

const PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: '📘',
    buildUrl: ({ url }) => `https://www.facebook.com/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    color: '#000000',
    icon: '𝕏',
    buildUrl: ({ url, title }) => `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: '💬',
    buildUrl: ({ url, title }) => `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' \n\n ' + url)}`,
  },
  {
    key: 'pinterest',
    label: 'Pinterest',
    color: '#E60023',
    icon: '📌',
    buildUrl: ({ url, title, image }) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(image || '')}&description=${encodeURIComponent(title)}`,
  },
];

export default function SocialShare() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [siteUrl, setSiteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    client.get('/settings').then(r => {
      setSiteUrl((r.data.settings?.wp_site_url || r.data.settings?.site_url || '').replace(/\/$/, ''));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearching(true);
      client.get('/articles', { params: { status: 'published', search: query || undefined } })
        .then(r => setResults(r.data.articles || []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const liveUrl = selected && siteUrl ? `${siteUrl}/${selected.slug}/` : '';

  function copyLink() {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">Social Share</h1>
      <p className="text-sm text-ink-500 mb-6">
        Pick a published article and get ready-to-post links for each platform — opens that platform's own share dialog, pre-filled, for you to review and post.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search published articles by title…"
            className="w-full border border-paper-200 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-press-red/20 focus:border-press-red/40 mb-3"
          />
          <div className="border border-paper-200 rounded-lg overflow-hidden max-h-[28rem] overflow-y-auto">
            {searching && <p className="text-xs text-ink-400 p-4 text-center">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="text-xs text-ink-400 p-4 text-center">No published articles found.</p>
            )}
            {results.map(a => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 border-b border-paper-100 last:border-0 hover:bg-paper-50 transition-colors ${
                  selected?.id === a.id ? 'bg-press-red/5' : ''
                }`}
              >
                {a.featuredImage ? (
                  <img src={a.featuredImage} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-paper-100 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{a.title}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="border border-dashed border-paper-200 rounded-lg h-full flex items-center justify-center p-10 text-center">
              <p className="text-sm text-ink-400">Select an article on the left to get its share links.</p>
            </div>
          ) : !siteUrl ? (
            <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
              No site URL configured — set it in Settings → Site Identity (or WordPress) before sharing links can be generated.
            </div>
          ) : (
            <div className="border border-paper-200 rounded-lg p-5">
              <p className="font-semibold text-ink-900 mb-1">{selected.title}</p>
              <div className="flex items-center gap-2 mb-5">
                <input readOnly value={liveUrl} className="flex-1 text-xs font-mono text-ink-500 bg-paper-50 border border-paper-200 rounded px-2.5 py-2" />
                <button onClick={copyLink} className="text-xs font-medium px-3 py-2 rounded border border-ink-300 text-ink-700 hover:bg-ink-50 shrink-0">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <p className="text-xs font-mono uppercase tracking-wide text-ink-400 mb-3">Share to</p>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map(p => (
                  
                    key={p.key}
                    href={p.buildUrl({ url: liveUrl, title: selected.title, image: selected.featuredImage })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: p.color }}
                  >
                    <span className="text-lg leading-none">{p.icon}</span>
                    {p.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
