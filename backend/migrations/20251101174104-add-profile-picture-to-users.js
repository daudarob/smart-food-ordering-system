'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'profile_picture', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
      comment: 'Path to user profile picture file'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'profile_picture');
  }
};
