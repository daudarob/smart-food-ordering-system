const express = require('express');
const { initiatePayment, stripeWebhook, mpesaWebhook, getPaymentStatus } = require('../controllers/payments');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/initiate', authenticate, initiatePayment);
router.get('/status/:checkoutRequestId', authenticate, getPaymentStatus);
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
router.post('/webhook/mpesa', express.json(), mpesaWebhook);

module.exports = router;