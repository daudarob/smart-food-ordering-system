'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('cafeterias', [
      { id: 'cafeteria-paul-caffe', name: 'Paul Caffe' },
      { id: 'cafeteria-cafelater', name: 'Cafelater' },
      { id: 'cafeteria-sironi-student-center', name: 'Sironi Student Center' },
      { id: 'cafeteria-sironi-humanity', name: 'Sironi Humanity' }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('cafeterias', null, {});
  }
};
