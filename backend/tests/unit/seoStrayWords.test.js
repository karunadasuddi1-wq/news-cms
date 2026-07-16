jest.mock('../../src/utils/aiProvider', () => ({ callAI: jest.fn() }));
jest.mock('../../src/controllers/settingController', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { callAI } = require('../../src/utils/aiProvider');
const { sequelize } = require('../../src/models');

const express = require('express');
const { generateSeo } = require('../../src/controllers/seoController');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: 1 }; next(); });
  app.post('/generate', generateSeo);
  return app;
}

const dirtyResponse = JSON.stringify({
  headline: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ ಶಾಶ್ವತ ನಿವಾಸಿ ಪ್ರಮಾಣಪತ್ರ ನೀಡುತ್ತಿರುವ Congress ಸರ್ಕಾರ',
  slug: 'congress-bangladesh',
  excerpt: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ ಶಾಶ್ವತ ನಿವಾಸಿ ಪ್ರಮಾಣಪತ್ರ ನೀಡುತ್ತಿರುವ Congress ಸರ್ಕಾರದ ವಿರುದ್ಧ ದೂರು. ರಾಜಕೀಯ ಭದ್ರತೆ CherryBurn ಹೇಗೆ ತಡೆಯಬಹುದು?',
  seoTitle: 'Congress ಸರ್ಕಾರದ ವಿರುದ್ಧ ದೂರು',
  seoDescription: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ CherryBurn ಪ್ರಮಾಣಪತ್ರ Congress ವಿವಾದ',
  focusKeyword: 'Congress',
  kannadaKeyword: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ',
  tags: ['congress', 'bangladesh'],
});

const cleanResponse = JSON.stringify({
  headline: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ ಶಾಶ್ವತ ನಿವಾಸಿ ಪ್ರಮಾಣಪತ್ರ ನೀಡುತ್ತಿರುವ Congress ಸರ್ಕಾರ',
  slug: 'congress-bangladesh',
  excerpt: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ ಶಾಶ್ವತ ನಿವಾಸಿ ಪ್ರಮಾಣಪತ್ರ ನೀಡುತ್ತಿರುವ Congress ಸರ್ಕಾರದ ವಿರುದ್ಧ ದೂರು.',
  seoTitle: 'Congress ಸರ್ಕಾರದ ವಿರುದ್ಧ ದೂರು',
  seoDescription: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ Congress ಪ್ರಮಾಣಪತ್ರ ವಿವಾದ',
  focusKeyword: 'Congress',
  kannadaKeyword: 'ಬಾಂಗ್ಲಾದೇಶ ನಾಗರಿಕರಿಗೆ',
  tags: ['congress', 'bangladesh'],
});

describe('SEO generation — stray English word detection and retry', () => {
  beforeAll(async () => { await sequelize.sync({ force: true }); });
  afterAll(async () => { await sequelize.close(); });
  beforeEach(() => jest.clearAllMocks());

  it('retries once when the first attempt has a stray English word, and uses the clean retry', async () => {
    callAI.mockResolvedValueOnce(dirtyResponse).mockResolvedValueOnce(cleanResponse);
    const app = buildApp();
    const res = await request(app).post('/generate').send({ title: 'Test', content: 'x'.repeat(60) });
    expect(callAI).toHaveBeenCalledTimes(2);
    expect(res.body.excerpt).not.toContain('CherryBurn');
    expect(res.body.warnings).toEqual([]);
  });

  it('does NOT retry when the first attempt is already clean', async () => {
    callAI.mockResolvedValueOnce(cleanResponse);
    const app = buildApp();
    const res = await request(app).post('/generate').send({ title: 'Test', content: 'x'.repeat(60) });
    expect(callAI).toHaveBeenCalledTimes(1);
    expect(res.body.warnings).toEqual([]);
  });

  it('surfaces a warning to the editor if BOTH attempts still contain a stray word', async () => {
    callAI.mockResolvedValueOnce(dirtyResponse).mockResolvedValueOnce(dirtyResponse);
    const app = buildApp();
    const res = await request(app).post('/generate').send({ title: 'Test', content: 'x'.repeat(60) });
    expect(callAI).toHaveBeenCalledTimes(2);
    expect(res.body.warnings.length).toBeGreaterThan(0);
    expect(res.body.warnings.some(w => w.includes('CherryBurn'))).toBe(true);
    expect(res.body.excerpt).toContain('CherryBurn');
  });
});
