const express = require('express');
const { list, create, update, remove } = require('../controllers/userController');
const { dailyReport } = require('../controllers/activityController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', list);
router.get('/activity', dailyReport);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
