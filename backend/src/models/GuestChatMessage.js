const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GuestChatMessage = sequelize.define('GuestChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING(255), allowNull: false },
  fromType: { type: DataTypes.ENUM('me', 'them'), allowNull: false, field: 'from_type' },
  text: { type: DataTypes.TEXT, allowNull: true },
  imageUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'image_url' },
  tone: { type: DataTypes.STRING(20), allowNull: true },
}, {
  tableName: 'guest_chat_messages',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['email', 'created_at'] },
  ],
});

module.exports = GuestChatMessage;
