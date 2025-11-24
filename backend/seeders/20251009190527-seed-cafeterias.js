'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('cafeterias', [
      { id: 'cafeteria-paul-caffe', name: 'Paul Caffe', image_url: '/pauls-cafe.jpeg' },
      { id: 'cafeteria-cafelater', name: 'Cafe Later', image_url: '/cafelater.jpg' },
      { id: 'cafeteria-sironi-student-center', name: 'Sironi Student Center', image_url: '/humanity.png' },
      { id: 'cafeteria-sironi-humanity', name: 'Sironi Humanity', image_url: '/humanity.png' }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('cafeterias', null, {});
  }
};
