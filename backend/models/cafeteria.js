'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cafeteria extends Model {
    static associate(models) {
      Cafeteria.hasMany(models.User, { foreignKey: 'cafeteria_id' });
      Cafeteria.hasMany(models.MenuItem, { foreignKey: 'cafeteria_id' });
      Cafeteria.hasMany(models.Category, { foreignKey: 'cafeteria_id' });
      Cafeteria.hasMany(models.Order, { foreignKey: 'cafeteria_id' });
    }
  }

  Cafeteria.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Cafeteria',
    tableName: 'cafeterias',
    timestamps: false
  });

  return Cafeteria;
};