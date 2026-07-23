import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusStamp from '../components/StatusStamp';
import ErrorBanner from '../components/ErrorBanner';
import ImageUpload from '../components/ImageUpload';
import EmbedBlock from '../components/EmbedBlock';
import TagInput from '../components/TagInput';
import RichTextEditor from '../components/RichTextEditor';
import MultiCategorySelect from '../components/MultiCategorySelect';

const emptyForm = {
  title: '', excerpt: '', content: '', featuredImage: '', categoryId: '', authorId: '',
  slug: '', tags: [],
  seoTitle: '', seoDescription: '', focusKeyword: '', ogImage: '', canonicalUrl: '', noIndex: false, imageAlt: '', kannadaKeyword: '',
  scheduledAt: '',
};


function DiscoverMeter({ form, wordCount }) {
  const title = form.title || '';
  const seoTitle = form.seoTitle || '';
  const content = form.content || '';
  const checks = [
    {
      label: 'Title length (40–70 chars)',
      pass: title.length >= 40 && title.length <= 70,
      hint: title.length < 40 ? 'Too short — expand the title' : title.length > 70 ? 'Too long — Google may truncate' : '',
    },
    {
      label: 'Featured image set (required for Discover)',
      pass: !!form.featuredImage,
      hint: 'Upload a high-quality image — Discover requires one',
    },
    {
      label: 'Content length (600+ words for Discover)',
      pass: wordCount >= 600,
      hint: wordCount < 300 ? 'Too short for News indexing' : wordCount < 600 ? `${600 - wordCount} more words needed for Discover` : '',
    },
    {
      label: 'Category assigned',
      pass: !!form.categoryId,
      hint: 'Set a category before publishing',
    },
    {
      label: 'SEO title set',
      pass: seoTitle.length >= 30,
      hint: 'Add an SEO title — Google News uses this as the headline',
    },
    {
      label: 'Meta description set',
      pass: (form.seoDescription || '').length >= 70,
      hint: 'Add a meta description for better CTR in Discover',
    },
    {
      label: 'Not marked no-index',
      pass: !form.noIndex,
      hint: 'No-index will prevent Google from indexing this article',
    },
    {
      label: 'Kannada content detected',
      pass: /[\u0C80-\u0CFF]/.test(content),
      hint: 'Content should contain Kannada script for regional ranking',
    },
  ];
  const score = checks.filter(c => c.pass).length;
  const pct = Math.round((score / checks.length) * 100);
  const color = pct >= 80 ? '#2e6f6b' : pct >= 50 ? '#c98a2c' : '#b23a2e';
  const badge = pct >= 80 ? 'Discover Ready' : pct >= 50 ? 'Needs Work' : 'Not Ready';

  return (
    <div className="mt-3 p-3 rounded bg-paper-50 border border-paper-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono uppercase tracking-wide text-ink-600">Google Discover / News Score</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color }}>{score}/{checks.length} — {pct}%</span>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border" style={{ color, borderColor: color, background: color + '15' }}>{badge}</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-paper-200 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <ul className="space-y-1.5">
        {checks.map(c => (
          <li key={c.label} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 shrink-0" style={{ color: c.pass ? '#2e6f6b' : '#b23a2e' }}>{c.pass ? '✓' : '✗'}</span>
            <div>
              <span className={c.pass ? 'text-ink-500' : 'text-ink-700 font-medium'}>{c.label}</span>
              {!c.pass && c.hint && <span className="text-ink-400 ml-1">— {c.hint}</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-2 border-t border-paper-200 flex gap-3 text-[11px] text-ink-400 font-mono">
        <span>Words: <strong className="text-ink-600">{wordCount}</strong></span>
        <span>Title: <strong className={title.length > 70 ? 'text-press-red' : 'text-ink-600'}>{title.length} chars</strong></span>
      </div>
    </div>
  );
}

function SeoMeter({ title, description, focusKeyword }) {
  const checks = [
    { label: 'SEO title set', pass: title.trim().length > 0 },
    { label: 'SEO title length (30–60 chars)', pass: title.trim().length >= 30 && title.trim().length <= 60 },
    { label: 'Meta description set', pass: description.trim().length > 0 },
    { label: 'Meta description length (70–155 chars)', pass: description.trim().length >= 70 && description.trim().length <= 155 },
    { label: 'Focus keyword set', pass: focusKeyword.trim().length > 0 },
    { label: 'Keyword in SEO title', pass: focusKeyword.trim().length > 0 && title.toLowerCase().includes(focusKeyword.toLowerCase()) },
    { label: 'Keyword in meta description', pass: focusKeyword.trim().length > 0 && description.toLowerCase().includes(focusKeyword.toLowerCase()) },
  ];
  const score = checks.filter(c => c.pass).length;
  const pct = Math.round((score / checks.length) * 100);
  const color = pct >= 80 ? '#2e6f6b' : pct >= 50 ? '#c98a2c' : '#b23a2e';
  return (
    <div className="mt-3 p-3 rounded bg-paper-50 border border-paper-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono uppercase tracking-wide text-ink-600">SEO score</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{score}/{checks.length} — {pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-paper-200 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <ul className="space-y-1">
        {checks.map(c => (
          <li key={c.label} className="flex items-center gap-2 text-xs text-ink-500">
            <span style={{ color: c.pass ? '#2e6f6b' : '#b23a2e' }}>{c.pass ? '✓' : '✗'}</span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// Format datetime-local value for input
function toDatetimeLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function ArticleEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { user, can } = useAuth();

  const [form, setForm] = useState(() => ({ ...emptyForm, authorId: user.id }));
  // Safety: ensure array fields are always arrays
  const safeForm = {
    ...form,
    tags: Array.isArray(form.tags) ? form.tags : [],
    secondaryCategories: Array.isArray(form.secondaryCategories) ? form.secondaryCategories : [],
  };
  const [article, setArticle] = useState(null);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [generateWarnings, setGenerateWarnings] = useState([]);
  const [error, setError] = useState('');
  const [seoOpen, setSeoOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [contentLanguageLabel, setContentLanguageLabel] = useState('Kannada');

  const LANGUAGE_LABELS = {
    kannada: 'Kannada', hindi: 'Hindi', tamil: 'Tamil', telugu: 'Telugu',
    malayalam: 'Malayalam', marathi: 'Marathi', bengali: 'Bengali',
    gujarati: 'Gujarati', punjabi: 'Punjabi', urdu: 'Urdu', english: 'English',
  };

  useEffect(() => {
    client.get('/categories').then(r => setCategories(r.data.categories));
    if (can.manageAny) client.get('/users').then(r => setStaff(r.data.users));
    client.get('/settings').then(r => {
      const key = r.data.settings?.content_language || 'kannada';
      setContentLanguageLabel(LANGUAGE_LABELS[key] || 'Kannada');
    }).catch(() => {});
  }, [can.manageAny]);

  useEffect(() => {
    if (isNew) return;
    client.get(`/articles/${id}`)
      .then(r => {
        const a = r.data.article;
        setArticle(a);
        setForm({
          title: a.title,
          excerpt: a.excerpt || '',
          content: a.content,
          featuredImage: a.featuredImage || '',
          categoryId: a.categoryId,
          authorId: a.authorId,
          slug: a.slug || '',
          tags: Array.isArray(a.tags) ? a.tags : [],
          secondaryCategories: Array.isArray(a.secondaryCategories) ? a.secondaryCategories : [],
          seoTitle: a.seoTitle || '',
          seoDescription: a.seoDescription || '',
          focusKeyword: a.focusKeyword || '',
          imageAlt: a.imageAlt || '',
          kannadaKeyword: a.kannadaKeyword || '',
          ogImage: a.ogImage || '',
          canonicalUrl: a.canonicalUrl || '',
          noIndex: a.noIndex || false,
          scheduledAt: a.scheduledAt ? toDatetimeLocal(a.scheduledAt) : '',
        });
        setSlugEdited(true);
        if (a.seoTitle || a.seoDescription || a.focusKeyword) setSeoOpen(true);
        if (a.scheduledAt) setScheduleOpen(true);
      })
      .catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const isOwner = article ? article.authorId === user.id : true;
  const isPublished = article?.status === 'published';
  const isScheduled = isPublished && article?.scheduledAt && new Date(article.scheduledAt) > new Date();
  const readOnly = !isNew && !can.manageAny && (!isOwner || isPublished);

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

  function handleTitleChange(value) {
    setField('title', value);
    if (!slugEdited && isNew) setField('slug', slugify(value));
  }

  function handleSlugChange(value) {
    setSlugEdited(true);
    setField('slug', value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
  }

  async function handleGenerate() {
    if (!form.content || form.content.replace(/<[^>]+>/g, '').trim().length < 50) {
      setGenerateError('Write at least 50 characters of content first.');
      setSeoOpen(true);
      return;
    }
    setGenerateError('');
    setGenerateSuccess(false);
    setGenerateWarnings([]);
    setGenerating(true);
    setSeoOpen(true);
    try {
      const res = await client.post('/seo/generate', {
        title: form.title,
        content: form.content.replace(/<[^>]+>/g, ' '),
        existingArticleId: isNew ? undefined : id,
      });
      const g = res.data;
      setForm(f => ({
        ...f,
        title: g.headline || f.title,
        slug: g.slug || f.slug,
        excerpt: g.excerpt || f.excerpt,
        seoTitle: g.seoTitle || f.seoTitle,
        seoDescription: g.seoDescription || f.seoDescription,
        focusKeyword: g.focusKeyword || f.focusKeyword,
        imageAlt: g.altText || f.imageAlt,
        kannadaKeyword: g.kannadaKeyword || f.kannadaKeyword,
        // Auto-fill tags only if none exist yet, so manual tags aren't overwritten
        tags: (f.tags && f.tags.length > 0) ? f.tags : (g.tags || f.tags),
      }));
      setSlugEdited(true);
      setGenerateSuccess(true);
      if (g.warnings && g.warnings.length > 0) {
        setGenerateWarnings(g.warnings);
      }
      setTimeout(() => setGenerateSuccess(false), 4000);
    } catch (err) {
      setGenerateError(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!can.manageAny || !payload.authorId) delete payload.authorId;
      if (!payload.scheduledAt) payload.scheduledAt = null;
      if (isNew) {
        const res = await client.post('/articles', payload);
        navigate(`/articles/${res.data.article.id}`);
      } else {
        const res = await client.put(`/articles/${id}`, payload);
        setArticle(res.data.article);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function transition(nextStatus, scheduledAt) {
    setError('');
    setSaving(true);
    try {
      const savePayload = { ...form };
      if (!can.manageAny || !savePayload.authorId) delete savePayload.authorId;
      if (!savePayload.scheduledAt) savePayload.scheduledAt = null;
      await client.put(`/articles/${id}`, savePayload);

      const body = { status: nextStatus };
      if (scheduledAt) body.scheduledAt = scheduledAt;
      const res = await client.patch(`/articles/${id}/status`, body);
      setArticle(res.data.article);
      setForm(f => ({ ...f, scheduledAt: res.data.article.scheduledAt ? toDatetimeLocal(res.data.article.scheduledAt) : '' }));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule() {
    if (!form.scheduledAt) { setError('Please pick a date and time to schedule.'); return; }
    const schedDate = new Date(form.scheduledAt);
    if (schedDate <= new Date()) { setError('Scheduled time must be in the future.'); return; }
    await transition('published', schedDate.toISOString());
  }

  async function handleResync() {
    setError('');
    setResyncing(true);
    setResyncMessage('');
    try {
      const res = await client.post('/articles/' + id + '/resync');
      setArticle(res.data.article);
      setResyncMessage('Re-synced to WordPress successfully.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResyncing(false);
    }
  }

  if (loading) return <p className="font-mono text-xs uppercase tracking-widest text-ink-400 py-20 text-center">Loading…</p>;

  const statusActions = [];
  if (article) {
    if (article.status === 'draft') statusActions.push({ label: 'Submit for review', next: 'pending_review' });
    if (article.status === 'pending_review') {
      statusActions.push({ label: 'Send back to draft', next: 'draft' });
      if (can.manageAny) statusActions.push({ label: 'Publish now', next: 'published', emphasize: true });
    }
    if (article.status === 'published') {
      if (can.manageAny) statusActions.push({ label: isScheduled ? 'Cancel schedule / Unpublish' : 'Unpublish', next: 'draft' });
    }
  }

  const inputCls = (extra = '') =>
    `w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900 disabled:bg-paper-100 disabled:text-ink-400 ${extra}`;
  const labelCls = 'block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5';
  // Find selected category slug for URL preview
  const selectedCat = categories.find(c => String(c.id) === String(form.categoryId));
  const catSlug = selectedCat?.slug || 'category';
  const publicUrl = `https://kannadadunia.com/${catSlug}/${form.slug || '(slug)'}`;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/articles" className="text-xs font-mono uppercase tracking-wide text-ink-400 hover:text-press-red">← Back to articles</Link>
      </div>

      <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-ink-900">
        <h1 className="font-display font-bold text-3xl text-ink-900">{isNew ? 'Write a story' : 'Edit story'}</h1>
        {article && <StatusStamp status={article.status} scheduledAt={article.scheduledAt} />}
      </div>

      <ErrorBanner message={error} />

      {readOnly && (
        <div className="bg-amber-proof/10 border border-amber-proof/30 text-amber-proof-dark text-sm rounded px-4 py-2.5 mb-5">
          This article is published. Editing is locked — ask an editor to make changes.
        </div>
      )}

      {isScheduled && (
        <div className="bg-purple-50 border border-purple-200 text-purple-700 text-sm rounded px-4 py-2.5 mb-5 flex items-center gap-2">
          ⏰ Scheduled to go live: <strong>{new Date(article.scheduledAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</strong>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Headline */}
        <label className="block">
          <span className={labelCls}>Headline</span>
          <input required disabled={readOnly} value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
            className={inputCls('font-display text-lg')}
            placeholder="Your article headline here" />
        </label>

        {/* Permalink */}
        <div className="block">
          <span className={labelCls}>Permalink</span>
          <div className="flex items-stretch">
            <span className="flex items-center px-2.5 bg-paper-50 border border-r-0 border-paper-200 rounded-l text-xs font-mono text-ink-400 whitespace-nowrap">/article/</span>
            <input disabled={readOnly} value={form.slug}
              onChange={e => handleSlugChange(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-r border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900 font-mono text-sm disabled:bg-paper-100 disabled:text-ink-400"
              placeholder="article-url-slug" />
          </div>
          {form.slug && <p className="text-xs text-ink-400 mt-1 font-mono truncate">🔗 {publicUrl}</p>}
          <p className="text-xs text-ink-400 mt-0.5">Use English letters for the URL. e.g. <code>ksrtc-bus-fare-hike</code></p>
        </div>

        {/* Tags */}
        <div className="block">
          <span className={labelCls}>Tags</span>
          <TagInput tags={safeForm.tags} onChange={tags => setField('tags', tags)} disabled={readOnly} />
        </div>

        {/* Excerpt */}
        <label className="block">
          <span className={labelCls}>Dek / Excerpt</span>
          <textarea disabled={readOnly} rows={2} value={form.excerpt}
            onChange={e => setField('excerpt', e.target.value)}
            className={inputCls()} placeholder="One or two sentences summarizing the story." />
        </label>

        {/* Section + Byline */}
        <div className="space-y-4">
          <MultiCategorySelect
            categories={categories}
            primaryId={safeForm.categoryId}
            secondaryIds={safeForm.secondaryCategories}
            onPrimaryChange={val => setField('categoryId', val)}
            onSecondaryChange={val => setField('secondaryCategories', val)}
            disabled={readOnly}
          />
          <div className="grid grid-cols-1 gap-4">
          {can.manageAny && (
            <label className="block">
              <span className={labelCls}>Byline</span>
              <select disabled={readOnly} value={form.authorId || ''} onChange={e => setField('authorId', e.target.value)} className={inputCls()}>
                <option value={user.id}>Me ({user.name})</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
          </div>
        </div>

        {/* Featured image */}
        <div className="block">
          <span className={labelCls}>Featured image</span>
          {!readOnly && (
            <div className="mb-2">
              <ImageUpload disabled={readOnly} label="Upload from computer" onUpload={url => setField('featuredImage', url)} />
            </div>
          )}
          <input disabled={readOnly} value={form.featuredImage} onChange={e => setField('featuredImage', e.target.value)}
            className={inputCls('font-mono text-sm')} placeholder="https://… or upload above (min 1200×630px for Google Discover)" />
          {form.featuredImage && (
            <div className="mt-2 rounded overflow-hidden border border-paper-200 inline-block">
              <img src={form.featuredImage} alt="Featured" className="h-24 object-cover" />
            </div>
          )}
        </div>

        {/* Rich text story editor */}
        <div className="block">
          <span className={labelCls}>Story</span>
          <RichTextEditor
            content={form.content}
            onChange={html => setField('content', html)}
            disabled={readOnly}
            placeholder="Write your story here. Use the toolbar above to format text, add headings, lists, and blockquotes. Once done, click '✦ Generate SEO' below."
          />
        </div>

        {/* Embed video */}
        {!readOnly && (
          <EmbedBlock disabled={readOnly} onInsert={embedHtml => setField('content', form.content + embedHtml)} />
        )}

        {/* AI Generate */}
        {!readOnly && (
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={handleGenerate} disabled={generating || saving}
              className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white text-sm font-medium px-4 py-2.5 rounded transition-colors disabled:opacity-60">
              {generating ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</> : <>✦ Generate SEO</>}
            </button>
            {generateSuccess && <span className="text-xs font-mono text-wire-teal-dark bg-wire-teal/10 border border-wire-teal/20 rounded px-2 py-1">✓ Headline, slug, excerpt & SEO updated</span>}
            {generateError && <span className="text-xs text-press-red">{generateError}</span>}
            {!generating && !generateError && !generateSuccess && <span className="text-xs text-ink-400">Write your story first, then generate all SEO fields.</span>}
          </div>
        )}

        {generateWarnings.length > 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠ The AI may have included a word that doesn't belong — worth a quick check: {generateWarnings.map(w => w.replace(/^Extra English word\(s\) beyond keyword "[^"]+" in /, '').replace(':', ' — ')).join('; ')}
          </div>
        )}

        {/* SEO panel */}
        <div className="border border-paper-200 rounded overflow-hidden">
          <button type="button" onClick={() => setSeoOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-paper-50 hover:bg-paper-100 transition-colors text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">SEO & Metadata</span>
              {(form.seoTitle || form.seoDescription || form.focusKeyword) && (
                <span className="text-xs bg-wire-teal/10 text-wire-teal-dark border border-wire-teal/20 rounded px-1.5 py-0.5 font-mono">configured</span>
              )}
              {form.noIndex && <span className="text-xs bg-press-red/10 text-press-red border border-press-red/20 rounded px-1.5 py-0.5 font-mono">no-index</span>}
            </div>
            <span className="text-ink-400 text-sm">{seoOpen ? '▲' : '▼'}</span>
          </button>
          {seoOpen && (
            <div className="px-4 py-4 space-y-4 bg-white">
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={labelCls}>SEO title</span>
                  <span className={`text-xs font-mono ${form.seoTitle.length > 60 ? 'text-press-red' : 'text-ink-400'}`}>{form.seoTitle.length}/60</span>
                </div>
                <input disabled={readOnly} value={form.seoTitle} onChange={e => setField('seoTitle', e.target.value)}
                  className={inputCls()} maxLength={70} placeholder={form.title || 'Override page title…'} />
                <p className="text-xs text-ink-400 mt-1">Leave blank to use the headline. Aim 30–60 chars.</p>
              </label>
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={labelCls}>Meta description</span>
                  <span className={`text-xs font-mono ${form.seoDescription.length > 155 ? 'text-press-red' : 'text-ink-400'}`}>{form.seoDescription.length}/155</span>
                </div>
                <textarea disabled={readOnly} rows={3} value={form.seoDescription} onChange={e => setField('seoDescription', e.target.value)}
                  className={inputCls()} maxLength={320} placeholder="One or two sentences for search results…" />
              </label>
              <label className="block">
                <span className={labelCls}>Focus keyword</span>
                <input disabled={readOnly} value={form.focusKeyword} onChange={e => setField('focusKeyword', e.target.value)}
                  className={inputCls()} placeholder="e.g. KSRTC bus fare hike Karnataka" />
              </label>
              {contentLanguageLabel !== 'English' && (
                <div className="block">
                  <span className={labelCls}>{contentLanguageLabel} keyword</span>
                  <input disabled value={form.kannadaKeyword} readOnly
                    className={inputCls() + ' bg-ink-50 text-ink-500'} placeholder={contentLanguageLabel + ' equivalent, set by Generate SEO'} />
                </div>
              )}
              <div className="block">
                <span className={labelCls}>Image alt text</span>
                <input disabled value={form.imageAlt} readOnly
                  className={inputCls() + ' bg-ink-50 text-ink-500'} placeholder="Set automatically by Generate SEO" />
                <p className="text-xs text-ink-400 mt-1">Auto-set to match the slug for consistent keyword SEO.</p>
              </div>
              <div className="block">
                <span className={labelCls}>Open Graph image</span>
                {!readOnly && <div className="mb-2"><ImageUpload disabled={readOnly} label="Upload OG image" onUpload={url => setField('ogImage', url)} /></div>}
                <input disabled={readOnly} value={form.ogImage} onChange={e => setField('ogImage', e.target.value)}
                  className={inputCls('font-mono text-sm')} placeholder="https://… 1200×630px for social sharing" />
                <p className="text-xs text-ink-400 mt-1">Leave blank to use the featured image.</p>
              </div>
              <label className="block">
                <span className={labelCls}>Canonical URL</span>
                <input disabled={readOnly} value={form.canonicalUrl} onChange={e => setField('canonicalUrl', e.target.value)}
                  className={inputCls()} placeholder="https://… (only if republished from elsewhere)" />
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" disabled={readOnly} checked={form.noIndex} onChange={e => setField('noIndex', e.target.checked)}
                  className="mt-0.5 accent-press-red w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-ink-900">No-index this article</span>
                  <p className="text-xs text-ink-400 mt-0.5">Tells search engines not to index this page.</p>
                </div>
              </label>
              <SeoMeter title={form.seoTitle || form.title} description={form.seoDescription} focusKeyword={form.focusKeyword} />
              <DiscoverMeter form={form} wordCount={Math.round(form.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length)} />
              {(form.seoTitle || form.title) && (
                <div className="mt-3">
                  <p className={`${labelCls} mb-2`}>Search result preview</p>
                  <div className="border border-paper-200 rounded p-3 bg-white">
                    <p className="text-xs text-ink-400 font-mono mb-1 truncate">{publicUrl}</p>
                    <p className="text-blue-700 text-base font-medium leading-snug">{(form.seoTitle || form.title).slice(0, 60) || 'Article Title'}</p>
                    <p className="text-sm text-ink-500 mt-0.5 leading-snug">{(form.seoDescription || form.excerpt || 'No meta description set.').slice(0, 155)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schedule panel — editors/admins only */}
        {can.manageAny && article && article.status !== 'published' && (
          <div className="border border-paper-200 rounded overflow-hidden">
            <button type="button" onClick={() => setScheduleOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-paper-50 hover:bg-paper-100 transition-colors text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">⏰ Schedule Publishing</span>
                {form.scheduledAt && <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 font-mono">set</span>}
              </div>
              <span className="text-ink-400 text-sm">{scheduleOpen ? '▲' : '▼'}</span>
            </button>
            {scheduleOpen && (
              <div className="px-4 py-4 bg-white space-y-3">
                <p className="text-xs text-ink-500">Instead of publishing immediately, schedule this article to go live at a specific date and time.</p>
                <label className="block">
                  <span className={labelCls}>Publish date & time</span>
                  <input type="datetime-local" value={form.scheduledAt}
                    onChange={e => setField('scheduledAt', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className={inputCls('font-mono')} />
                </label>
                {form.scheduledAt && (
                  <p className="text-xs text-ink-400">
                    Will go live: <strong className="text-ink-700">
                      {new Date(form.scheduledAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
                    </strong>
                  </p>
                )}
                <button type="button" onClick={handleSchedule} disabled={saving || !form.scheduledAt}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2.5 rounded transition-colors disabled:opacity-60">
                  ⏰ Schedule this article
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          {!readOnly && (
            <button type="submit" disabled={saving}
              className="bg-ink-900 hover:bg-ink-800 text-white text-sm font-medium px-5 py-2.5 rounded transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : isNew ? 'Save draft' : 'Save changes'}
            </button>
          )}
          {statusActions.map(a => (
            <button key={a.next} type="button" disabled={saving} onClick={() => transition(a.next)}
              className={`text-sm font-medium px-5 py-2.5 rounded transition-colors disabled:opacity-60 ${
                a.emphasize ? 'bg-wire-teal hover:bg-wire-teal-dark text-white' : 'border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white'
              }`}>
              {a.label}
            </button>
          ))}
          {can.manageAny && isPublished && (
            <button type="button" disabled={resyncing} onClick={handleResync}
              className="text-sm font-medium px-5 py-2.5 rounded border border-ink-300 text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-60">
              {resyncing ? 'Re-syncing…' : '🔄 Re-sync to WordPress'}
            </button>
          )}
          {resyncMessage && (
            <span className="text-sm text-wire-teal-dark">{resyncMessage}</span>
          )}
        </div>
      </form>
    </div>
  );
}
