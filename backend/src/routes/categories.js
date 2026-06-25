const express = require('express');
const { list, create, update, remove } = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', requireRole('admin', 'editor'), create);
router.put('/:id', requireRole('admin', 'editor'), update);
router.delete('/:id', requireRole('admin', 'editor'), remove);

module.exports = router;
