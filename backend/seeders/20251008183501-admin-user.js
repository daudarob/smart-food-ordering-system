'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = '$2b$10$yvdif9ZraKMw6Belx6Hrlup7uYHex.KjHX6feEtXTKVh0MTeJ4xh.'; // Pre-hashed 'admin123'
    await queryInterface.bulkInsert('users', [{
      id: 'admin-uuid',
      name: 'Admin User',
      email: 'admin@campus.com',
      password_hash: hashedPassword,
      role: 'cafeteria_admin',
      cafeteria_id: null, // Super admin not tied to specific cafeteria
      phone: null,
      address: null,
      fcm_token: null,
      profile_picture: null,
      favorites: '[]',
      created_at: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@campus.com' }, {});
  }
};
