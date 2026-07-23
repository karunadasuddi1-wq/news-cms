const express = require('express');
const { list, create, update, remove } = require('../controllers/userController');
const { dailyReport } = require('../controllers/activityController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole('admin', 'editor'), list);
router.get('/activity', requireRole('admin'), dailyReport);
router.post('/', requireRole('admin'), create);
router.put('/:id', requireRole('admin'), update);
router.delete('/:id', requireRole('admin'), remove);

module.exports = router;
