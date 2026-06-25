const { Op } = require('sequelize');
const { Article, User, Category } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { generateUniqueSlug, cleanSlug } = require('../utils/slug');

const AUTHOR_INCLUDE = [
  { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role'] },
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
];

function canManageAny(user) {
  return user.role === 'admin' || user.role === 'editor';
}

function applyTags(article, body) {
  if (body.tags !== undefined) {
    const tags = Array.isArray(body.tags) ? body.tags : [];
    article.tags = tags.filter(t => t && t.trim()).map(t => t.trim());
  }
}

function applySecondaryCategories(article, body) {
  if (body.secondaryCategories !== undefined) {
    const cats = Array.isArray(body.secondaryCategories) ? body.secondaryCategories : [];
    // Filter out primary category from secondary list to avoid duplication
    article.secondaryCategories = cats
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id) && id !== article.categoryId);
  }
}

function applySchedule(article, body) {
  if (body.scheduledAt !== undefined) {
    article.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  }
}

function applySeoFields(article, body) {
  const { seoTitle, seoDescription, focusKeyword, ogImage, canonicalUrl, noIndex } = body;
  if (seoTitle !== undefined) article.seoTitle = seoTitle || null;
  if (seoDescription !== undefined) article.seoDescription = seoDescription || null;
  if (focusKeyword !== undefined) article.focusKeyword = focusKeyword || null;
  if (ogImage !== undefined) article.ogImage = ogImage || null;
  if (canonicalUrl !== undefined) article.canonicalUrl = canonicalUrl || null;
  if (noIndex !== undefined) article.noIndex = Boolean(noIndex);
}

// Resolve the best slug: use custom slug if provided and valid, else auto-generate
async function resolveSlug(customSlug, fallbackText, excludeId = null) {
  const custom = cleanSlug(customSlug || '');
  if (custom.length >= 3) {
    // Make sure this custom slug is unique
    let candidate = custom;
    let counter = 2;
    while (true) {
      const existing = await Article.findOne({ where: { slug: candidate } });
      if (!existing || (excludeId && existing.id === excludeId)) return candidate;
      candidate = `${custom}-${counter}`;
      counter += 1;
    }
  }
  // Fall back to auto-generate from title
  return generateUniqueSlug(Article, fallbackText, excludeId);
}

const list = asyncHandler(async (req, res) => {
  const { status, categoryId, authorId, search } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);

  const where = {};
  if (!canManageAny(req.user)) {
    where.authorId = req.user.id;
  } else if (authorId) {
    where.authorId = authorId;
  }
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (search) where.title = { [Op.like]: `%${search}%` };

  const { rows, count } = await Article.findAndCountAll({
    where,
    include: AUTHOR_INCLUDE,
    order: [['updatedAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  res.json({
    articles: rows,
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id, { include: AUTHOR_INCLUDE });
  if (!article) return res.status(404).json({ error: 'Article not found.' });
  if (!canManageAny(req.user) && article.authorId !== req.user.id) {
    return res.status(403).json({ error: 'You can only view your own articles.' });
  }
  res.json({ article });
});

const create = asyncHandler(async (req, res) => {
  const { title, excerpt, content, featuredImage, categoryId, authorId, slug: customSlug } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required.' });
  if (!categoryId) return res.status(400).json({ error: 'Category is required.' });

  const category = await Category.findByPk(categoryId);
  if (!category) return res.status(400).json({ error: 'That category does not exist.' });

  let resolvedAuthorId = req.user.id;
  if (authorId && canManageAny(req.user)) {
    const targetAuthor = await User.findByPk(authorId);
    if (!targetAuthor) return res.status(400).json({ error: 'That author does not exist.' });
    resolvedAuthorId = targetAuthor.id;
  }

  // Use custom slug from editor if provided, otherwise auto-generate
  const slug = await resolveSlug(customSlug, title);

  const article = Article.build({
    title: title.trim(),
    slug,
    excerpt: excerpt ? excerpt.trim() : null,
    content,
    featuredImage: featuredImage || null,
    categoryId,
    authorId: resolvedAuthorId,
    status: 'draft',
  });

  applySeoFields(article, req.body);
  applyTags(article, req.body);
  applySchedule(article, req.body);
  applySecondaryCategories(article, req.body);
  await article.save();

  const full = await Article.findByPk(article.id, { include: AUTHOR_INCLUDE });
  res.status(201).json({ article: full });
});

const update = asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found.' });

  const isOwner = article.authorId === req.user.id;
  const canManage = canManageAny(req.user);

  if (!canManage && !isOwner) {
    return res.status(403).json({ error: 'You can only edit your own articles.' });
  }
  if (!canManage && article.status === 'published') {
    return res.status(403).json({
      error: 'This article is already published. Ask an editor to make further changes.',
    });
  }

  const { title, excerpt, content, featuredImage, categoryId, slug: customSlug } = req.body;

  if (title && title.trim()) article.title = title.trim();

  // Update slug: use custom slug if provided, else re-generate from new title
  if (customSlug !== undefined) {
    article.slug = await resolveSlug(customSlug, article.title, article.id);
  } else if (title && title.trim() && title.trim() !== article.title) {
    article.slug = await generateUniqueSlug(Article, title, article.id);
  }

  if (excerpt !== undefined) article.excerpt = excerpt ? excerpt.trim() : null;
  if (content !== undefined) article.content = content;
  if (featuredImage !== undefined) article.featuredImage = featuredImage || null;
  if (categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) return res.status(400).json({ error: 'That category does not exist.' });
    article.categoryId = categoryId;
  }

  applySeoFields(article, req.body);
  applyTags(article, req.body);
  applySchedule(article, req.body);
  applySecondaryCategories(article, req.body);
  await article.save();

  const full = await Article.findByPk(article.id, { include: AUTHOR_INCLUDE });
  res.json({ article: full });
});

const STATUS_TRANSITIONS = {
  author: [
    { from: ['draft'], to: 'pending_review' },
    { from: ['pending_review'], to: 'draft' },
  ],
  managerial: [
    { from: ['draft', 'pending_review'], to: 'published' },
    { from: ['published'], to: 'draft' },
    { from: ['pending_review'], to: 'draft' },
    { from: ['draft'], to: 'pending_review' },
  ],
};

const setStatus = asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found.' });

  const { status: nextStatus } = req.body;
  if (!Article.STATUSES.includes(nextStatus)) {
    return res.status(400).json({ error: `Status must be one of: ${Article.STATUSES.join(', ')}.` });
  }

  const isOwner = article.authorId === req.user.id;
  const canManage = canManageAny(req.user);

  if (!canManage && !isOwner) {
    return res.status(403).json({ error: 'You can only update your own articles.' });
  }

  const ruleSet = canManage ? STATUS_TRANSITIONS.managerial : STATUS_TRANSITIONS.author;
  const allowed = ruleSet.some((rule) => rule.from.includes(article.status) && rule.to === nextStatus);

  if (!allowed) {
    const verb = canManage ? '' : ' Ask an editor to publish it.';
    return res.status(403).json({
      error: `Can't move this article from "${article.status}" to "${nextStatus}".${verb}`,
    });
  }

  article.status = nextStatus;
  if (nextStatus === 'published') {
    if (!article.publishedAt) article.publishedAt = new Date();
    // If publishing immediately (no schedule), clear any existing scheduledAt
    if (!req.body.scheduledAt) article.scheduledAt = null;
    // If a scheduledAt is provided, set it (future = scheduled, past = live now)
    if (req.body.scheduledAt) article.scheduledAt = new Date(req.body.scheduledAt);
  }
  if (nextStatus === 'draft') {
    // Reset schedule when unpublishing
    article.scheduledAt = null;
  }

  await article.save();
  const full = await Article.findByPk(article.id, { include: AUTHOR_INCLUDE });
  res.json({ article: full });
});

const remove = asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found.' });

  const isOwner = article.authorId === req.user.id;
  const canManage = canManageAny(req.user);

  if (!canManage && !isOwner) {
    return res.status(403).json({ error: 'You can only delete your own articles.' });
  }
  if (!canManage && article.status === 'published') {
    return res.status(403).json({ error: 'Ask an editor to delete a published article.' });
  }

  await article.destroy();
  res.status(204).send();
});

module.exports = { list, getOne, create, update, setStatus, remove };
