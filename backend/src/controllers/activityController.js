const { UserActivity, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Admin-only: daily active-time report per user, defaulting to the last 7 days.
const dailyReport = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceDate = since.toISOString().slice(0, 10);

  const rows = await UserActivity.findAll({
    where: { date: { [Op.gte]: sinceDate } },
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
