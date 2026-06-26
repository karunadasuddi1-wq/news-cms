import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import RichTextEditor from '../components/RichTextEditor';

const emptyForm = { title: '', slug: '', content: '', metaDescription: '', isPublished: true, showInFooter: true, sortOrder: 0 };

function slugify(t) {
  return t.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 80);
}

export default function Pages() {
  const [pages, setPages] = useState([]);
  const [editing, setEditing] = useState(null); // null = list, 'new' = new, id = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => { loadPages(); }, []);

  async function loadPages() {
    const res = await client.get('/pages');
    setPages(res.data.pages || []);
  }

  function startNew() { setForm(emptyForm); setSlugEdited(false); setEditing('new'); setError(''); }
  function startEdit(p) { setForm({ title: p.title, slug: p.slug, content: p.content || '', metaDescription: p.metaDescription || '', isPublished: p.isPublished, showInFooter: p.showInFooter, sortOrder: p.sortOrder }); setEditing(p.id); setSlugEdited(true); setError(''); }
  function cancel() { setEditing(null); setError(''); }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleTitle(v) {
    setField('title', v);
    if (!slugEdited) setField('slug', slugify(v));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing === 'new') {
        await client.post('/pages', form);
      } else {
        await client.put(`/pages/${editing}`, form);
      }
      await loadPages();
      setEditing(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await client.delete(`/pages/${id}`);
    await loadPages();
  }

  const inputCls = 'w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900';
  const labelCls = 'block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5';

  if (editing !== null) {
    return (
      <div className="px-8 py-10 max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={cancel} className="text-xs font-mono uppercase tracking-wide text-ink-400 hover:text-press-red">← Back to pages</button>
        </div>
        <h1 className="font-display font-bold text-3xl text-ink-900 mb-6 pb-6 border-b-2 border-ink-900">
          {editing === 'new' ? 'New Page' : 'Edit Page'}
        </h1>
        <ErrorBanner message={error} />
        <form onSubmit={handleSave} className="space-y-5">
          <label className="block">
            <span className={labelCls}>Page Title</span>
            <input required value={form.title} onChange={e => handleTitle(e.target.value)} className={inputCls} placeholder="Privacy Policy" />
          </label>
          <label className="block">
            <span className={labelCls}>URL Slug</span>
            <div className="flex items-stretch">
              <span className="flex items-center px-2.5 bg-paper-50 border border-r-0 border-paper-200 rounded-l text-xs font-mono text-ink-400">/</span>
              <input required value={form.slug} onChange={e => { setSlugEdited(true); setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }}
                className="flex-1 px-3 py-2.5 rounded-r border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 text-ink-900 font-mono text-sm"
                placeholder="privacy-policy" />
            </div>
          </label>
          <label className="block">
            <span className={labelCls}>Meta Description</span>
            <textarea rows={2} value={form.metaDescription} onChange={e => setField('metaDescription', e.target.value)} className={inputCls} placeholder="Brief description for search engines (150 chars)" />
          </label>
          <div className="block">
            <span className={labelCls}>Page Content</span>
            <RichTextEditor content={form.content} onChange={html => setField('content', html)} placeholder="Write the page content here..." />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublished} onChange={e => setField('isPublished', e.target.checked)} className="accent-press-red w-4 h-4" />
              <span className="text-sm text-ink-700">Published</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.showInFooter} onChange={e => setField('showInFooter', e.target.checked)} className="accent-press-red w-4 h-4" />
              <span className="text-sm text-ink-700">Show in footer</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm text-ink-600">Sort order:</span>
              <input type="number" value={form.sortOrder} onChange={e => setField('sortOrder', parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1.5 rounded border border-paper-200 text-sm font-mono" />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-ink-900 hover:bg-ink-800 text-white text-sm font-medium px-5 py-2.5 rounded transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Page'}
            </button>
            <button type="button" onClick={cancel} className="border border-paper-200 text-ink-600 text-sm font-medium px-5 py-2.5 rounded hover:bg-paper-50 transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-ink-900">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-ink-400 mb-1">CMS</p>
          <h1 className="font-display font-bold text-3xl text-ink-900">Pages</h1>
        </div>
        <button onClick={startNew} className="bg-press-red hover:bg-press-red/90 text-white text-sm font-medium px-4 py-2.5 rounded transition-colors">
          + New Page
        </button>
      </div>
      <div className="bg-white border border-paper-200 rounded-lg overflow-hidden">
        {pages.length === 0 && (
          <div className="text-center py-12 text-ink-400 text-sm">No pages yet. Click "+ New Page" to create one.</div>
        )}
        {pages.map(p => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-paper-50 last:border-0 hover:bg-paper-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-900 text-sm">{p.title}</p>
              <p className="text-xs font-mono text-ink-400 mt-0.5">/{p.slug}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {p.showInFooter && <span className="text-xs font-mono bg-paper-100 text-ink-500 px-2 py-0.5 rounded">footer</span>}
              {p.isPublished ? <span className="text-xs font-mono text-wire-teal-dark bg-wire-teal/10 px-2 py-0.5 rounded">published</span>
                : <span className="text-xs font-mono text-ink-400 bg-paper-100 px-2 py-0.5 rounded">draft</span>}
              <button onClick={() => startEdit(p)} className="text-xs font-mono text-ink-500 hover:text-press-red px-2 py-1 transition-colors">Edit</button>
              <button onClick={() => handleDelete(p.id, p.title)} className="text-xs font-mono text-ink-300 hover:text-press-red px-2 py-1 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-400 font-mono mt-4">Pages appear in the footer of your public site. Use them for Privacy Policy, About Us, Contact, etc.</p>
    </div>
  );
}
