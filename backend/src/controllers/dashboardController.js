const { Op } = require('sequelize');
const { Article, User, Category, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

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

  res.json(payload);
});

// Admin/editor only: published article count per author over a day range
// (default 48 days, capped at 365). Ordered by most published first.
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

module.exports = { stats, publishedByAuthor };
