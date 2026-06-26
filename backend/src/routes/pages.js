const express = require('express');
const { list, getOne, create, update, remove } = require('../controllers/pageController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);
router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
