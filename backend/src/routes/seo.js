const express = require('express');
const { generateSeo } = require('../controllers/seoController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/seo/generate
// Body: { title, content, existingArticleId? }
// Returns: { headline, slug, excerpt, seoTitle, seoDescription, focusKeyword }
router.post('/generate', requireAuth, generateSeo);

module.exports = router;
