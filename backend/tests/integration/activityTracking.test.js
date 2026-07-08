process.env.NODE_ENV = 'test';
process.env.SQLITE_STORAGE = ':memory:';
process.env.DB_DIALECT = 'sqlite';

const { sequelize, User, UserActivity } = require('../../src/models');
const { recordActivity } = require('../../src/middleware/activityTracker');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

async function makeUser(email) {
  const user = User.build({ name: 'Test User', email, role: 'author' });
  user.password = 'irrelevant-for-this-test';
  await user.save();
  return user;
}

describe('UserActivity <-> User association', () => {
  it('is registered on the UserActivity model', () => {
    expect(UserActivity.associations.user).toBeDefined();
  });
});

describe('recordActivity', () => {
  it('creates a new row on the first call for a user/day', async () => {
    const user = await makeUser('activity1@example.com');
    await recordActivity(user.id);

    const row = await UserActivity.findOne({ where: { userId: user.id } });
    expect(row).not.toBeNull();
    expect(row.activeSeconds).toBe(0);
  });

  it('accumulates active seconds when the gap since the last request is short', async () => {
    const user = await makeUser('activity2@example.com');
    await recordActivity(user.id);

    const row = await UserActivity.findOne({ where: { userId: user.id } });
    row.lastSeenAt = new Date(Date.now() - 10 * 1000);
    await row.save();

    await recordActivity(user.id);

    const updated = await UserActivity.findOne({ where: { userId: user.id } });
    expect(updated.activeSeconds).toBeGreaterThan(0);
    expect(updated.activeSeconds).toBeLessThanOrEqual(15);
  });

  it('does NOT accumulate active seconds when the gap exceeds the idle threshold — this is the core "not just left the tab open" guarantee', async () => {
    const user = await makeUser('activity3@example.com');
    await recordActivity(user.id);

    const row = await UserActivity.findOne({ where: { userId: user.id } });
    row.lastSeenAt = new Date(Date.now() - 20 * 60 * 1000);
    await row.save();

    await recordActivity(user.id);

    const updated = await UserActivity.findOne({ where: { userId: user.id } });
    expect(updated.activeSeconds).toBe(0);
  });

  it('never throws even if something goes wrong internally (fire-and-forget safety)', async () => {
    await expect(recordActivity(999999)).resolves.not.toThrow();
  });
});
