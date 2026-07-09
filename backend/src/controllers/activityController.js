const { UserActivity, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Admin-only: daily active-time report, with optional filters.
// Query params:
//   date   — exact day (YYYY-MM-DD). If provided, overrides `days` and shows only that day.
//   days   — range from today, default 7, capped at 90. Ignored if `date` is set.
//   userId — filter to a single staff member.
const dailyReport = asyncHandler(async (req, res) => {
  const where = {};

  if (req.query.date) {
    where.date = req.query.date;
  } else {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    where.date = { [Op.gte]: since.toISOString().slice(0, 10) };
  }

  if (req.query.userId) {
    where.userId = parseInt(req.query.userId, 10);
  }

  const rows = await UserActivity.findAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'role'] }],
    order: [['date', 'DESC']],
  });

  const report = rows
    .filter(r => r.user)
    .map(r => ({
      userId: r.userId,
      name: r.user.name,
      role: r.user.role,
      date: r.date,
      activeSeconds: r.activeSeconds,
      activeFormatted: formatDuration(r.activeSeconds),
      firstSeenAt: r.firstSeenAt,
      lastSeenAt: r.lastSeenAt,
    }));

  res.json({ report });
});

module.exports = { dailyReport };
