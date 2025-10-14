'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await queryInterface.bulkInsert('users', [
      {
        id: 'admin-paul-caffe',
        name: 'Paul Caffe Admin',
        email: 'pauladmin@campus.com',
        password_hash: hashedPassword,
        role: 'admin',
        cafeteria_id: 'cafeteria-paul-caffe',
        created_at: new Date()
      },
      {
        id: 'admin-cafelater',
        name: 'Cafelater Admin',
        email: 'cafelateradmin@campus.com',
        password_hash: hashedPassword,
        role: 'admin',
        cafeteria_id: 'cafeteria-cafelater',
        created_at: new Date()
      },
      {
        id: 'admin-sironi-student-center',
        name: 'Sironi Student Center Admin',
        email: 'sironiadmin@campus.com',
        password_hash: hashedPassword,
        role: 'admin',
        cafeteria_id: 'cafeteria-sironi-student-center',
        created_at: new Date()
      },
      {
        id: 'admin-sironi-humanity',
        name: 'Sironi Humanity Admin',
        email: 'humanityadmin@campus.com',
        password_hash: hashedPassword,
        role: 'admin',
        cafeteria_id: 'cafeteria-sironi-humanity',
        created_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { role: 'admin' }, {});
  }
};
