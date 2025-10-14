const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const { Order } = require('../models');
const { initiateSTKPush, checkPaymentStatus } = require('../services/mpesaService');

const initiatePayment = async (req, res) => {
  try {
    console.log('User from auth middleware:', req.user);
    const { orderId, paymentMethod } = req.body;
    const userId = req.user.id;

    let order = await Order.findOne({ where: { id: orderId, user_id: userId } });
    if (!order) {
      // For testing, create a dummy order if not found
      order = await Order.create({
        id: orderId,
        user_id: userId,
        cafeteria_id: req.user.cafeteria_id, // Add cafeteria_id
        total: 100, // dummy total
        payment_status: 'pending'
      });
    }

    if (paymentMethod === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100), // Stripe expects amount in cents
        currency: 'kes',
        metadata: { orderId: order.id }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } else if (paymentMethod === 'mpesa') {
      const { phoneNumber } = req.body;
      if (!phoneNumber) return res.status(400).json({ error: 'Phone number required for M-Pesa' });

      try {
        console.log('Initiating M-Pesa STK push for order:', order.id, 'phone:', phoneNumber);
        const stkResponse = await initiateSTKPush(phoneNumber, order.total, `Order-${order.id}`, 'Cafeteria Order Payment');
        const checkoutRequestId = stkResponse.CheckoutRequestID || stkResponse.checkoutRequestId;
        console.log('STK push response:', stkResponse);
        order.checkout_request_id = checkoutRequestId;
        order.payment_status = 'pending';
        await order.save();
        res.json({ message: 'M-Pesa STK push initiated', checkoutRequestId, responseCode: stkResponse.ResponseCode });
      } catch (error) {
        console.error('M-Pesa STK push failed:', error);
        res.status(500).json({ error: 'Failed to initiate M-Pesa payment' });
      }
    } else {
      res.status(400).json({ error: 'Invalid payment method' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;
    try {
      const order = await Order.findByPk(orderId);
      if (order) {
        order.payment_status = 'paid';
        await order.save();
      }
    } catch (error) {
      console.error('Error updating order payment status:', error);
    }
  }

  res.json({ received: true });
};

const mpesaWebhook = async (req, res) => {
  // Handle M-Pesa callback
  // Update order payment_status based on callback
  const { Body } = req.body;
  if (Body && Body.stkCallback && Body.stkCallback.ResultCode === 0) {
    // Success
    const checkoutRequestId = Body.stkCallback.CheckoutRequestID;
    const order = await Order.findOne({ where: { checkout_request_id: checkoutRequestId } });
    if (order) {
      order.payment_status = 'paid';
      await order.save();
    }
  }
  res.json({ received: true });
};

const getPaymentStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    const order = await Order.findOne({ where: { checkout_request_id: checkoutRequestId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Check real-time status from M-Pesa service
    const statusResult = await checkPaymentStatus(checkoutRequestId);

    // Update order status if it changed
    if (statusResult.status !== order.payment_status) {
      order.payment_status = statusResult.status;
      await order.save();
    }

    res.json({ status: order.payment_status, checkoutRequestId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { initiatePayment, stripeWebhook, mpesaWebhook, getPaymentStatus };