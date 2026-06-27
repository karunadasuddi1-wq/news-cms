const express = require('express');
const { list, create, update, remove } = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const router = express.Router();

// Public
router.get('/', list);

// Protected
router.post('/', requireAuth, requireRole('admin', 'editor'), create);
router.put('/:id', requireAuth, requireRole('admin', 'editor'), update);
router.delete('/:id', requireAuth, requireRole('admin', 'editor'), remove);

module.exports = router;
