const express = require('express');
const { overview, daily, articles, authors, categories } = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/overview', overview);
router.get('/daily', daily);
router.get('/articles', articles);
router.get('/authors', authors);
router.get('/categories', categories);

module.exports = router;
