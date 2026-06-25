import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 27px, #fff 27px, #fff 28px)',
        }}
      />
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-baseline gap-1.5">
            <span className="font-display font-black text-3xl text-paper-50 tracking-tight">
              NEWSROOM
            </span>
            <span className="text-press-red text-3xl leading-none">.</span>
          </div>
          <p className="mt-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-ink-400">
            ಕನ್ನಡದುನಿಯಾ CMS — Staff Sign In
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-paper-50 rounded-lg shadow-2xl p-7 border-t-4 border-press-red"
        >
          <ErrorBanner message={error} />

          <label className="block mb-4">
            <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
              placeholder="you@newsroom.com"
            />
          </label>

          <label className="block mb-6">
            <span className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-press-red hover:bg-press-red-dark text-white font-medium py-2.5 rounded transition-colors disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center mt-5 text-[11px] font-mono text-ink-400">
          Ask an admin if you need an account.
        </p>
      </div>
    </div>
  );
}
