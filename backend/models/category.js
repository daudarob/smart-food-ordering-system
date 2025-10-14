'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.hasMany(models.MenuItem, { foreignKey: 'category_id' });
      Category.belongsTo(models.Cafeteria, { foreignKey: 'cafeteria_id' });
    }
  }

  Category.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cafeteria_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'cafeterias',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    timestamps: false
  });

  return Category;
};