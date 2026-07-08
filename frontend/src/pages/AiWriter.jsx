import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import RichTextEditor from '../components/RichTextEditor';
import TagInput from '../components/TagInput';

const TONES = [
  { value: 'neutral', label: 'Neutral — Factual reporting' },
  { value: 'formal', label: 'Formal — Official/government tone' },
  { value: 'conversational', label: 'Conversational — Easy-reading, friendly' },
  { value: 'dramatic', label: 'Dramatic — Punchy, breaking-news style' },
];

const FEED_ICONS = {
  all: '🌐',
  national: '🇮🇳',
  karnataka: '🏛',
  sports: '🏏',
  business: '💼',
  tech: '💻',
  entertainment: '🎬',
  kannada: '🅺',
};

const labelCls = 'block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5';
const inputCls = 'w-full border border-paper-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-press-red/20 focus:border-press-red/40';

export default function AiWriter() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('text'); // 'text' | 'url'
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tone, setTone] = useState('neutral');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');

  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingItemLink, setGeneratingItemLink] = useState(null); // tracks which trending item is being rewritten
  const [contentLanguageLabel, setContentLanguageLabel] = useState('Kannada');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [fetchedImage, setFetchedImage] = useState(null);

  const [showTrending, setShowTrending] = useState(false);
  const [trendingItems, setTrendingItems] = useState([]);
  const [trendingFeed, setTrendingFeed] = useState('karnataka');
  const [availableFeeds, setAvailableFeeds] = useState([
    { key: 'all', label: 'All' },
    { key: 'national', label: 'National' },
    { key: 'karnataka', label: 'Karnataka' },
    { key: 'sports', label: 'Sports' },
    { key: 'business', label: 'Business' },
    { key: 'tech', label: 'Tech' },
    { key: 'entertainment', label: 'Entertainment' },
    { key: 'kannada', label: 'Kannada' },
  ]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  useEffect(() => {
    client.get('/categories').then(r => setCategories(r.data.categories || []));
    client.get('/settings').then(r => {
      const key = r.data.settings?.content_language || 'kannada';
      const labels = {
        kannada: 'Kannada', hindi: 'Hindi', tamil: 'Tamil', telugu: 'Telugu',
        malayalam: 'Malayalam', marathi: 'Marathi', bengali: 'Bengali',
        gujarati: 'Gujarati', punjabi: 'Punjabi', urdu: 'Urdu', english: 'English',
      };
      setContentLanguageLabel(labels[key] || 'Kannada');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (showTrending) handleFetchTrending(trendingFeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTrending]);

  async function handleFetchTrending(feedKey = trendingFeed) {
    setLoadingTrending(true);
    setError('');
    try {
      const res = await client.get(`/ai-writer/trending?feed=${encodeURIComponent(feedKey)}`);
      setTrendingItems(res.data.items || []);
      if (res.data.availableFeeds) setAvailableFeeds(res.data.availableFeeds);
      setTrendingFeed(feedKey);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoadingTrending(false);
    }
  }

  async function handleFetchUrl(urlOverride) {
    const url = urlOverride || sourceUrl;
    if (!url || !url.trim()) { setError('Please enter a URL.'); return null; }
    setFetchingUrl(true);
    setError('');
    try {
      const res = await client.post('/ai-writer/fetch-url', { url });
      return res.data;
    } catch (err) {
      setError(apiErrorMessage(err));
      return null;
    } finally {
      setFetchingUrl(false);
    }
  }

  async function runGenerate(text, srcUrl) {
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await client.post('/ai-writer/rewrite', {
        sourceText: text,
        tone,
        categoryId: categoryId || null,
        sourceUrl: srcUrl || null,
      });
      setResult(res.data);
      // scroll to result
      setTimeout(() => {
        document.getElementById('ai-result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  // Manual "Generate" button — uses whatever is in the textarea
  async function handleGenerate() {
    if (!sourceText.trim() || sourceText.trim().length < 50) {
      setError('Please paste at least a few sentences of source content.');
      return;
    }
    await runGenerate(sourceText, sourceUrl);
  }

  // One-click "Rewrite" from a trending list item: fetch the article AND generate immediately
  async function handleQuickRewrite(item) {
    setError('');
    setGeneratingItemLink(item.link);
    try {
      const fetched = await handleFetchUrl(item.link);
      if (!fetched || !fetched.text) {
        setGeneratingItemLink(null);
        return;
      }
      setSourceUrl(item.link);
      setSourceText(fetched.text);
      setFetchedImage(fetched.image || null);
      setMode('text');
      await runGenerate(fetched.text, item.link);
    } finally {
      setGeneratingItemLink(null);
    }
  }

  async function handleSaveDraft() {
    if (!result) return;
    if (!categoryId) { setError('Please select a category before saving.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await client.post('/ai-writer/save-draft', {
        title: result.title,
        excerpt: result.excerpt,
        content: result.content,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
        tags: result.tags,
        categoryId,
        featuredImage: fetchedImage,
      });
      navigate(`/articles/${res.data.article.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">✦ AI Writer</h1>
      <p className="text-sm text-ink-500 mb-6">
        Paste any article in any language. The AI will completely rewrite it in original {contentLanguageLabel} —
        different structure, fresh wording, zero plagiarism.
      </p>

      <ErrorBanner message={error} />

      {/* ── Trending toggle bar ── */}
      <button
        type="button"
        onClick={() => setShowTrending(s => !s)}
        className="w-full bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold py-3 rounded-t transition-colors flex items-center justify-center gap-2"
        style={{ borderRadius: showTrending ? '6px 6px 0 0' : '6px' }}
      >
        🔥 {showTrending ? 'Hide Trending News' : 'Show Trending News'} — Pick &amp; Rewrite
      </button>

      {showTrending && (
        <div className="border border-t-0 border-paper-200 rounded-b mb-6 bg-white overflow-hidden">
          {/* Feed tabs */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-paper-100 overflow-x-auto">
            {availableFeeds.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFetchTrending(f.key)}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  f.key === trendingFeed
                    ? 'bg-ink-900 text-white'
                    : 'bg-paper-50 border border-paper-200 text-ink-600 hover:bg-paper-100'
                }`}
              >
                <span>{FEED_ICONS[f.key] || '•'}</span>
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleFetchTrending(trendingFeed)}
              title="Refresh"
              className="ml-auto shrink-0 w-7 h-7 flex items-center justify-center rounded text-ink-400 hover:text-ink-700 hover:bg-paper-50 transition-colors"
            >
              ⟳
            </button>
          </div>

          {/* Items */}
          <div className="max-h-[420px] overflow-y-auto">
            {loadingTrending && (
              <div className="p-8 text-center text-ink-400 text-sm">Loading…</div>
            )}
            {!loadingTrending && trendingItems.length === 0 && (
              <div className="p-8 text-center text-ink-400 text-sm">No trending items found.</div>
            )}
            {!loadingTrending && trendingItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 px-4 py-3 border-b border-paper-100 last:border-b-0 hover:bg-paper-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono uppercase tracking-wide text-press-red bg-press-red/10 border border-press-red/20 rounded px-1.5 py-0.5">
                      {item.source || 'News'}
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wide text-ink-400 bg-paper-100 rounded px-1.5 py-0.5">
                      {item.category || trendingFeed}
                    </span>
                    {item.pubDate && (
                      <span className="text-[11px] text-ink-400">
                        {new Date(item.pubDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink-900 leading-snug">{item.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickRewrite(item)}
                  disabled={generatingItemLink === item.link || generating}
                  className="shrink-0 flex items-center gap-1.5 bg-ink-900 hover:bg-ink-700 text-white text-xs font-semibold px-3 py-2 rounded transition-colors disabled:opacity-60"
                >
                  {generatingItemLink === item.link
                    ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Rewriting…</>
                    : <>✦ Rewrite</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Manual paste / URL section ── */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            mode === 'text' ? 'bg-ink-900 text-white' : 'bg-white border border-paper-200 text-ink-600 hover:bg-paper-50'
          }`}
        >
          📄 Paste text
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            mode === 'url' ? 'bg-ink-900 text-white' : 'bg-white border border-paper-200 text-ink-600 hover:bg-paper-50'
          }`}
        >
          🔗 Enter URL
        </button>
      </div>

      {mode === 'url' && (
        <div className="flex gap-2 mb-4">
          <input
            className={inputCls}
            placeholder="https://example.com/news-article"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={async () => {
              const fetched = await handleFetchUrl();
              if (fetched) {
                setSourceText(fetched.text || '');
                setFetchedImage(fetched.image || null);
                setMode('text');
              }
            }}
            disabled={fetchingUrl}
            className="whitespace-nowrap bg-ink-900 hover:bg-ink-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-60"
          >
            {fetchingUrl ? 'Fetching…' : 'Fetch Article'}
          </button>
        </div>
      )}

      <label className={labelCls}>Source content</label>
      <textarea
        className={`${inputCls} min-h-[160px] mb-4`}
        placeholder="Paste the source article here in any language (English, Hindi, Telugu, Tamil, etc.)…"
        value={sourceText}
        onChange={e => setSourceText(e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Tone</label>
          <select className={inputCls} value={tone} onChange={e => setTone(e.target.value)}>
            {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Select category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-wire-teal/5 border border-wire-teal/20 rounded p-4 mb-5">
        <p className="text-xs font-mono uppercase tracking-wide text-wire-teal-dark font-bold mb-2">✓ What the AI does</p>
        <ul className="space-y-1 text-xs text-ink-600">
          <li>Completely rewrites in original {contentLanguageLabel} — not a translation</li>
          <li>Changes sentence structure, order, and wording</li>
          <li>Preserves all facts, names, dates, and figures</li>
          <li>Generates SEO title, meta description, and tags</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-700 text-white text-sm font-semibold py-3 rounded transition-colors disabled:opacity-60"
      >
        {generating
          ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
          : <>✦ Generate {contentLanguageLabel} Article</>}
      </button>

      {/* ── Result preview ── */}
      {result && (
        <div id="ai-result-section" className="mt-8 border border-paper-200 rounded p-5 bg-white">
          <h2 className="font-display font-bold text-lg text-ink-900 mb-4">Generated Draft</h2>

          <label className={labelCls}>Title</label>
          <input
            className={`${inputCls} mb-4`}
            value={result.title}
            onChange={e => setResult({ ...result, title: e.target.value })}
          />

          <label className={labelCls}>Excerpt</label>
          <textarea
            className={`${inputCls} min-h-[60px] mb-4`}
            value={result.excerpt}
            onChange={e => setResult({ ...result, excerpt: e.target.value })}
          />

          <label className={labelCls}>Content</label>
          <div className="mb-4">
            <RichTextEditor
              content={result.content}
              onChange={html => setResult({ ...result, content: html })}
              placeholder="Generated article content…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>SEO Title</label>
              <input
                className={inputCls}
                value={result.seoTitle}
                onChange={e => setResult({ ...result, seoTitle: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <TagInput
                tags={result.tags || []}
                onChange={tags => setResult({ ...result, tags })}
              />
            </div>
          </div>

          <label className={labelCls}>SEO Description</label>
          <textarea
            className={`${inputCls} min-h-[60px] mb-4`}
            value={result.seoDescription}
            onChange={e => setResult({ ...result, seoDescription: e.target.value })}
          />

          {fetchedImage && (
            <div className="mb-4">
              <label className={labelCls}>Featured Image (from source)</label>
              <img src={fetchedImage} alt="" className="h-24 rounded border border-paper-200 object-cover mt-1" />
            </div>
          )}

          {!categoryId && (
            <p className="text-xs text-press-red mb-3">⚠ Select a category above before saving.</p>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="w-full bg-wire-teal hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : '💾 Save as Draft'}
          </button>
        </div>
      )}
    </div>
  );
}
