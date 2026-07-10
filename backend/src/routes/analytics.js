const express = require('express');
const { overview, daily, articles, authors, categories, syncGA4Views } = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/overview', overview);
router.get('/daily', daily);
router.get('/articles', articles);
router.get('/authors', authors);
router.get('/categories', categories);
router.post('/sync-ga4', syncGA4Views);

module.exports = router;
