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
    wp_configured: !!(map.wp_app_password || process.env.WP_APP_PASSWORD),
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
    'groq_api_key', 'mistral_api_key', 'openai_model', 'gemini_model',
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
