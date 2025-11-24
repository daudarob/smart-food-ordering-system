'use strict';
const bcrypt = require('bcrypt');

function generatePassword() {
  const chars = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    number: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };
  let password = '';
  password += chars.upper[Math.floor(Math.random() * chars.upper.length)];
  password += chars.lower[Math.floor(Math.random() * chars.lower.length)];
  password += chars.number[Math.floor(Math.random() * chars.number.length)];
  password += chars.special[Math.floor(Math.random() * chars.special.length)];
  const length = Math.floor(Math.random() * 5) + 8;
  const all = chars.upper + chars.lower + chars.number + chars.special;
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // All students and staff use the same password: 12Dauda12@
    const password = '12Dauda12@';
    const studentPassword = '$2b$10$CWkJSLPrhlrgOSSlTCXxW.YkJUuRpJgJbs11v80RR29aJ1d8BVAZG'; // Hash for 12Dauda12@

    const users = [
      {
        id: 'student-1',
        name: 'John Doe',
        email: 'dabdulahi@usiu.ac.ke',
        password_hash: studentPassword,
        role: 'student',
        cafeteria_id: null, // Students can order from any cafeteria
        phone: null,
        address: null,
        fcm_token: null,
        profile_picture: null,
        favorites: '[]',
        created_at: new Date()
      },
      {
        id: 'student-johnsmith',
        name: 'John Smith',
        email: 'johnsmith@usiu.ac.ke',
        password_hash: '$2b$10$TWJu4PBSVhlVXxnf7paSsOccxZjcGs5cF5aR0VKLZjaW3ffNhIxs.',
        role: 'student',
        cafeteria_id: null,
        phone: null,
        address: null,
        fcm_token: null,
        profile_picture: null,
        favorites: '[]',
        created_at: new Date()
      }
    ];

    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Robert', 'Anna'];
    const lastNames = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown'];

    for (let i = 0; i < 100; i++) {
      const first = firstNames[i % firstNames.length];
      const last = lastNames[i % lastNames.length];
      const num = Math.floor(i / (firstNames.length * lastNames.length)) + 1;
      const fullName = first + num + ' ' + last + num;
      const email = first.toLowerCase() + i + '.' + last.toLowerCase() + i + '@usiu.ac.ke';
      // All generated users (students and staff) use the same password: 12Dauda12@
      const hash = '$2b$10$CWkJSLPrhlrgOSSlTCXxW.YkJUuRpJgJbs11v80RR29aJ1d8BVAZG';
      users.push({
        id: 'user-' + (i + 2),
        name: fullName,
        email: email,
        password_hash: hash,
        role: i % 2 === 0 ? 'student' : 'staff',
        cafeteria_id: null,
        phone: null,
        address: null,
        fcm_token: null,
        profile_picture: null,
        favorites: '[]',
        created_at: new Date()
      });
    }

    await queryInterface.bulkInsert('users', users, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { role: ['student', 'staff'] }, {});
  }
};