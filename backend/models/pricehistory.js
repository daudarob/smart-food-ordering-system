'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PriceHistory extends Model {
    static associate(models) {
      PriceHistory.belongsTo(models.MenuItem, {
        foreignKey: 'menu_item_id',
        as: 'menuItem'
      });
      PriceHistory.belongsTo(models.User, {
        foreignKey: 'changed_by',
        as: 'changedBy'
      });
      PriceHistory.belongsTo(models.Cafeteria, {
        foreignKey: 'cafeteria_id',
        as: 'cafeteria'
      });
    }
  }

  PriceHistory.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    menu_item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'menu_items',
        key: 'id'
      }
    },
    old_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    new_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    change_type: {
      type: DataTypes.ENUM('individual', 'bulk_percentage', 'bulk_fixed'),
      allowNull: false,
      defaultValue: 'individual'
    },
    change_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changed_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    cafeteria_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cafeterias',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'PriceHistory',
    tableName: 'price_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PriceHistory;
};