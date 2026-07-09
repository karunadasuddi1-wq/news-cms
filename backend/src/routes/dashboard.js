const express = require('express');
const { stats, publishedByAuthor } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, stats);
router.get('/published-by-author', requireAuth, publishedByAuthor);

module.exports = router;
