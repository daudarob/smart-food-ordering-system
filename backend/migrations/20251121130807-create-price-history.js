'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('price_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      menu_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'menu_items',
          key: 'id'
        }
      },
      old_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      new_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      change_type: {
        type: Sequelize.ENUM('individual', 'bulk_percentage', 'bulk_fixed'),
        allowNull: false,
        defaultValue: 'individual'
      },
      change_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      cafeteria_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'cafeterias',
          key: 'id'
        }
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('price_history', ['menu_item_id']);
    await queryInterface.addIndex('price_history', ['changed_by']);
    await queryInterface.addIndex('price_history', ['cafeteria_id']);
    await queryInterface.addIndex('price_history', ['created_at']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('price_history');
  }
};
