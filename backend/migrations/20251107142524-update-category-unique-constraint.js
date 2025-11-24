'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop the existing unique index on name
    await queryInterface.removeIndex('categories', 'name');

    // Add composite unique index on name and cafeteria_id
    await queryInterface.addIndex('categories', ['name', 'cafeteria_id'], {
      unique: true,
      name: 'categories_name_cafeteria_id_unique'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove the composite unique index
    await queryInterface.removeIndex('categories', 'categories_name_cafeteria_id_unique');

    // Add back the global unique index on name
    await queryInterface.addIndex('categories', ['name'], {
      unique: true,
      name: 'name'
    });
  }
};
