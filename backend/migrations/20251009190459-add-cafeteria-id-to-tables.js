'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add cafeteria_id to categories
    await queryInterface.addColumn('categories', 'cafeteria_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'cafeterias',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Add cafeteria_id to menu_items
    await queryInterface.addColumn('menu_items', 'cafeteria_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'cafeterias',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Add cafeteria_id to orders
    await queryInterface.addColumn('orders', 'cafeteria_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'cafeterias',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove cafeteria_id from orders
    await queryInterface.removeColumn('orders', 'cafeteria_id');

    // Remove cafeteria_id from menu_items
    await queryInterface.removeColumn('menu_items', 'cafeteria_id');

    // Remove cafeteria_id from categories
    await queryInterface.removeColumn('categories', 'cafeteria_id');
  }
};
