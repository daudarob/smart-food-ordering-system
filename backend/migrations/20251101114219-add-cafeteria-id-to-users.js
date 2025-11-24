'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add cafeteria_id to users table
    await queryInterface.addColumn('users', 'cafeteria_id', {
      type: Sequelize.STRING,
      allowNull: true,
      references: {
        model: 'cafeterias',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove cafeteria_id from users table
    await queryInterface.removeColumn('users', 'cafeteria_id');
  }
};
