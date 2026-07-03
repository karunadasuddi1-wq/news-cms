const { AiUsageLog, User } = require('../models');
const { formatCost, USD_TO_INR } = require('../utils/usageTracker');
const asyncHandler = require('../utils/asyncHandler');
const { Op, fn, col, literal } = require('sequelize');

const AI_ACTIONS = {
  'ai_writer_rewrite':  'AI Writer — Rewrite',
  'ai_seo_generate':    'SEO Generator',
  'ai_writer_fetch':    'AI Writer — URL Fetch',
  'ai_summarize':       'Article Summary',
};

const usageDashboard = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only.' });
  }

  const { period = 'month', year, month } = req.query;
  const now = new Date();
  const y = parseInt(year) || now.getFullYear();
  const m = parseInt(month) || now.getMonth() + 1;

  let startDate, endDate;
  if (period === 'month') {
    startDate = new Date(y, m - 1, 1);
    endDate = new Date(y, m, 0, 23, 59, 59);
  } else if (period === 'today') {
    startDate = new Date(); startDate.setHours(0,0,0,0);
    endDate = new Date(); endDate.setHours(23,59,59,999);
  } else if (period === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    endDate = new Date();
  } else {
    startDate = new Date(y, 0, 1);
    endDate = new Date(y, 11, 31, 23, 59, 59);
  }

  const where = { createdAt: { [Op.between]: [startDate, endDate] } };

  // Total summary
  const allLogs = await AiUsageLog.findAll({ where, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });

  const totalUsd = allLogs.reduce((s, l) => s + parseFloat(l.costUsd || 0), 0);
  const totalInputTokens = allLogs.reduce((s, l) => s + (l.inputTokens || 0), 0);
  const totalOutputTokens = allLogs.reduce((s, l) => s + (l.outputTokens || 0), 0);
  const totalCalls = allLogs.length;

  // By action
  const byAction = {};
  allLogs.forEach(l => {
    const key = l.action;
    if (!byAction[key]) byAction[key] = { action: key, label: AI_ACTIONS[key] || key, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    byAction[key].calls++;
    byAction[key].inputTokens += l.inputTokens || 0;
    byAction[key].outputTokens += l.outputTokens || 0;
    byAction[key].costUsd += parseFloat(l.costUsd || 0);
  });

  // By provider
  const byProvider = {};
  allLogs.forEach(l => {
    const key = l.provider;
    if (!byProvider[key]) byProvider[key] = { provider: key, calls: 0, costUsd: 0 };
    byProvider[key].calls++;
    byProvider[key].costUsd += parseFloat(l.costUsd || 0);
  });

  // By day (for chart)
  const byDay = {};
  allLogs.forEach(l => {
    const day = new Date(l.createdAt).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, calls: 0, costUsd: 0 };
    byDay[day].calls++;
    byDay[day].costUsd += parseFloat(l.costUsd || 0);
  });

  // By user
  const byUser = {};
  allLogs.forEach(l => {
    const key = l.userId || 'unknown';
    const name = l.user?.name || 'Unknown';
    if (!byUser[key]) byUser[key] = { userId: key, name, calls: 0, costUsd: 0 };
    byUser[key].calls++;
    byUser[key].costUsd += parseFloat(l.costUsd || 0);
  });

  // Recent logs
  const recentLogs = allLogs.slice(-20).reverse().map(l => ({
    id: l.id,
    action: AI_ACTIONS[l.action] || l.action,
    provider: l.provider,
    model: l.model,
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    cost: formatCost(parseFloat(l.costUsd || 0)),
    user: l.user?.name || 'Unknown',
    createdAt: l.createdAt,
    metadata: l.metadata,
  }));

  res.json({
    period: { type: period, start: startDate, end: endDate },
    summary: {
      totalCalls,
      totalInputTokens,
      totalOutputTokens,
      totalCost: formatCost(totalUsd),
    },
    byAction: Object.values(byAction).map(a => ({ ...a, cost: formatCost(a.costUsd) })),
    byProvider: Object.values(byProvider).map(p => ({ ...p, cost: formatCost(p.costUsd) })),
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ ...d, cost: formatCost(d.costUsd) })),
    byUser: Object.values(byUser).map(u => ({ ...u, cost: formatCost(u.costUsd) })),
    recentLogs,
  });
});

module.exports = { usageDashboard };
