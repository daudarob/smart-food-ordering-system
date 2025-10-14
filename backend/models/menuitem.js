'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MenuItem extends Model {
    static associate(models) {
      MenuItem.belongsTo(models.Category, { foreignKey: 'category_id' });
      MenuItem.hasMany(models.OrderItem, { foreignKey: 'menu_item_id' });
      MenuItem.belongsTo(models.Cafeteria, { foreignKey: 'cafeteria_id' });
    }
  }

  MenuItem.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    category_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    ingredients: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    cafeteria_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'cafeterias',
        key: 'id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'MenuItem',
    tableName: 'menu_items',
    timestamps: false
  });

  return MenuItem;
};