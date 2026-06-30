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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [fetchedImage, setFetchedImage] = useState(null);

  const [showTrending, setShowTrending] = useState(false);
  const [trendingItems, setTrendingItems] = useState([]);
  const [trendingFeed, setTrendingFeed] = useState('ಕರ್ನಾಟಕ');
  const [trendingFeeds, setTrendingFeeds] = useState(['ಕರ್ನಾಟಕ', 'ಭಾರತ', 'ಟ್ರೆಂಡಿಂಗ್']);
  const [loadingTrending, setLoadingTrending] = useState(false);

  useEffect(() => {
    client.get('/categories').then(r => setCategories(r.data.categories || []));
  }, []);

  async function handleFetchTrending(feedLabel = trendingFeed) {
    setLoadingTrending(true);
    setError('');
    try {
      const res = await client.get(`/ai-writer/trending?feed=${encodeURIComponent(feedLabel)}`);
      setTrendingItems(res.data.items || []);
      setTrendingFeeds(res.data.availableFeeds || trendingFeeds);
      setTrendingFeed(feedLabel);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoadingTrending(false);
    }
  }

  function openTrending() {
    setShowTrending(true);
    if (trendingItems.length === 0) handleFetchTrending();
  }

  async function pickTrendingItem(item) {
    setShowTrending(false);
    setMode('url');
    setSourceUrl(item.link);
    setError('');
    await handleFetchUrl(item.link);
  }

  async function handleFetchUrl(urlOverride) {
    const url = urlOverride || sourceUrl;
    if (!url.trim()) { setError('Please enter a URL.'); return; }
    setFetchingUrl(true);
    setError('');
    try {
      const res = await client.post('/ai-writer/fetch-url', { url });
      setSourceText(res.data.text || '');
      setFetchedImage(res.data.image || null);
      setMode('text');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setFetchingUrl(false);
    }
  }

  async function handleGenerate() {
    if (!sourceText.trim() || sourceText.trim().length < 50) {
      setError('Please paste at least a few sentences of source content.');
      return;
    }
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await client.post('/ai-writer/rewrite', {
        sourceText,
        tone,
        categoryId: categoryId || null,
        sourceUrl: sourceUrl || null,
      });
      setResult(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setGenerating(false);
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
    <div className="px-8 py-10 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">✦ AI Writer</h1>
      <p className="text-sm text-ink-500 mb-6">
        Paste any article in any language. The AI will completely rewrite it in original Kannada —
        different structure, fresh wording, zero plagiarism.
      </p>

      <ErrorBanner message={error} />

      {/* Mode tabs */}
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
            onClick={() => handleFetchUrl()}
            disabled={fetchingUrl}
            className="whitespace-nowrap bg-ink-900 hover:bg-ink-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-60"
          >
            {fetchingUrl ? 'Fetching…' : 'Fetch Article'}
          </button>
        </div>
      )}

      <label className={labelCls}>Source content</label>
      <textarea
        className={`${inputCls} min-h-[180px] mb-4`}
        placeholder="Paste the source article here in any language (English, Hindi, Telugu, Tamil, etc.)…"
        value={sourceText}
        onChange={e => setSourceText(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
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

      <div className="bg-wire-teal/5 border border-wire-teal/20 rounded p-4 mb-4">
        <p className="text-xs font-mono uppercase tracking-wide text-wire-teal-dark font-bold mb-2">✓ What the AI does</p>
        <ul className="space-y-1 text-xs text-ink-600">
          <li>Completely rewrites in original Kannada — not a translation</li>
          <li>Changes sentence structure, order, and wording</li>
          <li>Preserves all facts, names, dates, and figures</li>
          <li>Generates SEO title, meta description, and tags</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={openTrending}
        className="w-full bg-paper-50 hover:bg-paper-100 border border-paper-200 text-ink-700 text-sm font-medium py-2.5 rounded transition-colors mb-4"
      >
        🔥 Show Trending News — Pick &amp; Rewrite
      </button>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-700 text-white text-sm font-semibold py-3 rounded transition-colors disabled:opacity-60"
      >
        {generating
          ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
          : <>✦ Generate Kannada Article</>}
      </button>

      {/* Result preview */}
      {result && (
        <div className="mt-8 border border-paper-200 rounded p-5 bg-white">
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

      {/* Trending modal */}
      {showTrending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTrending(false)}>
          <div className="bg-white rounded-lg w-[90%] max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-paper-200">
              <h3 className="font-display font-bold text-base text-ink-900">🔥 Trending News</h3>
              <button type="button" onClick={() => setShowTrending(false)} className="text-ink-400 hover:text-ink-700 text-lg">✕</button>
            </div>

            <div className="flex gap-2 px-5 pt-3">
              {trendingFeeds.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFetchTrending(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    f === trendingFeed ? 'bg-ink-900 text-white' : 'bg-white border border-paper-200 text-ink-600 hover:bg-paper-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loadingTrending && <div className="p-6 text-center text-ink-400 text-sm">Loading…</div>}

            {!loadingTrending && (
              <div className="overflow-y-auto px-5 pb-5 pt-3">
                {trendingItems.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => pickTrendingItem(item)}
                    className="py-2.5 border-b border-paper-100 last:border-b-0 cursor-pointer hover:bg-paper-50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="text-sm font-medium text-ink-900 leading-snug">{item.title}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{item.source}</div>
                  </div>
                ))}
                {trendingItems.length === 0 && (
                  <div className="p-6 text-center text-ink-400 text-sm">No trending items found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
