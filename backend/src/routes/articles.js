const express = require('express');
const { list, getOne, create, update, setStatus, remove } = require('../controllers/articleController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Public routes — no auth needed
router.get('/', list);
router.get('/:id', getOne);

// Protected routes — require auth
router.post('/', requireAuth, create);
router.put('/:id', requireAuth, update);
router.patch('/:id/status', requireAuth, setStatus);
router.delete('/:id', requireAuth, remove);

module.exports = router;
