const { Setting } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/settings — returns all settings (admin only shows provider status, not keys)
const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.findAll({ order: [['key', 'ASC']] });
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });

  // Never expose API keys to frontend — just show if configured
  const safeMap = {
    site_name: map.site_name || '',
    site_url: map.site_url || '',
    ai_provider: map.ai_provider || 'anthropic',
    wp_sync_enabled: map.wp_sync_enabled || 'true',
    anthropic_key_set: !!(map.anthropic_api_key || process.env.ANTHROPIC_API_KEY),
    openai_key_set: !!map.openai_api_key,
    gemini_key_set: !!map.gemini_api_key,
    groq_key_set: !!map.groq_api_key,
    mistral_key_set: !!map.mistral_api_key,
    deepseek_key_set: !!map.deepseek_api_key,
    anthropic_model: map.anthropic_model || 'claude-sonnet-4-6',
    openai_model: map.openai_model || 'gpt-5.5',
    gemini_model: map.gemini_model || 'gemini-3.5-flash',
    groq_model: map.groq_model || 'openai/gpt-oss-20b',
    mistral_model: map.mistral_model || 'mistral-large-latest',
    deepseek_model: map.deepseek_model || 'deepseek-v4-flash',
    wp_site_url: map.wp_site_url || process.env.WP_SITE_URL || '',
    wp_username: map.wp_username || process.env.WP_APP_USER || '',
    wp_configured: !!(map.wp_app_password || process.env.WP_APP_PASSWORD),
    site_logo_url: map.site_logo_url || '',
    wp_inject_schema: map.wp_inject_schema || 'false',
    activity_idle_threshold_minutes: map.activity_idle_threshold_minutes || '5',
    content_language: map.content_language || 'kannada',
    guest_submission_token: map.guest_submission_token || '',
    ga4_property_id: map.ga4_property_id || '',
    ai_daily_request_limit: map.ai_daily_request_limit || '500',
    ga4_configured: !!map.ga4_service_account_json,
  };
  res.json({ settings: safeMap });
});

// PUT /api/settings — admin only, update settings
const updateSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only.' });
  }

  const allowed = [
    'site_name', 'site_url', 'ai_provider', 'wp_sync_enabled',
    'anthropic_api_key', 'openai_api_key', 'gemini_api_key',
    'groq_api_key', 'mistral_api_key', 'deepseek_api_key',
    'anthropic_model', 'openai_model', 'gemini_model', 'groq_model', 'mistral_model', 'deepseek_model',
    'wp_site_url', 'wp_username', 'wp_app_password',
    'wp_category_map', 'wp_default_category_id',
    'site_logo_url', 'wp_inject_schema',
    'activity_idle_threshold_minutes',
    'content_language',
    'guest_submission_token',
    'ga4_property_id', 'ga4_service_account_json',
    'ai_daily_request_limit',
  ];

  for (const [key, value] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    await Setting.upsert({ key, value: value || null });
  }

  res.json({ ok: true, message: 'Settings saved.' });
});

// Helper: get a single setting value (used by other controllers)
async function getSetting(key, fallbackEnv = null) {
  try {
    const s = await Setting.findOne({ where: { key } });
    if (s && s.value) return s.value;
    if (fallbackEnv && process.env[fallbackEnv]) return process.env[fallbackEnv];
    return null;
  } catch {
    if (fallbackEnv && process.env[fallbackEnv]) return process.env[fallbackEnv];
    return null;
  }
}

module.exports = { getSettings, updateSettings, getSetting };
