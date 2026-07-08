const { UserActivity } = require('../models');
const { getSetting } = require('../controllers/settingController');

// Default if no Setting is configured yet — actual value is read from Settings
// ("Idle threshold" under Activity Tracking) on every call, so an admin can
// adjust it from the Settings page without a code change or redeploy.
const DEFAULT_IDLE_THRESHOLD_MINUTES = 5;

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// Fire-and-forget by design — called from requireAuth on every authenticated
// request, but must never add latency or fail the actual request it's attached to.
async function recordActivity(userId) {
  try {
    const now = new Date();
    const date = todayDateOnly();

    const thresholdMinutes = parseInt(
      (await getSetting('activity_idle_threshold_minutes', null)) || DEFAULT_IDLE_THRESHOLD_MINUTES,
      10
    ) || DEFAULT_IDLE_THRESHOLD_MINUTES;
    const idleThresholdMs = thresholdMinutes * 60 * 1000;

    const row = await UserActivity.findOne({ where: { userId, date } });

    if (!row) {
      await UserActivity.create({ userId, date, firstSeenAt: now, lastSeenAt: now, activeSeconds: 0 });
      return;
    }

    const gapMs = now.getTime() - new Date(row.lastSeenAt).getTime();
    const addSeconds = gapMs > 0 && gapMs <= idleThresholdMs ? Math.round(gapMs / 1000) : 0;

    row.lastSeenAt = now;
    row.activeSeconds += addSeconds;
    await row.save();
  } catch (err) {
    console.warn('[activity-tracker] Failed to record activity (non-fatal):', err.message);
  }
}

module.exports = { recordActivity };
