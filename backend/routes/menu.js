const express = require('express');
const { getCategories, getMenuItems, getMenuItemById } = require('../controllers/menu');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', getCategories);
router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);

module.exports = router;