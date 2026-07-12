const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: 'settings_key_unique' },
  value: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'settings',
  underscored: true,
});

module.exports = Setting;
