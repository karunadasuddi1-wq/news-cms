const { Op } = require('sequelize');
const { Article, User, Category } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { generateArticleSchema } = require('../utils/schemaGenerator');
const { getSetting } = require('./settingController');
const { generateUniqueSlug } = require('../utils/slug');

const INCLUDE = [
  { model: User, as: 'author', attributes: ['id', 'name', 'bio', 'avatar', 'socialLinks'] },
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
];

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({ order: [['name', 'ASC']] });
  res.json({ categories });
});

const listArticles = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 50);

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

  Article.increment('views', { by: 1, where: { id: article.id } }).catch(() => {});

  const schema = await generateArticleSchema(article);

  res.json({ article, schema });
});

const sitemap = asyncHandler(async (req, res) => {
  const articles = await Article.findAll({
    where: { status: 'published' },
    attributes: ['slug', 'publishedAt', 'updatedAt'],
    include: [{ model: Category, as: 'category', attributes: ['slug'] }],
    order: [['publishedAt', 'DESC']],
  });
  res.json({ articles });
});

// POST /api/public/guest-articles — token-protected public submission.
// Anyone with the shared link + token can submit a draft article without a
// CMS account. Always lands as status='draft' for an editor to review —
// never auto-published. Submissions are attributed to a shared "Guest
// Contributor" system account; the submitter's typed name is kept separately
// (guestSubmitterName) purely for the reviewing editor's visibility.
const submitGuestArticle = asyncHandler(async (req, res) => {
  const configuredToken = await getSetting('guest_submission_token', null);
  if (!configuredToken) {
    return res.status(403).json({ error: 'Guest submissions are not enabled for this site.' });
  }
  if (req.body.token !== configuredToken) {
    return res.status(403).json({ error: 'Invalid or expired submission link.' });
  }

  const { title, content, excerpt, featuredImage, categoryId, tags, submitterName } = req.body;

  if (!title || !title.trim() || !content || content.trim().length < 50) {
    return res.status(400).json({ error: 'Please provide a title and at least 50 characters of content.' });
  }

  let category = null;
  if (categoryId) {
    category = await Category.findByPk(categoryId);
  }
  if (!category) {
    category = await Category.findOne({ order: [['id', 'ASC']] });
  }
  if (!category) {
    return res.status(400).json({ error: 'No category is configured for this site yet.' });
  }

  const GUEST_EMAIL = 'guest-contributor@system.local';
  let guestUser = await User.findOne({ where: { email: GUEST_EMAIL } });
  if (!guestUser) {
    guestUser = User.build({ name: 'Guest Contributor', email: GUEST_EMAIL, role: 'author', isActive: false });
    guestUser.password = require('crypto').randomBytes(32).toString('hex');
    await guestUser.save();
  }

  const slug = await generateUniqueSlug(Article, title, null);

  const article = await Article.create({
    title: title.trim(),
    slug,
    excerpt: (excerpt || '').trim() || null,
    content: content.trim(),
    featuredImage: featuredImage || null,
    categoryId: category.id,
    authorId: guestUser.id,
    status: 'draft',
    guestSubmitterName: (submitterName || '').trim().slice(0, 120) || null,
  });

  if (Array.isArray(tags) && tags.length) {
    article.tags = tags.filter(t => t && t.trim()).map(t => t.trim());
    await article.save();
  }

  res.status(201).json({ ok: true, message: 'Submitted for review. Thank you!' });
});

module.exports = { listCategories, listArticles, getArticle, sitemap, submitGuestArticle };
