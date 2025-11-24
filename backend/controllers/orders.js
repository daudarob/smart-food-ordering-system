const Joi = require('joi');
const { Order, OrderItem, MenuItem, User } = require('../models');
const { sequelize } = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const notificationService = require('../services/notificationService');
const invoiceService = require('../services/invoiceService');

const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      menuId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  total: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('mpesa', 'stripe').required(),
  phoneNumber: Joi.string().when('paymentMethod', {
    is: 'mpesa',
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  })
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'preparing', 'ready', 'delivered').required()
});

const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { error } = createOrderSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { items, total, paymentMethod } = req.body;
    const userId = req.user.id;

    // Verify items exist and calculate total
    let calculatedTotal = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findByPk(item.menuId, { transaction });
      if (!menuItem || !menuItem.available) {
        await transaction.rollback();
        return res.status(400).json({ error: `Menu item ${item.menuId} not available` });
      }
      calculatedTotal += parseFloat(menuItem.price) * item.quantity;
    }

    if (Math.abs(calculatedTotal - total) > 0.01) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Total mismatch' });
    }

    // Get cafeteria_id from the first menu item
    const firstMenuItem = await MenuItem.findByPk(items[0].menuId, { transaction });
    const cafeteria_id = firstMenuItem.cafeteria_id;

    const order = await Order.create({
      user_id: userId,
      total,
      payment_method: paymentMethod,
      cafeteria_id
    }, { transaction });

    for (const item of items) {
      const menuItem = await MenuItem.findByPk(item.menuId, { transaction });
      await OrderItem.create({
        order_id: order.id,
        menu_item_id: item.menuId,
        quantity: item.quantity,
        price: menuItem.price
      }, { transaction });
    }

    await transaction.commit();

    // Initiate payment
    let paymentResponse = {};
    if (paymentMethod === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100),
        currency: 'kes',
        metadata: { orderId: order.id }
      });
      paymentResponse = { clientSecret: paymentIntent.client_secret };
    } else if (paymentMethod === 'mpesa') {
      // For M-Pesa, we need to initiate payment through the payments controller
      // This will be handled by the frontend calling the payments/initiate endpoint
      paymentResponse = { message: 'Order created. Proceed to payment initiation.' };
    }

    res.status(201).json({ orderId: order.id, status: order.status, payment: paymentResponse });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.findAll({
      where: { user_id: userId },
      include: [{
        model: OrderItem,
        include: [{
          model: MenuItem,
          attributes: ['name', 'price']
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const where = {};
    if (req.user && req.user.role === 'cafeteria_admin' && req.user.cafeteria_id) {
      where.cafeteria_id = req.user.cafeteria_id;
    }
    const orders = await Order.findAll({
      where,
      attributes: ['id', 'total', 'status', 'payment_status', 'payment_method', 'mpesa_receipt_number', 'created_at'],
      include: [{
        model: OrderItem,
        include: [{
          model: MenuItem,
          attributes: ['name', 'price']
        }]
      }, {
        model: User,
        attributes: ['name', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { error } = updateStatusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Check if admin owns this order
    if (req.user.role === 'cafeteria_admin' && order.cafeteria_id !== req.user.cafeteria_id) {
      return res.status(403).json({ error: 'Access denied: Order belongs to another cafeteria' });
    }

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    // Check if we should generate an invoice (order completed and paid)
    let generatedInvoice = null;
    if (invoiceService.shouldGenerateInvoice(order, status)) {
      try {
        console.log(`Generating invoice for completed order ${order.id}`);
        generatedInvoice = await invoiceService.generateInvoiceFromOrder(order);
        console.log(`Invoice generated successfully: ${generatedInvoice.invoice_number}`);
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        // Don't fail the order status update if invoice generation fails
        // Log the error but continue
      }
    }

    // Send notifications (simplified for testing)
    // await notificationService.notifyOrderStatusChange(order, { name: 'User', email: 'user@example.com' });

    // Emit real-time update to user
    const io = req.app.get('io');
    io.to(`user_${order.user_id}`).emit('order-status-update', {
      orderId: order.id,
      status: order.status,
      updatedAt: order.updated_at
    });

    const response = {
      message: 'Order status updated',
      invoiceGenerated: !!generatedInvoice
    };

    if (generatedInvoice) {
      response.invoice = {
        id: generatedInvoice.id,
        invoice_number: generatedInvoice.invoice_number,
        total: generatedInvoice.total
      };
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.payment_status = 'paid';
    order.status = 'confirmed';
    await order.save();

    res.json({ message: 'Payment confirmed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createOrder, getUserOrders, getAllOrders, updateOrderStatus, confirmPayment };
