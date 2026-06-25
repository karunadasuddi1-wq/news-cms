const { Article, User, Category } = require('../models');
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

module.exports = { stats };
