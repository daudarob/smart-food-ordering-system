'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Cafeteria admin passwords follow format: [CafeteriaName]2025&
    const paulPassword = '$2b$10$KbFFSmEESLS0quERtLZQPOr5LuqCpoXduZ7t.raehLi5q.q03q4/6'; // PaulAdmin2025&
    const cafelaterPassword = '$2b$10$YgwLWXN.UjDO3CwHchtPJe8qWlru2qc1D4APpuezF126RurzhLGDm'; // Cafelater2025&
    const sironiPassword = '$2b$10$agbrTC45NamTAH.VuKvR3.5/2WZBcMwGRzmdEi7.KoLRIiFd96xA.'; // SironiStudentCenter2025&
    const humanityPassword = '$2b$10$cmWKu4ytMilJV0YydE8rceont/5SzUK.NcYpWWxcdw5cHme9wpoT6'; // SironiHumanity2025&

    await queryInterface.bulkInsert('users', [
      {
        id: 'admin-paul-caffe',
        name: 'Paul Caffe Admin',
        email: 'pauladmin@campus.com',
        password_hash: paulPassword,
        role: 'cafeteria_admin',
        cafeteria_id: 'cafeteria-paul-caffe',
        phone: null,
        address: null,
        fcm_token: null,
        profile_picture: null,
        favorites: '[]',
        created_at: new Date()
      },
      {
        id: 'admin-cafelater',
        name: 'Cafe Later Admin',
        email: 'cafelateradmin@campus.com',
        password_hash: cafelaterPassword,
        role: 'cafeteria_admin',
        cafeteria_id: 'cafeteria-cafelater',
        phone: null,
        address: null,
        fcm_token: null,
        profile_picture: null,
        favorites: '[]',
        created_at: new Date()
      },
      {
        id: 'admin-sironi-student-center',
        name: 'Sironi Student Center Admin',
        email: 'sironistudentcenteradmin@campus.com',
        password_hash: sironiPassword,
        role: 'cafeteria_admin',
        cafeteria_id: 'cafeteria-sironi-student-center',
        phone: null,
        address: null,
        fcm_token: null,
        profile_picture: null,
        favorites: '[]',
        created_at: new Date()
      },
      {
        id: 'admin-sironi-humanity',
        name: 'Sironi Humanity Admin',
        email: 'sironihumanityadmin@campus.com',
        password_hash: humanityPassword,
        role: 'cafeteria_admin',
        cafeteria_id: 'cafeteria-sironi-humanity',
        phone: null,
        address: null,
        fcm_token: null,
        profile_picture: null,
        favorites: '[]',
        created_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { role: 'cafeteria_admin' }, {});
  }
};
