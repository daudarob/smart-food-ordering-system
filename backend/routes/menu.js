const express = require('express');
const { getCategories, getMenuItems, getMenuItemById, getCafeterias } = require('../controllers/menu');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Specific routes before parameterized ones
router.get('/categories', getCategories);
router.get('/cafeterias', getCafeterias);
router.get('/:id', getMenuItemById);
router.get('/', getMenuItems);

module.exports = router;