const { Op } = require('sequelize');
const { Article, User, Category } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { generateArticleSchema } = require('../utils/schemaGenerator');

const INCLUDE = [
  { model: User, as: 'author', attributes: ['id', 'name', 'bio', 'avatar', 'socialLinks'] },
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
];

// GET /api/public/categories
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({ order: [['name', 'ASC']] });
  res.json({ categories });
});

// GET /api/public/articles?category=slug&page=1&pageSize=20&search=
const listArticles = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 50);

  // Only show articles that are published AND either have no schedule or schedule has passed
  const now = new Date();
  const where = {
    status: 'published',
    [Op.or]: [
      { scheduledAt: null },
      { scheduledAt: { [Op.lte]: now } },
    ],
  };

  if (category) {
    const cat = await Category.findOne({ where: { slug: category } });
    if (cat) where.categoryId = cat.id;
    else return res.json({ articles: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
  }

  if (search) where.title = { [Op.like]: `%${search}%` };

  const { rows, count } = await Article.findAndCountAll({
    where,
    include: INCLUDE,
    order: [['publishedAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  res.json({
    articles: rows,
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
  });
});

// GET /api/public/articles/:slug
const getArticle = asyncHandler(async (req, res) => {
  const now = new Date();
  const article = await Article.findOne({
    where: {
      slug: req.params.slug,
      status: 'published',
      [Op.or]: [
        { scheduledAt: null },
        { scheduledAt: { [Op.lte]: now } },
      ],
    },
    include: INCLUDE,
  });
  if (!article) return res.status(404).json({ error: 'Article not found.' });

  // Increment view counter (fire and forget — don't block the response)
  Article.increment('views', { by: 1, where: { id: article.id } }).catch(() => {});

  const schema = await generateArticleSchema(article);

  res.json({ article, schema });
});

// GET /api/public/sitemap  — returns all published article slugs + dates for sitemap generation
const sitemap = asyncHandler(async (req, res) => {
  const articles = await Article.findAll({
    where: { status: 'published' },
    attributes: ['slug', 'publishedAt', 'updatedAt'],
    include: [{ model: Category, as: 'category', attributes: ['slug'] }],
    order: [['publishedAt', 'DESC']],
  });
  res.json({ articles });
});

module.exports = { listCategories, listArticles, getArticle, sitemap };
