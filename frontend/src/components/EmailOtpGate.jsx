import { useState } from 'react';
import client from '../api/client';

export default function EmailOtpGate({ token, onVerified }) {
  const [stage, setStage] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleRequestCode(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email.trim()) return;
    setSending(true);
    try {
      await client.post('/public/guest-otp/request', { email: email.trim(), token });
      setInfo('Check your email for a 6-digit code.');
      setStage('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the code. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (!code.trim()) return;
    setSending(true);
    try {
      const res = await client.post('/public/guest-otp/verify', { email: email.trim(), code: code.trim(), token });
      onVerified(res.data.sessionToken, res.data.email);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect code. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-50 px-6">
      <div className="max-w-sm w-full">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-400 mb-2 text-center">
          Contributor Desk
        </p>
        <h1 className="font-display font-bold text-2xl text-ink-900 mb-1 text-center">
          Verify your email
        </h1>
        <p className="text-sm text-ink-500 mb-6 text-center">
          {stage === 'email'
            ? "We'll send a one-time code to confirm it's really you."
            : `Enter the code we sent to ${email}.`}
        </p>

        {error && (
          <div className="bg-press-red/10 border border-press-red/30 text-press-red text-sm rounded px-4 py-2.5 mb-4">
            {error}
          </div>
        )}
        {info && stage === 'code' && (
          <div className="bg-wire-teal/10 border border-wire-teal/20 text-wire-teal-dark text-sm rounded px-4 py-2.5 mb-4">
            {info}
          </div>
        )}

        {stage === 'email' ? (
          <form onSubmit={handleRequestCode}>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full border border-paper-200 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-press-red/20 focus:border-press-red/40 mb-3"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-press-red hover:bg-press-red-dark text-white text-sm font-semibold py-2.5 rounded transition-colors disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              autoFocus
              className="w-full border border-paper-200 rounded px-3 py-2.5 text-lg text-center tracking-[0.5em] font-mono bg-white focus:outline-none focus:ring-2 focus:ring-press-red/20 focus:border-press-red/40 mb-3"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-press-red hover:bg-press-red-dark text-white text-sm font-semibold py-2.5 rounded transition-colors disabled:opacity-60"
            >
              {sending ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => { setStage('email'); setCode(''); setError(''); }}
              className="w-full text-xs text-ink-400 hover:text-ink-700 mt-3"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
