jest.mock('../../src/controllers/settingController', () => ({
  getSetting: jest.fn(),
}));
jest.mock('../../src/utils/usageTracker', () => ({
  logUsage: jest.fn().mockResolvedValue(0),
}));

const https = require('https');
const { EventEmitter } = require('events');

jest.mock('https');

function mockHttpsResponse(responseBody) {
  https.request.mockImplementation((opts, callback) => {
    const res = new EventEmitter();
    res.statusCode = 200;
    callback(res);
    process.nextTick(() => {
      res.emit('data', Buffer.from(JSON.stringify(responseBody)));
      res.emit('end');
    });
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn();
    req.on = jest.fn();
    return req;
  });
}

const { getSetting } = require('../../src/controllers/settingController');
const { callAI } = require('../../src/utils/aiProvider');

describe('callAI — per-task provider selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the task-specific provider when one is configured for that task', async () => {
    mockHttpsResponse({ content: [{ text: 'anthropic response' }] });

    getSetting.mockImplementation((key) => {
      if (key === 'seo_ai_provider') return Promise.resolve('anthropic');
      if (key === 'ai_provider') return Promise.resolve('gemini');
      if (key === 'anthropic_api_key') return Promise.resolve('fake-anthropic-key');
      if (key === 'anthropic_model') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    await callAI('system', 'user', 900, { providerSettingKey: 'seo_ai_provider' });

    const calledHostname = https.request.mock.calls[0][0].hostname;
    expect(calledHostname).toContain('anthropic');
  });

  it('falls back to the global ai_provider setting when no task-specific override is configured', async () => {
    mockHttpsResponse({ candidates: [{ content: { parts: [{ text: 'gemini response' }] } }] });

    getSetting.mockImplementation((key) => {
      if (key === 'ai_writer_provider') return Promise.resolve(null);
      if (key === 'ai_provider') return Promise.resolve('gemini');
      if (key === 'gemini_api_key') return Promise.resolve('fake-gemini-key');
      if (key === 'gemini_model') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    await callAI('system', 'user', 4000, { providerSettingKey: 'ai_writer_provider' });

    const calledHostname = https.request.mock.calls[0][0].hostname;
    expect(calledHostname).toContain('generativelanguage');
  });

  it('two different tasks can use two genuinely different providers at the same time', async () => {
    getSetting.mockImplementation((key) => {
      if (key === 'seo_ai_provider') return Promise.resolve('anthropic');
      if (key === 'subheading_ai_provider') return Promise.resolve('groq');
      if (key === 'anthropic_api_key') return Promise.resolve('fake-key');
      if (key === 'anthropic_model') return Promise.resolve(null);
      if (key === 'groq_api_key') return Promise.resolve('fake-key');
      if (key === 'groq_model') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    mockHttpsResponse({ content: [{ text: 'seo result' }] });
    await callAI('sys', 'user', 900, { providerSettingKey: 'seo_ai_provider' });
    const seoHostname = https.request.mock.calls[0][0].hostname;

    mockHttpsResponse({ choices: [{ message: { content: 'subheading result' } }] });
    await callAI('sys', 'user', 500, { providerSettingKey: 'subheading_ai_provider' });
    const subheadingHostname = https.request.mock.calls[1][0].hostname;

    expect(seoHostname).toContain('anthropic');
    expect(subheadingHostname).toContain('groq');
    expect(seoHostname).not.toBe(subheadingHostname);
  });
});
