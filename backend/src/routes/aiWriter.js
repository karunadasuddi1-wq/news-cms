const express = require('express');
const { fetchUrl, rewrite, saveDraft, trending, recentGenerations } = require('../controllers/aiWriterController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.post('/fetch-url', fetchUrl);
router.post('/rewrite', rewrite);
router.post('/save-draft', saveDraft);
router.get('/trending', trending);
router.get('/recent', recentGenerations);

module.exports = router;
