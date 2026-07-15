const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GuestOtp = sequelize.define('GuestOtp', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING(255), allowNull: false },
  code: { type: DataTypes.STRING(6), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  verifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'verified_at' },
}, {
  tableName: 'guest_otps',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['email'] },
  ],
});

module.exports = GuestOtp;
