const request = require('supertest');
const app = require('../app');
const { sequelize, MenuItem, Category, User } = require('../models');

describe('Menu API', () => {
  let adminToken;
  let testMenuItem;
  let testCategory;

  beforeAll(async () => {
    // Ensure database is ready for testing
    await sequelize.authenticate();

    // Create test category
    testCategory = await Category.create({
      id: 'test-category',
      name: 'Test Category',
      description: 'Test category for menu tests',
      cafeteria_id: 'test-cafeteria'
    });

    // Create test menu item
    testMenuItem = await MenuItem.create({
      id: 'test-menu-item',
      name: 'Test Item',
      description: 'Test menu item',
      price: 100.00,
      category_id: 'test-category',
      available: true,
      stock: 10,
      cafeteria_id: 'test-cafeteria'
    });

    // Create test admin user
    await User.create({
      id: 'test-admin',
      email: 'admin@test.com',
      password_hash: '$2b$10$hashedpassword', // This would be properly hashed in real scenario
      name: 'Test Admin',
      role: 'cafeteria_admin',
      cafeteria_id: 'test-cafeteria'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await MenuItem.destroy({ where: { id: 'test-menu-item' } });
    await Category.destroy({ where: { id: 'test-category' } });
    await User.destroy({ where: { id: 'test-admin' } });

    // Close database connection
    await sequelize.close();
  });

  describe('PUT /api/admin/menu/:id', () => {
    beforeAll(async () => {
      // Login as admin to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123' // Assuming test password
        });

      adminToken = loginResponse.body.token;
    });

    it('should update menu item price successfully', async () => {
      const newPrice = 150.50;

      const response = await request(app)
        .put(`/api/admin/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: newPrice })
        .expect(200);

      expect(response.body).toHaveProperty('id', testMenuItem.id);
      expect(response.body).toHaveProperty('price', newPrice);

      // Verify in database
      const updatedItem = await MenuItem.findByPk(testMenuItem.id);
      expect(updatedItem.price).toBe(newPrice);
    });

    it('should reject price update with negative value', async () => {
      const response = await request(app)
        .put(`/api/admin/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: -10 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should allow price update to zero', async () => {
      const response = await request(app)
        .put(`/api/admin/menu/${testMenuItem.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('price', 0);

      // Verify in database
      const updatedItem = await MenuItem.findByPk(testMenuItem.id);
      expect(updatedItem.price).toBe(0);
    });
  });
});