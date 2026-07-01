const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../utils/asyncHandler');
const { Article, Category } = require('../models');
const { syncToWordPress, testWpConnection } = require('../controllers/wpSyncController');

router.use(requireAuth);

router.get('/test', requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await testWpConnection();
  if (result.ok) {
    res.json({ ok: true, message: `Connected as: ${result.user.name}`, user: result.user });
  } else {
    res.status(502).json({ ok: false, error: result.error });
  }
}));

router.post('/:id', requireRole('admin', 'editor'), asyncHandler(async (req, res) => {
  const article = await Article.findByPk(req.params.id, {
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
  });

  if (!article) return res.status(404).json({ error: 'Article not found.' });
  if (article.status !== 'published') {
    return res.status(400).json({ error: 'Only published articles can be synced to WordPress.' });
  }

  try {
    const { wpPostId, wpUrl } = await syncToWordPress(article, article.category?.slug);
    await article.update({ wpPostId });
    res.json({ ok: true, message: 'Synced to WordPress successfully.', wpPostId, wpUrl });
  } catch (err) {
    console.error('[wp-sync] Sync failed:', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
}));

module.exports = router;
