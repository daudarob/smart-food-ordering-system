const { Invoice, Order, OrderItem, MenuItem, User, Cafeteria } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Generate an invoice from a completed order
 * @param {Object} order - The completed order object with associations
 * @returns {Object} - The created invoice
 */
const generateInvoiceFromOrder = async (order) => {
  const transaction = await sequelize.transaction();

  try {
    // Check if invoice already exists for this order
    const existingInvoice = await Invoice.findOne({
      where: {
        notes: { [require('sequelize').Op.like]: `%Order #${order.id}%` },
        cafeteria_id: order.cafeteria_id
      },
      transaction
    });

    if (existingInvoice) {
      await transaction.rollback();
      throw new Error('Invoice already exists for this order');
    }

    // Get order items with menu item details
    const orderItems = await OrderItem.findAll({
      where: { order_id: order.id },
      include: [{
        model: MenuItem,
        attributes: ['name', 'price']
      }],
      transaction
    });

    // Get customer details
    const customer = await User.findByPk(order.user_id, {
      attributes: ['name', 'email', 'phone', 'address'],
      transaction
    });

    // Get cafeteria details
    const cafeteria = await Cafeteria.findByPk(order.cafeteria_id, {
      attributes: ['name'],
      transaction
    });

    // Prepare invoice items
    const invoiceItems = orderItems.map(item => ({
      description: item.MenuItem.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.price)
    }));

    // Calculate totals (no tax for orders, discount already applied to order total)
    const subtotal = parseFloat(order.total);
    const taxRate = 0; // Orders don't have separate tax calculation
    const tax_amount = 0;
    const discount_amount = 0; // Discount already applied to order total
    const total = subtotal;

    // Generate invoice number
    const currentYear = new Date().getFullYear();
    const prefix = `ORD-${order.cafeteria_id.slice(-4).toUpperCase()}-${currentYear}`;

    // Find the latest order invoice number for this cafeteria this year
    const latestInvoice = await Invoice.findOne({
      where: {
        cafeteria_id: order.cafeteria_id,
        invoice_number: {
          [require('sequelize').Op.like]: `${prefix}%`
        }
      },
      order: [['invoice_number', 'DESC']],
      transaction
    });

    let sequence = 1;
    if (latestInvoice) {
      const lastSequence = parseInt(latestInvoice.invoice_number.split('-').pop());
      sequence = lastSequence + 1;
    }

    const invoiceNumber = `${prefix}-${sequence.toString().padStart(4, '0')}`;

    // Set due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create the invoice
    const invoice = await Invoice.create({
      invoice_number: invoiceNumber,
      cafeteria_id: order.cafeteria_id,
      client_name: customer.name,
      client_email: customer.email,
      client_phone: customer.phone,
      client_address: customer.address,
      items: invoiceItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount,
      discount_amount,
      total,
      due_date: dueDate,
      notes: `Invoice generated from Order #${order.id} - ${cafeteria.name}`,
      payment_terms: 'Payment due within 30 days',
      created_by: order.user_id // Use the customer as creator, or we could use admin
    }, { transaction });

    await transaction.commit();

    // Return the created invoice with associations
    return await Invoice.findByPk(invoice.id, {
      include: [
        { model: Cafeteria, attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['name'] }
      ]
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error generating invoice from order:', error);
    throw error;
  }
};

/**
 * Check if an order should trigger invoice generation
 * @param {Object} order - The order object
 * @param {string} newStatus - The new status being set
 * @returns {boolean} - Whether to generate invoice
 */
const shouldGenerateInvoice = (order, newStatus) => {
  return newStatus === 'delivered' && order.payment_status === 'paid';
};

module.exports = {
  generateInvoiceFromOrder,
  shouldGenerateInvoice
};