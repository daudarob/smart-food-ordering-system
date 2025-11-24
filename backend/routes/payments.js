const express = require('express');
const { initiateMpesaPayment, mpesaCallback, checkPaymentStatus, manualPaymentConfirm } = require('../controllers/payments');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Initiate M-Pesa payment
router.post('/mpesa/initiate', authenticate, initiateMpesaPayment);

// Receive M-Pesa callbacks
router.post('/mpesa/callback', mpesaCallback);

// Check payment status
router.get('/status/:orderId', authenticate, checkPaymentStatus);

// Manual payment confirmation
router.post('/manual-confirm/:orderId', authenticate, manualPaymentConfirm);

module.exports = router;