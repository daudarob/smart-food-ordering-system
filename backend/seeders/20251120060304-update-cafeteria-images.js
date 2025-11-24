'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Update existing cafeterias with image URLs
    await queryInterface.bulkUpdate('cafeterias', { image_url: '/pauls-cafe.jpeg' }, { id: 'cafeteria-paul-caffe' });
    await queryInterface.bulkUpdate('cafeterias', { image_url: '/cafelater.jpg' }, { id: 'cafeteria-cafelater' });
    await queryInterface.bulkUpdate('cafeterias', { image_url: '/salad.jpg' }, { id: 'cafeteria-sironi-student-center' });
    await queryInterface.bulkUpdate('cafeterias', { image_url: '/humanity.png' }, { id: 'cafeteria-sironi-humanity' });
  },

  async down (queryInterface, Sequelize) {
    // Remove image URLs
    await queryInterface.bulkUpdate('cafeterias', { image_url: null }, {});
  }
};
