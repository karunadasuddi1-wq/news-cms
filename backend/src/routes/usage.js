const express = require('express');
const { usageDashboard } = require('../controllers/usageController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);
router.get('/', usageDashboard);

module.exports = router;
