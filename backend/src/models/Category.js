const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Category extends Model {}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'categories_name_unique',
      validate: { notEmpty: true },
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'categories_slug_unique',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    underscored: true,
  }
);

module.exports = Category;
