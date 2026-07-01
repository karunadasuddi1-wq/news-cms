import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ErrorBanner from '../components/ErrorBanner';

const ROLE_COLORS = {
  admin: 'var(--color-press-red)',
  editor: 'var(--color-wire-teal)',
  author: 'var(--color-amber-proof)',
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    client
      .get('/users')
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const form = e.target;
    const payload = {
      name: form.name.value,
      role: form.role.value,
      bio: form.bio.value || null,
      avatar: form.avatar.value || null,
      socialLinks: {
        twitter: form.twitter.value || null,
        instagram: form.instagram.value || null,
        facebook: form.facebook.value || null,
      },
    };
    if (!editing.id) {
      payload.email = form.email.value;
      payload.password = form.password.value;
    } else if (form.password.value) {
      payload.password = form.password.value;
    }

    try {
      if (editing.id) {
        await client.put(`/users/${editing.id}`, payload);
      } else {
        await client.post('/users', payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u) {
    setError('');
    try {
      await client.put(`/users/${u.id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete ${u.name}? This can't be undone.`)) return;
    setError('');
    try {
      await client.delete(`/users/${u.id}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      <div className="flex items-end justify-between mb-6 pb-6 border-b-2 border-ink-900">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400 mb-1">
            Masthead
          </p>
          <h1 className="font-display font-bold text-3xl text-ink-900">Staff</h1>
        </div>
        <button
          onClick={() => setEditing({})}
          className="bg-press-red hover:bg-press-red-dark text-white text-sm font-medium px-5 py-2.5 rounded transition-colors"
        >
          + Add staff member
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="font-mono text-xs uppercase tracking-widest text-ink-400 py-12 text-center">
          Loading…
        </p>
      ) : (
        <div className="bg-white border border-paper-200 rounded-lg divide-y divide-paper-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-paper-100 flex items-center justify-center font-display font-bold text-sm text-ink-700 shrink-0">
                  {u.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 truncate">
                    {u.name} {u.id === currentUser.id && <span className="text-ink-400 text-xs">(you)</span>}
                  </p>
                  <p className="text-xs text-ink-400 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span
                  className="stamp"
                  style={{ color: ROLE_COLORS[u.role], transform: 'rotate(0deg)' }}
                >
                  {u.role}
                </span>
                {!u.isActive && (
                  <span className="text-xs font-mono uppercase text-ink-400">Inactive</span>
                )}
                <button
                  onClick={() => toggleActive(u)}
                  disabled={u.id === currentUser.id}
                  className="text-xs font-medium text-ink-600 hover:text-ink-900 disabled:opacity-30"
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setEditing(u)}
                  className="text-xs font-medium text-ink-600 hover:text-ink-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  disabled={u.id === currentUser.id}
                  className="text-xs font-medium text-ink-400 hover:text-press-red disabled:opacity-30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? `Edit ${editing.name}` : 'Add staff member'} onClose={() => setEditing(null)}>
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

            {!editing.id && (
              <label className="block mb-4">
                <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
                />
              </label>
            )}

            <label className="block mb-4">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
                Role
              </span>
              <select
                name="role"
                defaultValue={editing.role || 'author'}
                className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
              >
                <option value="author">Author — writes, can't publish</option>
                <option value="editor">Editor — manages and publishes any story</option>
                <option value="admin">Admin — full access, manages staff</option>
              </select>
            </label>

            <label className="block mb-5">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
                {editing.id ? 'New password (leave blank to keep current)' : 'Password'}
              </span>
              <input
                name="password"
                type="password"
                required={!editing.id}
                minLength={8}
                className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
                placeholder={editing.id ? '••••••••' : 'At least 8 characters'}
              />
            </label>

            <label className="block mb-4">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">Bio</span>
              <textarea
                name="bio"
                rows={3}
                defaultValue={editing.bio || ''}
                placeholder="Short author bio shown on articles..."
                className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900 text-sm"
              />
            </label>

            <label className="block mb-4">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">Avatar URL</span>
              <input
                name="avatar"
                type="url"
                defaultValue={editing.avatar || ''}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
              />
              {editing.avatar && <img src={editing.avatar} alt="" className="mt-2 h-12 w-12 rounded-full object-cover border border-paper-200" />}
            </label>

            <div className="mb-5">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-2">Social Links</span>
              <div className="space-y-2">
                <input name="twitter" type="url" defaultValue={editing.socialLinks?.twitter || ''} placeholder="Twitter/X URL" className="w-full px-3 py-2 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 text-ink-900 text-sm" />
                <input name="instagram" type="url" defaultValue={editing.socialLinks?.instagram || ''} placeholder="Instagram URL" className="w-full px-3 py-2 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 text-ink-900 text-sm" />
                <input name="facebook" type="url" defaultValue={editing.socialLinks?.facebook || ''} placeholder="Facebook URL" className="w-full px-3 py-2 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 text-ink-900 text-sm" />
              </div>
            </div>

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
