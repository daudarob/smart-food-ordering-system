'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add the "Whole Fish" menu item to Paul Caffe cafeteria
    await queryInterface.bulkInsert('menu_items', [{
      id: 'whole-fish-paul-caffe',
      name: 'Whole Fish',
      description: 'Fresh whole tilapia fish grilled to perfection, served with ugali and traditional vegetables. A hearty and nutritious meal that showcases authentic Kenyan coastal cuisine.',
      price: 45.99,
      image_url: '/whole-fish.jpg',
      category_id: 'cafeteria-paul-caffe-main-meal',
      ingredients: 'Fresh tilapia fish, salt, pepper, lemon, ugali, sukuma wiki, tomatoes',
      available: true,
      stock: 15,
      cafeteria_id: 'cafeteria-paul-caffe',
      created_at: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    // Remove the "Whole Fish" menu item
    await queryInterface.bulkDelete('menu_items', { id: 'whole-fish-paul-caffe' }, {});
  }
};
