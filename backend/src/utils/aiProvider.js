/**
 * aiProvider.js
 * Unified interface for multiple AI providers.
 * Reads active provider and API keys from DB settings,
 * falls back to environment variables.
 */

const https = require('https');
const { getSetting } = require('../controllers/settingController');

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname, port: 443, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
      timeout: 90000,
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(data);
    req.end();
  });
}

async function callAnthropic(apiKey, systemPrompt, userPrompt, maxTokens) {
  const res = await httpsPost('api.anthropic.com', '/v1/messages',
    { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    { model: 'claude-sonnet-4-6', max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }
  );
  if (res.status !== 200) throw new Error(res.data?.error?.message || `Anthropic error (${res.status})`);
  return res.data.content?.find(b => b.type === 'text')?.text || '';
}

async function callOpenAI(apiKey, systemPrompt, userPrompt, maxTokens, model = 'gpt-4o') {
  const res = await httpsPost('api.openai.com', '/v1/chat/completions',
    { 'Authorization': `Bearer ${apiKey}` },
    { model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }
  );
  if (res.status !== 200) throw new Error(res.data?.error?.message || `OpenAI error (${res.status})`);
  return res.data.choices?.[0]?.message?.content || '';
}

async function callGemini(apiKey, systemPrompt, userPrompt, maxTokens, model = 'gemini-1.5-flash') {
  const res = await httpsPost('generativelanguage.googleapis.com',
    `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {},
    { contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }], generationConfig: { maxOutputTokens: maxTokens } }
  );
  if (res.status !== 200) throw new Error(res.data?.error?.message || `Gemini error (${res.status})`);
  return res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGroq(apiKey, systemPrompt, userPrompt, maxTokens, model = 'llama-3.1-70b-versatile') {
  const res = await httpsPost('api.groq.com', '/openai/v1/chat/completions',
    { 'Authorization': `Bearer ${apiKey}` },
    { model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }
  );
  if (res.status !== 200) throw new Error(res.data?.error?.message || `Groq error (${res.status})`);
  return res.data.choices?.[0]?.message?.content || '';
}

async function callMistral(apiKey, systemPrompt, userPrompt, maxTokens, model = 'mistral-large-latest') {
  const res = await httpsPost('api.mistral.ai', '/v1/chat/completions',
    { 'Authorization': `Bearer ${apiKey}` },
    { model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }
  );
  if (res.status !== 200) throw new Error(res.data?.error?.message || `Mistral error (${res.status})`);
  return res.data.choices?.[0]?.message?.content || '';
}

/**
 * Main function — call this from any controller
 * Automatically picks the active provider and API key
 */
async function callAI(systemPrompt, userPrompt, maxTokens = 4000) {
  const provider = await getSetting('ai_provider', null) || 'anthropic';
  console.log(`[ai-provider] Using provider: ${provider}`);

  switch (provider) {
    case 'openai': {
      const key = await getSetting('openai_api_key', 'OPENAI_API_KEY');
      if (!key) throw new Error('OpenAI API key not configured.');
      const model = await getSetting('openai_model', null) || 'gpt-4o';
      return callOpenAI(key, systemPrompt, userPrompt, maxTokens, model);
    }
    case 'gemini': {
      const key = await getSetting('gemini_api_key', 'GEMINI_API_KEY');
      if (!key) throw new Error('Google Gemini API key not configured.');
      const model = await getSetting('gemini_model', null) || 'gemini-1.5-flash';
      return callGemini(key, systemPrompt, userPrompt, maxTokens, model);
    }
    case 'groq': {
      const key = await getSetting('groq_api_key', 'GROQ_API_KEY');
      if (!key) throw new Error('Groq API key not configured.');
      return callGroq(key, systemPrompt, userPrompt, maxTokens);
    }
    case 'mistral': {
      const key = await getSetting('mistral_api_key', 'MISTRAL_API_KEY');
      if (!key) throw new Error('Mistral API key not configured.');
      return callMistral(key, systemPrompt, userPrompt, maxTokens);
    }
    case 'anthropic':
    default: {
      const key = await getSetting('anthropic_api_key', 'ANTHROPIC_API_KEY');
      if (!key) throw new Error('Anthropic API key not configured.');
      return callAnthropic(key, systemPrompt, userPrompt, maxTokens);
    }
  }
}

module.exports = { callAI };
