import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';

const labelCls = 'block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5';
const inputCls = 'w-full border border-paper-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-press-red/20 focus:border-press-red/40 bg-white';
const selectCls = `${inputCls} cursor-pointer`;

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)', models: ['claude-sonnet-4-6', 'claude-sonnet-5'] },
  { value: 'openai', label: 'OpenAI (ChatGPT)', models: ['gpt-5.5', 'gpt-5.5-pro'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-3.5-flash', 'gemini-3.1-flash-lite'] },
  { value: 'groq', label: 'Groq (Llama)', models: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'] },
  { value: 'mistral', label: 'Mistral AI', models: ['mistral-large-latest'] },
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
];

// Manually maintained model status notes. Add an entry here whenever a provider announces
// a deprecation or a newer recommended model, so users see a heads-up before anything breaks.
// status: 'legacy' = still works, but a newer model is recommended.
//         'retiring' = has an announced shutdown date — upgrade before then.
const MODEL_INFO = {
  'claude-sonnet-4-6': {
    status: 'legacy',
    message: 'Still fully supported. claude-sonnet-5 (newer, stronger on agentic/coding tasks) is now available.',
  },
  // Example of how to flag an upcoming retirement once a date is announced:
  // 'some-model-id': { status: 'retiring', message: 'Retires Aug 2026 — switch to some-newer-model.' },
};

function StatusBadge({ configured }) {
  return configured
    ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-wire-teal/10 text-wire-teal-dark border border-wire-teal/20">✓ Configured</span>
    : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-press-red/10 text-press-red border border-press-red/20">✗ Not set</span>;
}

function ModelWarning({ model }) {
  const info = MODEL_INFO[model];
  if (!info) return null;
  const isRetiring = info.status === 'retiring';
  return (
    <p className={`text-[10px] mt-1 leading-snug ${isRetiring ? 'text-press-red' : 'text-amber-600'}`}>
      {isRetiring ? '⚠ ' : 'ℹ '}{info.message}
    </p>
  );
}

export default function Settings() {
  const { can } = useAuth();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wpTesting, setWpTesting] = useState(false);
  const [wpStatus, setWpStatus] = useState(null);

  const [form, setForm] = useState({
    site_name: '',
    site_url: '',
    ai_provider: 'anthropic',
    wp_sync_enabled: 'true',
    anthropic_api_key: '',
    anthropic_model: 'claude-sonnet-4-6',
    openai_api_key: '',
    openai_model: 'gpt-5.5',
    gemini_api_key: '',
    gemini_model: 'gemini-3.5-flash',
    groq_api_key: '',
    groq_model: 'openai/gpt-oss-20b',
    mistral_api_key: '',
    mistral_model: 'mistral-large-latest',
    deepseek_api_key: '',
    deepseek_model: 'deepseek-v4-flash',
    wp_site_url: '',
    wp_username: '',
    wp_app_password: '',
    site_logo_url: '',
    wp_inject_schema: 'false',
    activity_idle_threshold_minutes: '5',
    content_language: 'kannada',
    guest_submission_token: '',
    ga4_property_id: '',
    ga4_service_account_json: '',
    ai_daily_request_limit: '500',
  });

  useEffect(() => {
    client.get('/settings')
      .then(r => {
        const s = r.data.settings;
        setSettings(s);
        setForm(f => ({
          ...f,
          site_name: s.site_name || '',
          site_url: s.site_url || '',
          ai_provider: s.ai_provider || 'anthropic',
          wp_sync_enabled: s.wp_sync_enabled || 'true',
          wp_site_url: s.wp_site_url || '',
          wp_username: s.wp_username || '',
          site_logo_url: s.site_logo_url || '',
          wp_inject_schema: s.wp_inject_schema || 'false',
          activity_idle_threshold_minutes: s.activity_idle_threshold_minutes || '5',
          content_language: s.content_language || 'kannada',
          guest_submission_token: s.guest_submission_token || '',
          ga4_property_id: s.ga4_property_id || '',
          ai_daily_request_limit: s.ai_daily_request_limit || '500',
          anthropic_model: s.anthropic_model || 'claude-sonnet-4-6',
          openai_model: s.openai_model || 'gpt-5.5',
          gemini_model: s.gemini_model || 'gemini-3.5-flash',
          groq_model: s.groq_model || 'openai/gpt-oss-20b',
          mistral_model: s.mistral_model || 'mistral-large-latest',
          deepseek_model: s.deepseek_model || 'deepseek-v4-flash',
        }));
      })
      .catch(err => setError(apiErrorMessage(err)));
  }, []);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        site_name: form.site_name,
        site_url: form.site_url,
        ai_provider: form.ai_provider,
        wp_sync_enabled: form.wp_sync_enabled,
        anthropic_model: form.anthropic_model,
        openai_model: form.openai_model,
        gemini_model: form.gemini_model,
        groq_model: form.groq_model,
        mistral_model: form.mistral_model,
        deepseek_model: form.deepseek_model,
      };
      payload.wp_site_url = form.wp_site_url;
      payload.wp_username = form.wp_username;
      if (form.wp_app_password) payload.wp_app_password = form.wp_app_password;
      payload.site_logo_url = form.site_logo_url;
      payload.wp_inject_schema = form.wp_inject_schema;
      payload.activity_idle_threshold_minutes = form.activity_idle_threshold_minutes;
      payload.content_language = form.content_language;
      payload.guest_submission_token = form.guest_submission_token;
      payload.ga4_property_id = form.ga4_property_id;
      payload.ai_daily_request_limit = form.ai_daily_request_limit;
      if (form.ga4_service_account_json) payload.ga4_service_account_json = form.ga4_service_account_json;
      // Only send API keys if they were filled in
      if (form.anthropic_api_key) payload.anthropic_api_key = form.anthropic_api_key;
      if (form.openai_api_key) payload.openai_api_key = form.openai_api_key;
      if (form.gemini_api_key) payload.gemini_api_key = form.gemini_api_key;
      if (form.groq_api_key) payload.groq_api_key = form.groq_api_key;
      if (form.mistral_api_key) payload.mistral_api_key = form.mistral_api_key;
      if (form.deepseek_api_key) payload.deepseek_api_key = form.deepseek_api_key;

      await client.put('/settings', payload);
      setSuccess('Settings saved successfully.');
      // Refresh settings
      const r = await client.get('/settings');
      setSettings(r.data.settings);
      // Clear key fields
      setForm(f => ({ ...f, anthropic_api_key: '', openai_api_key: '', gemini_api_key: '', groq_api_key: '', mistral_api_key: '', wp_app_password: '', ga4_service_account_json: '' }));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function testWp() {
    setWpTesting(true); setWpStatus(null);
    try {
      const r = await client.get('/wp-sync/test');
      setWpStatus({ ok: true, message: r.data.message });
    } catch (err) {
      setWpStatus({ ok: false, message: apiErrorMessage(err) });
    } finally {
      setWpTesting(false);
    }
  }

  if (!can.manageUsers) {
    return <div className="px-8 py-16 text-center text-ink-400 text-sm">Admin access required.</div>;
  }

  const activeProvider = PROVIDERS.find(p => p.value === form.ai_provider);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">Settings</h1>
      <p className="text-sm text-ink-500 mb-6">Manage site configuration, AI providers, and integrations.</p>

      <ErrorBanner message={error} />
      {success && <div className="bg-wire-teal/10 border border-wire-teal/20 text-wire-teal-dark text-sm rounded px-4 py-2.5 mb-4">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6">

        {/* Site Identity */}
        <div className="border border-paper-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-paper-50 border-b border-paper-200">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">🏢 Site Identity</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>Site Name</label>
              <input className={inputCls} value={form.site_name} onChange={e => setField('site_name', e.target.value)} placeholder="Karunada Suddi" />
            </div>
            <div>
              <label className={labelCls}>Site URL</label>
              <input className={inputCls} type="url" value={form.site_url} onChange={e => setField('site_url', e.target.value)} placeholder="https://karunadasuddi.in" />
            </div>
            <div>
              <label className={labelCls}>Site Logo URL</label>
              <input className={inputCls} type="url" value={form.site_logo_url} onChange={e => setField('site_logo_url', e.target.value)} placeholder="https://example.com/logo.png" />
              <p className="text-xs text-ink-400 mt-1">Used in schema markup (publisher logo). Optional.</p>
            </div>
          </div>
        </div>

        {/* Content Language */}
        <div className="border border-paper-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-paper-50 border-b border-paper-200">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">🌐 Content Language</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>Language</label>
              <select className={selectCls} value={form.content_language} onChange={e => setField('content_language', e.target.value)}>
                <option value="kannada">Kannada</option>
                <option value="hindi">Hindi</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
                <option value="malayalam">Malayalam</option>
                <option value="marathi">Marathi</option>
                <option value="bengali">Bengali</option>
                <option value="gujarati">Gujarati</option>
                <option value="punjabi">Punjabi</option>
                <option value="urdu">Urdu</option>
                <option value="english">English</option>
              </select>
              <p className="text-xs text-ink-400 mt-1">
                Controls the language used by AI Writer and Generate SEO. Regional languages use a single English keyword mixed into native-script text; English uses standard SEO keyword phrases.
              </p>
            </div>
          </div>
        </div>

        {/* AI Provider */}
        <div className="border border-paper-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-paper-50 border-b border-paper-200 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">✦ AI Provider</h2>
            <span className="text-xs text-ink-400">Active: <strong className="text-ink-700">{activeProvider?.label}</strong></span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>Active Provider</label>
              <select className={selectCls} value={form.ai_provider} onChange={e => setField('ai_provider', e.target.value)}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Provider status cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROVIDERS.map(p => {
                const keyField = `${p.value}_api_key`;
                const isSet = settings?.[`${p.value}_key_set`];
                const isActive = form.ai_provider === p.value;
                return (
                  <div key={p.value} className={`border rounded-lg p-3 ${isActive ? 'border-press-red/30 bg-press-red/5' : 'border-paper-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-ink-700">{p.label}</span>
                      <StatusBadge configured={isSet} />
                    </div>
                    <input
                      className="w-full border border-paper-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-press-red/30 bg-white font-mono"
                      type="password"
                      placeholder={isSet ? '••••••••••••••• (leave blank to keep)' : 'Enter API key...'}
                      value={form[keyField] || ''}
                      onChange={e => setField(keyField, e.target.value)}
                      autoComplete="off"
                    />
                    <select
                      className="w-full mt-1.5 border border-paper-200 rounded px-2.5 py-1.5 text-xs bg-white"
                      value={form[`${p.value}_model`]}
                      onChange={e => setField(`${p.value}_model`, e.target.value)}
                    >
                      {p.models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ModelWarning model={form[`${p.value}_model`]} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-ink-400">API keys are stored securely and never shown after saving. Leave blank to keep existing key.</p>
          </div>
        </div>

        {/* WordPress Integration */}
        <div className="border border-paper-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-paper-50 border-b border-paper-200 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">🔄 WordPress Integration</h2>
            <StatusBadge configured={settings?.wp_configured} />
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>WordPress Site URL</label>
              <input
                type="text"
                value={form.wp_site_url}
                onChange={e => setField('wp_site_url', e.target.value)}
                placeholder="https://kannadadunia.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>WordPress Username</label>
              <input
                type="text"
                value={form.wp_username}
                onChange={e => setField('wp_username', e.target.value)}
                placeholder="Sunil"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Application Password</label>
              <input
                type="password"
                value={form.wp_app_password}
                onChange={e => setField('wp_app_password', e.target.value)}
                placeholder="•••• •••• •••• •••• •••• ••••  (leave blank to keep)"
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.wp_sync_enabled === 'true'}
                  onChange={e => setField('wp_sync_enabled', e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 accent-press-red"
                />
                <span className="text-sm text-ink-700">Auto-sync articles to WordPress on publish</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.wp_inject_schema === 'true'}
                  onChange={e => setField('wp_inject_schema', e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 accent-press-red"
                />
                <span className="text-sm text-ink-700">Inject NewsArticle schema markup into WordPress posts</span>
              </label>
            </div>
            <p className="text-xs text-ink-400">Leave off if an SEO plugin (Rank Math, Yoast, etc.) already handles schema on this site — enabling both causes duplicate/conflicting schema.</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={testWp} disabled={wpTesting}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wide border border-paper-200 rounded hover:bg-paper-50 transition-colors disabled:opacity-60">
                {wpTesting ? 'Testing…' : 'Test Connection'}
              </button>
              {wpStatus && (
                <span className={`text-xs font-mono ${wpStatus.ok ? 'text-wire-teal-dark' : 'text-press-red'}`}>
                  {wpStatus.ok ? '✓' : '✗'} {wpStatus.message}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-paper-200 rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-paper-100">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">⏱ Activity Tracking</h2>
          </div>
          <div className="p-4">
            <label className={labelCls}>Idle threshold (minutes)</label>
            <input
              type="number"
              min="1"
              max="120"
              value={form.activity_idle_threshold_minutes}
              onChange={e => setField('activity_idle_threshold_minutes', e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-ink-400 mt-1">
              Gaps between actions longer than this are not counted as active time on the Staff page's activity report — e.g. leaving a tab open during a long break.
            </p>
          </div>
        </div>

        <div className="bg-white border border-paper-200 rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-paper-100">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">🔗 Guest Submission Link</h2>
          </div>
          <div className="p-4">
            <p className="text-xs text-ink-400 mb-3">
              Share a link with outside contributors to let them submit an article without a CMS login. Submissions always land as a draft for an editor to review — never auto-published.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={form.guest_submission_token ? `${window.location.origin}/submit/${form.guest_submission_token}` : 'No link generated yet'}
                className={inputCls + ' bg-ink-50 text-ink-500 font-mono text-xs'}
              />
              <button
                type="button"
                onClick={() => {
                  const newToken = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
                  setField('guest_submission_token', newToken);
                }}
                className="text-xs font-medium px-3 py-2.5 rounded border border-ink-300 text-ink-700 hover:bg-ink-50 whitespace-nowrap"
              >
                {form.guest_submission_token ? 'Regenerate' : 'Generate Link'}
              </button>
              {form.guest_submission_token && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/submit/${form.guest_submission_token}`)}
                  className="text-xs font-medium px-3 py-2.5 rounded border border-ink-300 text-ink-700 hover:bg-ink-50 whitespace-nowrap"
                >
                  Copy
                </button>
              )}
              {form.guest_submission_token && (
                <button
                  type="button"
                  onClick={() => setField('guest_submission_token', '')}
                  className="text-xs font-medium px-3 py-2.5 rounded border border-press-red/30 text-press-red hover:bg-press-red/5 whitespace-nowrap"
                >
                  Revoke
                </button>
              )}
            </div>
            <p className="text-xs text-ink-400 mt-2">
              Regenerating or revoking immediately invalidates the old link — remember to click Save Settings below for this to take effect.
            </p>
          </div>
        </div>

        <div className="bg-white border border-paper-200 rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-paper-100 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">📊 Google Analytics Integration</h2>
            <StatusBadge configured={settings?.ga4_configured} />
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-ink-400">
              Pulls real pageview counts from GA4 into Analytics and Dashboard, replacing the internal counter (which only tracks traffic to PublisherOS's own public API, not WordPress readers). Requires a GA4 service account — see the onboarding runbook for the full setup steps.
            </p>
            <div>
              <label className={labelCls}>GA4 Property ID</label>
              <input className={inputCls} type="text" value={form.ga4_property_id}
                onChange={e => setField('ga4_property_id', e.target.value)} placeholder="e.g. 123456789" />
            </div>
            <div>
              <label className={labelCls}>Service Account JSON</label>
              <textarea
                className={inputCls + ' font-mono text-xs'}
                rows={4}
                value={form.ga4_service_account_json}
                onChange={e => setField('ga4_service_account_json', e.target.value)}
                placeholder={settings?.ga4_configured ? '•••••••• (leave blank to keep existing key)' : 'Paste the full contents of the downloaded .json key file here'}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-paper-200 rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-paper-100">
            <h2 className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">🤖 AI Daily Budget</h2>
          </div>
          <div className="p-4">
            <label className={labelCls}>Daily AI request limit</label>
            <input
              type="number"
              min="1"
              value={form.ai_daily_request_limit}
              onChange={e => setField('ai_daily_request_limit', e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-ink-400 mt-1">
              Shown as a progress bar on the Dashboard's "AI Usage Today" widget — informational only, doesn't actually block requests once reached.
            </p>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold py-3 rounded transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
