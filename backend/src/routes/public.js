const express = require('express');
const { listCategories, listArticles, getArticle, sitemap, submitGuestArticle, guestSubmissionConfig } = require('../controllers/publicController');
const { requestOtp, verifyOtp, getChatHistory } = require('../controllers/guestAuthController');
const { requireGuestAuth } = require('../middleware/guestAuth');

const router = express.Router();

router.get('/categories', listCategories);
router.get('/articles', listArticles);
router.get('/articles/:slug', getArticle);
router.get('/sitemap', sitemap);
router.get('/guest-submission-config', guestSubmissionConfig);
router.post('/guest-articles', requireGuestAuth, submitGuestArticle);
router.post('/guest-otp/request', requestOtp);
router.post('/guest-otp/verify', verifyOtp);
router.get('/guest-chat/history', requireGuestAuth, getChatHistory);

module.exports = router;
