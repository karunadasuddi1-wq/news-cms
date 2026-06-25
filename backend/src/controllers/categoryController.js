const { Category, Article } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { generateUniqueSlug } = require('../utils/slug');

const list = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({ order: [['name', 'ASC']] });
  res.json({ categories });
});

const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const slug = await generateUniqueSlug(Category, name);
  const category = await Category.create({ name: name.trim(), slug, description });
  res.status(201).json({ category });
});

const update = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found.' });

  const { name, description } = req.body;
  if (name && name.trim() !== category.name) {
    category.name = name.trim();
    category.slug = await generateUniqueSlug(Category, name, category.id);
  }
  if (description !== undefined) category.description = description;

  await category.save();
  res.json({ category });
});

const remove = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found.' });

  const articleCount = await Article.count({ where: { categoryId: category.id } });
  if (articleCount > 0) {
    return res.status(409).json({
      error: `This category has ${articleCount} article(s). Move them to another category first.`,
    });
  }

  await category.destroy();
  res.status(204).send();
});

module.exports = { list, create, update, remove };
