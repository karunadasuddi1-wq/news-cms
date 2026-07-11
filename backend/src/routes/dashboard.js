const express = require('express');
const { stats, publishedByAuthor, recentArticles, aiUsageToday } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, stats);
router.get('/published-by-author', requireAuth, publishedByAuthor);
router.get('/recent-articles', requireAuth, recentArticles);
router.get('/ai-usage-today', requireAuth, aiUsageToday);

module.exports = router;
