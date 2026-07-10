const { Op, fn, col, literal } = require('sequelize');
const { Article, User, Category, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { getSetting } = require('./settingController');
const { fetchGA4ViewsBySlug, fetchGA4DailyHuntViewsByTitle } = require('../utils/ga4');

function canManageAny(user) {
  return user.role === 'admin' || user.role === 'editor';
}

// Build where clause — admins/editors see all, authors see own only
function buildWhere(user, extraWhere = {}) {
  const where = { ...extraWhere };
  if (!canManageAny(user)) where.authorId = user.id;
  return where;
}

// Parse date range from query params
function parseDateRange(query) {
  const { from, to, range } = query;
  const now = new Date();

  if (range === 'today') {
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(now); end.setHours(23,59,59,999);
    return { start, end };
  }
  if (range === 'yesterday') {
    const start = new Date(now); start.setDate(start.getDate()-1); start.setHours(0,0,0,0);
    const end = new Date(now); end.setDate(end.getDate()-1); end.setHours(23,59,59,999);
    return { start, end };
  }
  if (range === '7d') {
    const start = new Date(now); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
    return { start, end: now };
  }
  if (range === '30d') {
    const start = new Date(now); start.setDate(start.getDate()-29); start.setHours(0,0,0,0);
    return { start, end: now };
  }
  if (range === '90d') {
    const start = new Date(now); start.setDate(start.getDate()-89); start.setHours(0,0,0,0);
    return { start, end: now };
  }
  // Custom range
  if (from && to) {
    const start = new Date(from); start.setHours(0,0,0,0);
    const end = new Date(to); end.setHours(23,59,59,999);
    return { start, end };
  }
  // Default: last 30 days
  const start = new Date(now); start.setDate(start.getDate()-29); start.setHours(0,0,0,0);
  return { start, end: now };
}

// GET /api/analytics/overview
const overview = asyncHandler(async (req, res) => {
  const { start, end } = parseDateRange(req.query);
  const filterAuthor = canManageAny(req.user) && req.query.authorId
    ? { authorId: req.query.authorId } : {};

  const baseWhere = buildWhere(req.user, filterAuthor);
  const dateWhere = { publishedAt: { [Op.between]: [start, end] } };
  const allTimeWhere = buildWhere(req.user, filterAuthor);

  const [
    totalPublished,
    totalDraft,
    totalPendingReview,
    totalViews,
    allTimePublished,
    allTimeViews,
  ] = await Promise.all([
    Article.count({ where: { ...baseWhere, ...dateWhere, status: 'published' } }),
    Article.count({ where: { ...baseWhere, status: 'draft' } }),
    Article.count({ where: { ...baseWhere, status: 'pending_review' } }),
    Article.sum('views', { where: { ...baseWhere, ...dateWhere, status: 'published' } }),
    Article.count({ where: { ...allTimeWhere, status: 'published' } }),
    Article.sum('views', { where: { ...allTimeWhere, status: 'published' } }),
  ]);

  // Average time to publish (createdAt → publishedAt) in hours
  const publishedInRange = await Article.findAll({
    where: { ...baseWhere, ...dateWhere, status: 'published' },
    attributes: ['createdAt', 'publishedAt'],
    raw: true,
  });

  let avgTimeToPublish = null;
  if (publishedInRange.length > 0) {
    const totalHours = publishedInRange.reduce((sum, a) => {
      if (!a.publishedAt) return sum;
      return sum + (new Date(a.publishedAt) - new Date(a.createdAt)) / 3600000;
    }, 0);
    avgTimeToPublish = Math.round(totalHours / publishedInRange.length * 10) / 10;
  }

  // Top article by views in range
  const topArticle = await Article.findOne({
    where: { ...baseWhere, ...dateWhere, status: 'published' },
    include: [{ model: User, as: 'author', attributes: ['name'] }],
    order: [['views', 'DESC']],
    attributes: ['id', 'title', 'slug', 'views', 'publishedAt'],
  });

  res.json({
    range: { start, end },
    totalPublished,
    totalDraft,
    totalPendingReview,
    totalViews: totalViews || 0,
    avgViewsPerArticle: totalPublished > 0 ? Math.round((totalViews || 0) / totalPublished) : 0,
    avgTimeToPublishHours: avgTimeToPublish,
    allTimePublished,
    allTimeViews: allTimeViews || 0,
    topArticle,
  });
});

// GET /api/analytics/daily  — day-by-day breakdown
const daily = asyncHandler(async (req, res) => {
  const { start, end } = parseDateRange(req.query);
  const filterAuthor = canManageAny(req.user) && req.query.authorId
    ? { authorId: req.query.authorId } : {};
  const baseWhere = buildWhere(req.user, { ...filterAuthor, status: 'published' });

  const articles = await Article.findAll({
    where: {
      ...baseWhere,
      publishedAt: { [Op.between]: [start, end] },
    },
    attributes: ['publishedAt', 'views'],
    raw: true,
  });

  // Group by date
  const byDate = {};
  articles.forEach(a => {
    const d = new Date(a.publishedAt).toISOString().slice(0, 10);
    if (!byDate[d]) byDate[d] = { date: d, articles: 0, views: 0 };
    byDate[d].articles += 1;
    byDate[d].views += a.views || 0;
  });

  // Fill in missing dates
  const result = [];
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    result.push(byDate[d] || { date: d, articles: 0, views: 0 });
    cur.setDate(cur.getDate() + 1);
  }

  res.json({ daily: result });
});

// GET /api/analytics/articles  — per-article stats
const articles = asyncHandler(async (req, res) => {
  const { start, end } = parseDateRange(req.query);
  const sort = req.query.sort || 'views'; // views | publishedAt | title
  const filterAuthor = canManageAny(req.user) && req.query.authorId
    ? { authorId: req.query.authorId } : {};

  const baseWhere = buildWhere(req.user, {
    ...filterAuthor,
    status: 'published',
    publishedAt: { [Op.between]: [start, end] },
  });

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 25, 100);

  const orderMap = {
    views: [['views', 'DESC']],
    publishedAt: [['publishedAt', 'DESC']],
    title: [['title', 'ASC']],
  };

  const { rows, count } = await Article.findAndCountAll({
    where: baseWhere,
    include: [
      { model: User, as: 'author', attributes: ['id', 'name'] },
      { model: Category, as: 'category', attributes: ['id', 'name'] },
    ],
    attributes: ['id', 'title', 'slug', 'views', 'directViews', 'dailyhuntViews', 'publishedAt', 'createdAt', 'status'],
    order: orderMap[sort] || orderMap.views,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  res.json({
    articles: rows,
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
  });
});

// GET /api/analytics/authors  — per-author stats (admin/editor only)
const authors = asyncHandler(async (req, res) => {
  if (!canManageAny(req.user)) {
    return res.status(403).json({ error: 'Editors and admins only.' });
  }

  const { start, end } = parseDateRange(req.query);

  const allAuthors = await User.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'email', 'role'],
  });

  const stats = await Promise.all(allAuthors.map(async (author) => {
    const dateWhere = { publishedAt: { [Op.between]: [start, end] } };

    const [published, drafts, pending, views, allTimePublished] = await Promise.all([
      Article.count({ where: { authorId: author.id, status: 'published', ...dateWhere } }),
      Article.count({ where: { authorId: author.id, status: 'draft' } }),
      Article.count({ where: { authorId: author.id, status: 'pending_review' } }),
      Article.sum('views', { where: { authorId: author.id, status: 'published', ...dateWhere } }),
      Article.count({ where: { authorId: author.id, status: 'published' } }),
    ]);

    // Avg time to publish
    const publishedArticles = await Article.findAll({
      where: { authorId: author.id, status: 'published', ...dateWhere },
      attributes: ['createdAt', 'publishedAt'],
      raw: true,
    });
    let avgHours = null;
    if (publishedArticles.length > 0) {
      const total = publishedArticles.reduce((sum, a) => {
        if (!a.publishedAt) return sum;
        return sum + (new Date(a.publishedAt) - new Date(a.createdAt)) / 3600000;
      }, 0);
      avgHours = Math.round(total / publishedArticles.length * 10) / 10;
    }

    return {
      author: { id: author.id, name: author.name, email: author.email, role: author.role },
      published,
      drafts,
      pending,
      views: views || 0,
      avgViews: published > 0 ? Math.round((views || 0) / published) : 0,
      avgTimeToPublishHours: avgHours,
      allTimePublished,
    };
  }));

  // Sort by views desc
  stats.sort((a, b) => b.views - a.views);
  res.json({ authors: stats });
});

// GET /api/analytics/categories
const categories = asyncHandler(async (req, res) => {
  const { start, end } = parseDateRange(req.query);
  const baseWhere = buildWhere(req.user, {
    status: 'published',
    publishedAt: { [Op.between]: [start, end] },
  });

  const allCats = await Category.findAll({ order: [['name', 'ASC']] });

  const stats = await Promise.all(allCats.map(async (cat) => {
    const [published, views] = await Promise.all([
      Article.count({ where: { ...baseWhere, categoryId: cat.id } }),
      Article.sum('views', { where: { ...baseWhere, categoryId: cat.id } }),
    ]);
    return {
      category: { id: cat.id, name: cat.name, slug: cat.slug },
      published,
      views: views || 0,
      avgViews: published > 0 ? Math.round((views || 0) / published) : 0,
    };
  }));

  stats.sort((a, b) => b.views - a.views);
  res.json({ categories: stats });
});

// POST /api/analytics/sync-ga4 — pulls real view counts from Google Analytics 4
// and writes directViews (matched by slug/pagePath) and dailyhuntViews
// (matched by title, filtered to DailyHunt referral sessions) separately.
const syncGA4Views = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only an admin can sync Google Analytics data.' });
  }

  const propertyId = await getSetting('ga4_property_id', null);
  const serviceAccountJson = await getSetting('ga4_service_account_json', null);

  if (!propertyId || !serviceAccountJson) {
    return res.status(400).json({ error: 'Google Analytics is not configured yet. Add the Property ID and service account JSON in Settings first.' });
  }

  const days = Math.min(parseInt(req.query.days, 10) || 365, 365);

  let viewsBySlug, viewsByTitle;
  try {
    [viewsBySlug, viewsByTitle] = await Promise.all([
      fetchGA4ViewsBySlug(propertyId, serviceAccountJson, days),
      fetchGA4DailyHuntViewsByTitle(propertyId, serviceAccountJson, days),
    ]);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  const articles = await Article.findAll({ attributes: ['id', 'slug', 'title'] });
  let matched = 0;
  let totalDirectViews = 0;
  let totalDailyhuntViews = 0;

  for (const article of articles) {
    const directViews = viewsBySlug[article.slug] || 0;
    const dailyhuntViews = viewsByTitle[article.title.trim()] || 0;

    if (directViews || dailyhuntViews) {
      await Article.update(
        {
          directViews,
          dailyhuntViews,
          views: directViews + dailyhuntViews,
        },
        { where: { id: article.id } }
      );
      matched += 1;
      totalDirectViews += directViews;
      totalDailyhuntViews += dailyhuntViews;
    }
  }

  res.json({
    ok: true,
    matched,
    totalArticles: articles.length,
    totalDirectViews,
    totalDailyhuntViews,
    totalViews: totalDirectViews + totalDailyhuntViews,
    message: `Synced ${matched} of ${articles.length} articles. Direct: ${totalDirectViews}, DailyHunt: ${totalDailyhuntViews}.`,
  });
});

module.exports = { overview, daily, articles, authors, categories, syncGA4Views };
