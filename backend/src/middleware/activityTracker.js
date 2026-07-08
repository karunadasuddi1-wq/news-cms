const { UserActivity } = require('../models');

// If the gap since the user's last recorded request is under this threshold,
// the gap is counted as active time. A longer gap is treated as "they stepped
// away" and is not counted — this is what makes the total a genuine active-time
// measure rather than just "time between first login and last click of the day."
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// Fire-and-forget by design — called from requireAuth on every authenticated
// request, but must never add latency or fail the actual request it's attached to.
async function recordActivity(userId) {
  try {
    const now = new Date();
    const date = todayDateOnly();

    const row = await UserActivity.findOne({ where: { userId, date } });

    if (!row) {
      await UserActivity.create({ userId, date, firstSeenAt: now, lastSeenAt: now, activeSeconds: 0 });
      return;
    }

    const gapMs = now.getTime() - new Date(row.lastSeenAt).getTime();
    const addSeconds = gapMs > 0 && gapMs <= IDLE_THRESHOLD_MS ? Math.round(gapMs / 1000) : 0;

    row.lastSeenAt = now;
    row.activeSeconds += addSeconds;
    await row.save();
  } catch (err) {
    console.warn('[activity-tracker] Failed to record activity (non-fatal):', err.message);
  }
}

module.exports = { recordActivity };
