const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { createCategory, updateCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menu');
const { getAllOrders, updateOrderStatus } = require('../controllers/orders');
const { createDiscount, getAllDiscounts, getDiscountById, updateDiscount, deleteDiscount, toggleDiscountStatus } = require('../controllers/discount');
const { createInvoice, getAllInvoices, getInvoiceById, updateInvoice, deleteInvoice, generateInvoicePDF } = require('../controllers/invoice');

const router = express.Router();

// All admin routes require authentication and cafeteria_admin role
router.use(authenticate);
router.use(authorize(['cafeteria_admin']));

// Category CRUD
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Menu item CRUD
router.post('/menu', createMenuItem);
router.put('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

// Orders
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);

// Discounts
router.post('/discounts', createDiscount);
router.get('/discounts', getAllDiscounts);
router.get('/discounts/:id', getDiscountById);
router.put('/discounts/:id', updateDiscount);
router.delete('/discounts/:id', deleteDiscount);
router.patch('/discounts/:id/toggle', toggleDiscountStatus);

// Invoices
router.post('/invoices', createInvoice);
router.get('/invoices', getAllInvoices);
router.get('/invoices/:id', getInvoiceById);
router.put('/invoices/:id', updateInvoice);
router.delete('/invoices/:id', deleteInvoice);
router.get('/invoices/:id/pdf', generateInvoicePDF);

// Price History
router.get('/price-history', require('../controllers/menu').getPriceHistory);

module.exports = router;