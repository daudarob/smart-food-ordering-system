const Joi = require('joi');
const { Invoice, Cafeteria, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

// Validation schemas
const createInvoiceSchema = Joi.object({
  invoice_number: Joi.string().required(),
  client_name: Joi.string().required(),
  client_email: Joi.string().email().optional(),
  client_phone: Joi.string().optional(),
  client_address: Joi.string().optional(),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unit_price: Joi.number().positive().required()
    })
  ).min(1).required(),
  tax_rate: Joi.number().min(0).max(100).default(0),
  discount_amount: Joi.number().min(0).default(0),
  due_date: Joi.date().greater('now').required(),
  notes: Joi.string().optional(),
  payment_terms: Joi.string().optional()
});

const updateInvoiceSchema = Joi.object({
  client_name: Joi.string().optional(),
  client_email: Joi.string().email().optional(),
  client_phone: Joi.string().optional(),
  client_address: Joi.string().optional(),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unit_price: Joi.number().positive().required()
    })
  ).optional(),
  tax_rate: Joi.number().min(0).max(100).optional(),
  discount_amount: Joi.number().min(0).optional(),
  due_date: Joi.date().greater('now').optional(),
  notes: Joi.string().optional(),
  payment_terms: Joi.string().optional(),
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional(),
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
});

// Helper function to calculate totals
const calculateTotals = (items, taxRate, discountAmount) => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discountAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax_amount: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

// Generate unique invoice number
const generateInvoiceNumber = async (cafeteriaId) => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${cafeteriaId.slice(-4).toUpperCase()}-${currentYear}`;

  // Find the latest invoice number for this cafeteria this year
  const latestInvoice = await Invoice.findOne({
    where: {
      cafeteria_id: cafeteriaId,
      invoice_number: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['invoice_number', 'DESC']]
  });

  let sequence = 1;
  if (latestInvoice) {
    const lastSequence = parseInt(latestInvoice.invoice_number.split('-').pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
};

// Create invoice
const createInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { error } = createInvoiceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const {
      invoice_number,
      client_name,
      client_email,
      client_phone,
      client_address,
      items,
      tax_rate = 0,
      discount_amount = 0,
      due_date,
      notes,
      payment_terms
    } = req.body;

    const cafeteriaId = req.user.cafeteria_id;
    const createdBy = req.user.id;

    // Generate invoice number if not provided
    let finalInvoiceNumber = invoice_number;
    if (!finalInvoiceNumber) {
      finalInvoiceNumber = await generateInvoiceNumber(cafeteriaId);
    }

    // Check if invoice number already exists
    const existingInvoice = await Invoice.findOne({
      where: { invoice_number: finalInvoiceNumber },
      transaction
    });
    if (existingInvoice) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invoice number already exists' });
    }

    // Calculate totals
    const { subtotal, tax_amount, total } = calculateTotals(items, tax_rate, discount_amount);

    const invoice = await Invoice.create({
      invoice_number: finalInvoiceNumber,
      cafeteria_id: cafeteriaId,
      client_name,
      client_email,
      client_phone,
      client_address,
      items,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      total,
      due_date,
      notes,
      payment_terms,
      created_by: createdBy
    }, { transaction });

    await transaction.commit();

    // Fetch the created invoice with associations
    const createdInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Cafeteria, attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['name'] }
      ]
    });

    res.status(201).json(createdInvoice);
  } catch (error) {
    await transaction.rollback();
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all invoices for admin
const getAllInvoices = async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { page, limit, search, status, start_date, end_date } = value;
    const offset = (page - 1) * limit;

    const where = { cafeteria_id: req.user.cafeteria_id };

    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.like]: `%${search}%` } },
        { client_name: { [Op.like]: `%${search}%` } },
        { client_email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (start_date || end_date) {
      where.issue_date = {};
      if (start_date) where.issue_date[Op.gte] = start_date;
      if (end_date) where.issue_date[Op.lte] = end_date;
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Cafeteria, attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      invoices,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single invoice
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findOne({
      where: {
        id,
        cafeteria_id: req.user.cafeteria_id
      },
      include: [
        { model: Cafeteria, attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['name'] }
      ]
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update invoice
const updateInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { error } = updateInvoiceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { id } = req.params;
    const updateData = req.body;

    const invoice = await Invoice.findOne({
      where: {
        id,
        cafeteria_id: req.user.cafeteria_id
      },
      transaction
    });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Prevent updates if invoice is paid or cancelled
    if (['paid', 'cancelled'].includes(invoice.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot update paid or cancelled invoices' });
    }

    // Recalculate totals if items, tax_rate, or discount_amount changed
    if (updateData.items || updateData.tax_rate !== undefined || updateData.discount_amount !== undefined) {
      const items = updateData.items || invoice.items;
      const taxRate = updateData.tax_rate !== undefined ? updateData.tax_rate : invoice.tax_rate;
      const discountAmount = updateData.discount_amount !== undefined ? updateData.discount_amount : invoice.discount_amount;

      const { subtotal, tax_amount, total } = calculateTotals(items, taxRate, discountAmount);
      updateData.subtotal = subtotal;
      updateData.tax_amount = tax_amount;
      updateData.total = total;
    }

    await invoice.update(updateData, { transaction });
    await transaction.commit();

    // Fetch updated invoice
    const updatedInvoice = await Invoice.findByPk(id, {
      include: [
        { model: Cafeteria, attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['name'] }
      ]
    });

    res.json(updatedInvoice);
  } catch (error) {
    await transaction.rollback();
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const invoice = await Invoice.findOne({
      where: {
        id,
        cafeteria_id: req.user.cafeteria_id
      },
      transaction
    });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Prevent deletion of paid invoices
    if (invoice.status === 'paid') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot delete paid invoices' });
    }

    await invoice.destroy({ transaction });
    await transaction.commit();

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate PDF invoice
const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findOne({
      where: {
        id,
        cafeteria_id: req.user.cafeteria_id
      },
      include: [
        { model: Cafeteria, attributes: ['name', 'image_url'] },
        { model: User, as: 'creator', attributes: ['name'] }
      ]
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Invoice ${invoice.invoice_number}`,
        Author: 'USIU-Africa SFO System'
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to format currency
    const formatCurrency = (amount) => `KES ${parseFloat(amount).toFixed(2)}`;

    // Helper function to format date
    const formatDate = (date) => new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    // Invoice details
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Invoice Number: ${invoice.invoice_number}`, { align: 'right' });
    doc.text(`Issue Date: ${formatDate(invoice.issue_date || invoice.created_at)}`, { align: 'right' });
    doc.text(`Due Date: ${formatDate(invoice.due_date)}`, { align: 'right' });
    doc.moveDown();

    // Cafeteria information (From)
    doc.fontSize(14).font('Helvetica-Bold').text('From:', { underline: true });
    doc.fontSize(12).font('Helvetica');
    doc.text(invoice.Cafeterium.name);
    doc.text('USIU-Africa');
    doc.text('Nairobi, Kenya');
    doc.moveDown();

    // Client information (To)
    doc.fontSize(14).font('Helvetica-Bold').text('Bill To:', { underline: true });
    doc.fontSize(12).font('Helvetica');
    doc.text(invoice.client_name);
    if (invoice.client_email) doc.text(invoice.client_email);
    if (invoice.client_phone) doc.text(invoice.client_phone);
    if (invoice.client_address) doc.text(invoice.client_address);
    doc.moveDown();

    // Items table header
    const tableTop = doc.y;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 350, tableTop);
    doc.text('Unit Price', 400, tableTop);
    doc.text('Total', 480, tableTop);

    // Draw header line
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);

    // Items
    doc.fontSize(10).font('Helvetica');
    let yPosition = doc.y;

    invoice.items.forEach((item, index) => {
      // Check if we need a new page
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      const itemTotal = item.quantity * item.unit_price;
      doc.text(item.description, 50, yPosition, { width: 280 });
      doc.text(item.quantity.toString(), 350, yPosition);
      doc.text(formatCurrency(item.unit_price), 400, yPosition);
      doc.text(formatCurrency(itemTotal), 480, yPosition);

      yPosition += 20;
    });

    // Draw line after items
    doc.moveTo(50, yPosition + 5).lineTo(550, yPosition + 5).stroke();
    doc.moveDown();

    // Totals section
    const totalsX = 350;
    doc.fontSize(10).font('Helvetica-Bold');

    doc.text('Subtotal:', totalsX, doc.y);
    doc.font('Helvetica').text(formatCurrency(invoice.subtotal), 480, doc.y - 12);

    if (invoice.discount_amount > 0) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Discount:', totalsX, doc.y);
      doc.font('Helvetica').text(`-${formatCurrency(invoice.discount_amount)}`, 480, doc.y - 12);
    }

    if (invoice.tax_amount > 0) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text(`Tax (${invoice.tax_rate}%):`, totalsX, doc.y);
      doc.font('Helvetica').text(formatCurrency(invoice.tax_amount), 480, doc.y - 12);
    }

    // Total
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL:', totalsX, doc.y);
    doc.text(formatCurrency(invoice.total), 480, doc.y - 12);

    // Draw total line
    doc.moveTo(totalsX, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown();

    // Payment status
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold');
    const statusText = invoice.status.toUpperCase();
    const statusColor = invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'orange';
    doc.fillColor(statusColor).text(`Status: ${statusText}`, { align: 'right' });
    doc.fillColor('black');

    // Payment terms
    if (invoice.payment_terms) {
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Terms:');
      doc.font('Helvetica').text(invoice.payment_terms);
    }

    // Notes
    if (invoice.notes) {
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(invoice.notes);
    }

    // Footer
    doc.moveDown(2);
    const footerY = doc.page.height - 50;
    doc.fontSize(8).font('Helvetica').text('Thank you for your business!', 50, footerY, { align: 'center' });
    doc.text('Generated by USIU-Africa SFO System', 50, footerY + 15, { align: 'center' });
    doc.text(`Generated on ${formatDate(new Date())}`, 50, footerY + 25, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Generate PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  generateInvoicePDF
};