const express = require('express');
const { list, getOne, create, update, setStatus, resync, remove } = require('../controllers/articleController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/status', setStatus);
router.post('/:id/resync', resync);
router.delete('/:id', remove);

module.exports = router;
