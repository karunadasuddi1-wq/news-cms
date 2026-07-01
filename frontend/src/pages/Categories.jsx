import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import Modal from '../components/Modal';
import ErrorBanner from '../components/ErrorBanner';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    client
      .get('/categories')
      .then((res) => setCategories(res.data.categories))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = {
      name: e.target.name.value,
      description: e.target.description.value,
    };
    try {
      if (editing.id) {
        await client.put(`/categories/${editing.id}`, payload);
      } else {
        await client.post('/categories', payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    setError('');
    try {
      await client.delete(`/categories/${category.id}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-6 pb-6 border-b-2 border-ink-900">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400 mb-1">
            Desk Map
          </p>
          <h1 className="font-display font-bold text-3xl text-ink-900">Categories</h1>
        </div>
        <button
          onClick={() => setEditing({})}
          className="bg-press-red hover:bg-press-red-dark text-white text-sm font-medium px-5 py-2.5 rounded transition-colors"
        >
          + New category
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="font-mono text-xs uppercase tracking-widest text-ink-400 py-12 text-center">
          Loading…
        </p>
      ) : (
        <div className="bg-white border border-paper-200 rounded-lg divide-y divide-paper-100">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="font-medium text-ink-900">{c.name}</p>
                <p className="text-xs text-ink-400 font-mono">/{c.slug}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(c)}
                  className="text-xs font-medium text-ink-600 hover:text-ink-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="text-xs font-medium text-ink-400 hover:text-press-red"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit category' : 'New category'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave}>
            <ErrorBanner message={formError} />
            <label className="block mb-4">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
                Name
              </span>
              <input
                name="name"
                required
                defaultValue={editing.name || ''}
                className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
              />
            </label>
            <label className="block mb-5">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
                Description (optional)
              </span>
              <textarea
                name="description"
                rows={2}
                defaultValue={editing.description || ''}
                className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-ink-900 hover:bg-ink-800 text-white font-medium py-2.5 rounded transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
