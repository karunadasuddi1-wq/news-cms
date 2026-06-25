const express = require('express');
const { listCategories, listArticles, getArticle, sitemap } = require('../controllers/publicController');

const router = express.Router();

router.get('/categories', listCategories);
router.get('/articles', listArticles);
router.get('/articles/:slug', getArticle);
router.get('/sitemap', sitemap);

module.exports = router;
