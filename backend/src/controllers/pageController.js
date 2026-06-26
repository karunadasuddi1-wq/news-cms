const { Page } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

function canManage(user) {
  return user.role === 'admin' || user.role === 'editor';
}

// Public: GET /api/public/pages
const listPublic = asyncHandler(async (req, res) => {
  const pages = await Page.findAll({
    where: { isPublished: true },
    attributes: ['id', 'title', 'slug', 'showInFooter', 'sortOrder'],
    order: [['sortOrder', 'ASC'], ['title', 'ASC']],
  });
  res.json({ pages });
});

// Public: GET /api/public/pages/:slug
const getPublic = asyncHandler(async (req, res) => {
  const page = await Page.findOne({
    where: { slug: req.params.slug, isPublished: true },
  });
  if (!page) return res.status(404).json({ error: 'Page not found.' });
  res.json({ page });
});

// Admin: GET /api/pages
const list = asyncHandler(async (req, res) => {
  const pages = await Page.findAll({ order: [['sortOrder', 'ASC'], ['title', 'ASC']] });
  res.json({ pages });
});

// Admin: GET /api/pages/:id
const getOne = asyncHandler(async (req, res) => {
  const page = await Page.findByPk(req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found.' });
  res.json({ page });
});

// Admin: POST /api/pages
const create = asyncHandler(async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ error: 'Editors and admins only.' });
  const { title, slug, content, metaDescription, isPublished, showInFooter, sortOrder } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required.' });
  const page = await Page.create({ title, slug, content: content || '', metaDescription, isPublished: isPublished !== false, showInFooter: showInFooter !== false, sortOrder: sortOrder || 0 });
  res.status(201).json({ page });
});

// Admin: PUT /api/pages/:id
const update = asyncHandler(async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ error: 'Editors and admins only.' });
  const page = await Page.findByPk(req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found.' });
  const { title, slug, content, metaDescription, isPublished, showInFooter, sortOrder } = req.body;
  if (title) page.title = title;
  if (slug) page.slug = slug;
  if (content !== undefined) page.content = content;
  if (metaDescription !== undefined) page.metaDescription = metaDescription;
  if (isPublished !== undefined) page.isPublished = isPublished;
  if (showInFooter !== undefined) page.showInFooter = showInFooter;
  if (sortOrder !== undefined) page.sortOrder = sortOrder;
  await page.save();
  res.json({ page });
});

// Admin: DELETE /api/pages/:id
const remove = asyncHandler(async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ error: 'Editors and admins only.' });
  const page = await Page.findByPk(req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found.' });
  await page.destroy();
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove, listPublic, getPublic };
