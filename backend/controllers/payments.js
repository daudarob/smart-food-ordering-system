const mpesaService = require('../services/mpesaService');
const { Order, Transaction } = require('../models');
const invoiceService = require('../services/invoiceService');
const logger = require('../config/logger');

// Initiate M-Pesa payment
const initiateMpesaPayment = async (req, res) => {
  try {
    const { orderId, phoneNumber, amount } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!orderId || !phoneNumber || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: orderId, phoneNumber, amount'
      });
    }

    // Verify order belongs to user and is in correct state
    const order = await Order.findOne({
      where: {
        id: orderId,
        user_id: userId
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found or does not belong to user'
      });
    }

    if (order.payment_status !== 'pending') {
      return res.status(400).json({
        error: 'Order already processed or payment already initiated'
      });
    }

    // Verify amount matches order total (allow small rounding differences)
    const orderAmount = parseFloat(order.total);
    const paymentAmount = parseFloat(amount);
    if (Math.abs(orderAmount - paymentAmount) > 0.01) {
      logger.warn('Payment amount mismatch:', {
        orderId,
        orderAmount,
        paymentAmount,
        difference: Math.abs(orderAmount - paymentAmount)
      });
      return res.status(400).json({
        error: `Payment amount (${paymentAmount}) does not match order total (${orderAmount})`
      });
    }

    logger.info('Initiating M-Pesa payment for order:', {
      orderId,
      userId,
      amount: paymentAmount,
      phoneNumber,
      orderStatus: order.status,
      paymentStatus: order.payment_status
    });

    // Initiate STK Push
    const stkPushResult = await mpesaService.initiateSTKPush(paymentAmount, phoneNumber, orderId);

    // Store transaction details
    await mpesaService.storeTransaction(orderId, stkPushResult.checkoutRequestId, phoneNumber, paymentAmount, 'pending');

    // Update order with checkout request ID
    await order.update({
      checkout_request_id: stkPushResult.checkoutRequestId,
      payment_method: 'mpesa'
    });

    logger.info('M-Pesa STK Push initiated successfully:', {
      orderId,
      checkoutRequestId: stkPushResult.checkoutRequestId,
      customerMessage: stkPushResult.customerMessage
    });

    res.json({
      success: true,
      message: 'M-Pesa payment initiated. Please check your phone and enter your PIN.',
      checkoutRequestId: stkPushResult.checkoutRequestId,
      customerMessage: stkPushResult.customerMessage
    });

  } catch (error) {
    logger.error('STK Push initiation error:', {
      message: error.message,
      orderId: req.body.orderId,
      userId: req.user?.id,
      stack: error.stack
    });

    // Update order status to failed if we have an order ID
    if (req.body.orderId) {
      try {
        await Order.update(
          { payment_status: 'failed' },
          { where: { id: req.body.orderId, user_id: req.user.id } }
        );
        logger.info('Updated order status to failed:', req.body.orderId);
      } catch (updateError) {
        logger.error('Failed to update order status:', updateError.message);
      }
    }

    // Return appropriate error response
    const statusCode = error.message.includes('credentials') || error.message.includes('Invalid') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to initiate M-Pesa payment',
      details: error.message
    });
  }
};

// Handle M-Pesa callback
const mpesaCallback = async (req, res) => {
  try {
    const callbackData = req.body;

    logger.info('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));

    // Check if callback is successful
    if (callbackData.Body && callbackData.Body.stkCallback) {
      const stkCallback = callbackData.Body.stkCallback;

      // Extract transaction details
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;
      const checkoutRequestId = stkCallback.CheckoutRequestID;

      let transactionDetails = null;
      let mpesaReceiptNumber = null;
      let phoneNumber = null;

      if (resultCode === 0 && stkCallback.CallbackMetadata) {
        // Successful payment
        const metadata = stkCallback.CallbackMetadata.Item;

        // Extract relevant information
        metadata.forEach(item => {
          switch (item.Name) {
            case 'Amount':
              transactionDetails = { ...transactionDetails, amount: item.Value };
              break;
            case 'MpesaReceiptNumber':
              mpesaReceiptNumber = item.Value;
              break;
            case 'TransactionDate':
              transactionDetails = { ...transactionDetails, transactionDate: item.Value };
              break;
            case 'PhoneNumber':
              phoneNumber = item.Value;
              break;
          }
        });

        logger.info('M-Pesa payment successful:', {
          checkoutRequestId,
          mpesaReceiptNumber,
          amount: transactionDetails?.amount,
          phoneNumber
        });

        // Update transaction status
        await mpesaService.updateTransaction(checkoutRequestId, 'completed', mpesaReceiptNumber);

        // Update order status to paid
        const [updatedRows] = await Order.update(
          {
            payment_status: 'paid',
            status: 'confirmed', // Move order to confirmed status
            mpesa_receipt_number: mpesaReceiptNumber
          },
          {
            where: { checkout_request_id: checkoutRequestId }
          }
        );

        if (updatedRows > 0) {
          logger.info('Order payment status updated to paid:', checkoutRequestId);

          // Find the order for invoice generation and notifications
          const order = await Order.findOne({
            where: { checkout_request_id: checkoutRequestId }
          });

          if (order) {
            // Generate invoice automatically upon successful payment
            try {
              logger.info(`Generating invoice for paid order ${order.id}`);
              const generatedInvoice = await invoiceService.generateInvoiceFromOrder(order);
              logger.info(`Invoice generated successfully upon payment: ${generatedInvoice.invoice_number}`);
            } catch (invoiceError) {
              logger.error('Failed to generate invoice upon payment:', invoiceError);
              // Don't fail the payment process if invoice generation fails
            }

            // Emit WebSocket event to notify frontend
            const io = req.app.get('io');
            if (io) {
              io.to(`user_${order.user_id}`).emit('payment_success', {
                orderId: order.id,
                amount: transactionDetails?.amount,
                mpesaReceiptNumber,
                status: 'paid',
                timestamp: new Date().toISOString()
              });
              logger.info('WebSocket payment_success event emitted:', {
                userId: order.user_id,
                orderId: order.id,
                amount: transactionDetails?.amount
              });
            }
          }
        } else {
          logger.warn('No order found with checkout request ID:', checkoutRequestId);
        }

      } else {
        // Payment failed
        logger.warn('M-Pesa payment failed:', {
          checkoutRequestId,
          resultCode,
          resultDesc
        });

        // Update transaction status
        await mpesaService.updateTransaction(checkoutRequestId, 'failed');

        // Update order status to failed
        await Order.update(
          { payment_status: 'failed' },
          { where: { checkout_request_id: checkoutRequestId } }
        );
      }
    } else {
      logger.warn('Invalid M-Pesa callback format:', callbackData);
    }

    // Always respond with success to M-Pesa
    res.json({ success: true });

  } catch (error) {
    logger.error('M-Pesa callback processing error:', error);
    // Still respond with success to avoid retries
    res.json({ success: true });
  }
};

// Check payment status
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        user_id: userId
      },
      attributes: ['id', 'payment_status', 'checkout_request_id', 'total', 'status', 'created_at']
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let paymentStatus = order.payment_status;
    let shouldQueryMpesa = false;

    // If payment is still pending and order is older than 2 minutes, query M-Pesa directly
    if (paymentStatus === 'pending' && order.checkout_request_id) {
      const orderAge = Date.now() - new Date(order.created_at).getTime();
      const twoMinutes = 2 * 60 * 1000;

      if (orderAge > twoMinutes) {
        shouldQueryMpesa = true;
        logger.info('Order is older than 2 minutes and still pending, querying M-Pesa directly:', {
          orderId,
          checkoutRequestId: order.checkout_request_id,
          orderAge: Math.round(orderAge / 1000) + 's'
        });
      }
    }

    // Query M-Pesa status if needed
    if (shouldQueryMpesa && order.checkout_request_id) {
      try {
        const mpesaStatus = await mpesaService.querySTKPushStatus(order.checkout_request_id);
        logger.info('M-Pesa query result:', mpesaStatus);

        if (mpesaStatus.ResponseCode === '0') {
          const resultCode = mpesaStatus.ResultCode;

          if (resultCode === '0') {
            // Payment successful - update order status
            paymentStatus = 'paid';
            await Order.update(
              { payment_status: 'paid', status: 'confirmed' },
              { where: { id: orderId } }
            );

            // Generate invoice automatically upon successful payment
            try {
              logger.info(`Generating invoice for polled payment confirmation order ${orderId}`);
              const updatedOrder = await Order.findByPk(orderId); // Get updated order
              const generatedInvoice = await invoiceService.generateInvoiceFromOrder(updatedOrder);
              logger.info(`Invoice generated successfully upon polled payment: ${generatedInvoice.invoice_number}`);
            } catch (invoiceError) {
              logger.error('Failed to generate invoice upon polled payment:', invoiceError);
              // Don't fail the payment process if invoice generation fails
            }

            // Emit WebSocket event
            const io = req.app.get('io');
            if (io) {
              io.to(`user_${userId}`).emit('payment_success', {
                orderId: order.id,
                status: 'paid',
                timestamp: new Date().toISOString()
              });
              logger.info('WebSocket payment_success event emitted via polling query');
            }

          } else if (resultCode === '1') {
            // Payment failed
            paymentStatus = 'failed';
            await Order.update(
              { payment_status: 'failed' },
              { where: { id: orderId } }
            );
          } else if (resultCode === '1032') {
            // Payment cancelled
            paymentStatus = 'cancelled';
            await Order.update(
              { payment_status: 'cancelled' },
              { where: { id: orderId } }
            );
          }
          // Other result codes remain as pending
        }
      } catch (queryError) {
        logger.warn('Failed to query M-Pesa status:', queryError.message);
        // Continue with database status if query fails
      }
    }

    res.json({
      orderId: order.id,
      paymentStatus: paymentStatus,
      orderStatus: order.status,
      checkoutRequestId: order.checkout_request_id,
      amount: order.total,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get payment status error:', error.message);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

// Manual payment confirmation
const manualPaymentConfirm = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        user_id: userId
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'paid') {
      return res.json({ success: true, message: 'Payment already confirmed' });
    }

    // Update order status to paid
    await order.update({
      payment_status: 'paid',
      status: 'confirmed'
    });

    logger.info('Manual payment confirmation for order:', orderId);

    // Generate invoice automatically upon successful payment
    try {
      logger.info(`Generating invoice for manually confirmed order ${order.id}`);
      const generatedInvoice = await invoiceService.generateInvoiceFromOrder(order);
      logger.info(`Invoice generated successfully upon manual payment: ${generatedInvoice.invoice_number}`);
    } catch (invoiceError) {
      logger.error('Failed to generate invoice upon manual payment:', invoiceError);
      // Don't fail the payment process if invoice generation fails
    }

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('payment_success', {
        orderId: order.id,
        status: 'paid',
        timestamp: new Date().toISOString()
      });
      logger.info('WebSocket payment_success event emitted via manual confirmation');
    }

    res.json({ success: true, message: 'Payment confirmed successfully' });

  } catch (error) {
    logger.error('Manual payment confirmation error:', error.message);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

module.exports = {
  initiateMpesaPayment,
  mpesaCallback,
  checkPaymentStatus,
  manualPaymentConfirm
};