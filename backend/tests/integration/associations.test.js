// This is the exact bug found in production today: AiUsageLog.associate() was
// defined in the model file but never actually called anywhere, so the AI Costs
// dashboard's `include: [{ model: User, as: 'user' }]` query threw a Sequelize
// error every time, masked as a generic 500 by the error handler.
//
// This test creates a real (in-memory) database, runs the actual model associations
// from src/models/index.js, and confirms the exact query pattern used by
// usageController.js succeeds without throwing.

process.env.NODE_ENV = 'test';
process.env.SQLITE_STORAGE = ':memory:';
process.env.DB_DIALECT = 'sqlite';

const { sequelize, User, AiUsageLog } = require('../../src/models');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('AiUsageLog <-> User association', () => {
  it('is registered on the AiUsageLog model', () => {
    expect(AiUsageLog.associations.user).toBeDefined();
  });

  it('allows querying AiUsageLog with the user include — the exact query the AI Costs dashboard runs', async () => {
    // Matches the real user-creation pattern in userController.js: build first,
    // then assign .password directly (the virtual setter only fires on direct
    // property assignment, not when passed inside a bulk .create({...}) object).
    const user = User.build({
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    });
    user.password = 'irrelevant-for-this-test';
    await user.save();

    await AiUsageLog.create({
      userId: user.id,
      action: 'ai_seo_generate',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
    });

    // This exact include pattern is what usageController.js runs. Before the fix,
    // this line threw: "AiUsageLog is not associated to User using an alias user"
    const logs = await AiUsageLog.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].user).toBeDefined();
    expect(logs[0].user.name).toBe('Test User');
  });
});
