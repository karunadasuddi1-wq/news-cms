const { Op } = require('sequelize');
const { Article, User, Category, AiUsageLog, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { getSetting } = require('./settingController');

function pctChange(current, previous) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const stats = asyncHandler(async (req, res) => {
  const canManageAny = req.user.role === 'admin' || req.user.role === 'editor';
  const baseWhere = canManageAny ? {} : { authorId: req.user.id };

  const [draft, pendingReview, published, total] = await Promise.all([
    Article.count({ where: { ...baseWhere, status: 'draft' } }),
    Article.count({ where: { ...baseWhere, status: 'pending_review' } }),
    Article.count({ where: { ...baseWhere, status: 'published' } }),
    Article.count({ where: baseWhere }),
  ]);

  const payload = {
    articles: { draft, pendingReview, published, total },
  };

  if (canManageAny) {
    const [userCount, categoryCount] = await Promise.all([User.count(), Category.count()]);
    payload.users = userCount;
    payload.categories = categoryCount;
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [createdThisWeek, createdLastWeek, publishedThisWeek, publishedLastWeek] = await Promise.all([
    Article.count({ where: { ...baseWhere, createdAt: { [Op.gte]: weekAgo } } }),
    Article.count({ where: { ...baseWhere, createdAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: weekAgo } } }),
    Article.count({ where: { ...baseWhere, status: 'published', publishedAt: { [Op.gte]: weekAgo } } }),
    Article.count({ where: { ...baseWhere, status: 'published', publishedAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: weekAgo } } }),
  ]);

  payload.trends = {
    total: pctChange(createdThisWeek, createdLastWeek),
    published: pctChange(publishedThisWeek, publishedLastWeek),
  };

  res.json(payload);
});

const recentArticles = asyncHandler(async (req, res) => {
  const canManageAny = req.user.role === 'admin' || req.user.role === 'editor';
  const baseWhere = canManageAny ? {} : { authorId: req.user.id };
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

  const articles = await Article.findAll({
    where: baseWhere,
    include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
    order: [['updatedAt', 'DESC']],
    limit,
    attributes: ['id', 'title', 'slug', 'status', 'updatedAt'],
  });

  res.json({ articles });
});

const aiUsageToday = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ error: 'Ask an editor for this data.' });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const logs = await AiUsageLog.findAll({
    where: { createdAt: { [Op.gte]: startOfToday } },
    attributes: ['inputTokens', 'outputTokens', 'costUsd'],
    raw: true,
  });

  const requests = logs.length;
  const tokens = logs.reduce((sum, l) => sum + (l.inputTokens || 0) + (l.outputTokens || 0), 0);
  const costUsd = logs.reduce((sum, l) => sum + parseFloat(l.costUsd || 0), 0);
  const costInr = costUsd * 83.5;

  const dailyLimit = parseInt((await getSetting('ai_daily_request_limit', null)) || '500', 10);

  res.json({ requests, tokens, costInr: Math.round(costInr * 100) / 100, dailyLimit });
});

const publishedByAuthor = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ error: 'Ask an editor for this report.' });
  }

  const days = Math.min(parseInt(req.query.days, 10) || 48, 365);
  const since = new Date();
  since.setDate(since.getDate() - days + 1);

  const rows = await Article.findAll({
    where: {
      status: 'published',
      publishedAt: { [Op.gte]: since },
    },
    attributes: [
      'authorId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['authorId'],
    raw: true,
  });
  const authorIds = rows.map(r => r.authorId).filter(Boolean);
  const authors = await User.findAll({ where: { id: authorIds }, attributes: ['id', 'name', 'role'] });
  const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));

  const report = rows.map(r => ({
    authorId: r.authorId,
    name: authorMap[r.authorId]?.name || 'Unknown',
    role: authorMap[r.authorId]?.role || '',
    count: parseInt(r.count, 10),
  })).sort((a, b) => b.count - a.count);

  res.json({ report, days });
});

module.exports = { stats, publishedByAuthor, recentArticles, aiUsageToday };
