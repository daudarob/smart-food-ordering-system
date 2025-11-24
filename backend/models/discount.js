'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Discount extends Model {
    static associate(models) {
      Discount.belongsTo(models.Category, { foreignKey: 'category_id', as: 'category' });
      Discount.belongsTo(models.MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
    }
  }

  Discount.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false,
      defaultValue: 'percentage'
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    scope: {
      type: DataTypes.ENUM('global', 'category', 'item'),
      allowNull: false,
      defaultValue: 'global'
    },
    category_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    menu_item_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'menu_items',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
   sequelize,
   modelName: 'Discount',
   tableName: 'discounts',
   timestamps: false
 });

  return Discount;
};