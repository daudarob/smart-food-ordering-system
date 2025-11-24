'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'mpesa_receipt_number', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'checkout_request_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('orders', 'mpesa_receipt_number');
  }
};