const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Category, Setting } = require('../../src/models');

describe('Guest OTP pause/resume toggle', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await Category.create({ name: 'General', slug: 'general' });
    await Setting.create({ key: 'guest_submission_token', value: 'test-token-123' });
  });
  afterAll(async () => { await sequelize.close(); });

  it('reports otpRequired: true by default (no setting row exists yet)', async () => {
    const res = await request(app).get('/api/public/guest-submission-config');
    expect(res.body.otpRequired).toBe(true);
  });

  it('blocks submission without a session token while OTP is required (default state)', async () => {
    const res = await request(app).post('/api/public/guest-articles').send({
      token: 'test-token-123', title: 'Test', content: 'x'.repeat(60), submitterName: 'Test',
    });
    expect(res.status).toBe(401);
  });

  it('reports otpRequired: false once paused via Settings', async () => {
    await Setting.upsert({ key: 'guest_otp_required', value: 'false' });
    const res = await request(app).get('/api/public/guest-submission-config');
    expect(res.body.otpRequired).toBe(false);
  });

  it('allows submission WITHOUT a session token while paused, using just the submission token', async () => {
    const res = await request(app).post('/api/public/guest-articles').send({
      token: 'test-token-123', title: 'Test Article', content: 'x'.repeat(60), submitterName: 'Test User',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('still rejects a wrong submission token even while paused', async () => {
    const res = await request(app).post('/api/public/guest-articles').send({
      token: 'wrong-token', title: 'Test', content: 'x'.repeat(60), submitterName: 'Test',
    });
    expect(res.status).toBe(403);
  });

  it('does not crash on chat-sourced submissions while paused (guestEmail is null)', async () => {
    const res = await request(app).post('/api/public/guest-articles').send({
      token: 'test-token-123', title: 'Chat Article', content: 'x'.repeat(60),
      submitterName: 'Test User', source: 'chat',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('resumes requiring a session token once turned back on', async () => {
    await Setting.upsert({ key: 'guest_otp_required', value: 'true' });
    const res = await request(app).post('/api/public/guest-articles').send({
      token: 'test-token-123', title: 'Test', content: 'x'.repeat(60), submitterName: 'Test',
    });
    expect(res.status).toBe(401);
  });
});
