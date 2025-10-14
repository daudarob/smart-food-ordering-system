const express = require('express');
const { createOrder, getUserOrders, updateOrderStatus, confirmPayment } = require('../controllers/orders');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

router.post('/', authenticate, createOrder);
router.get('/', authenticate, getUserOrders);
router.put('/:id/status', authenticate, authorize(['admin']), updateOrderStatus);
router.post('/confirm-payment', authenticate, confirmPayment);

module.exports = router;