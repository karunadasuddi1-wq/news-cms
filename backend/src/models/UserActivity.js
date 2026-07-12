const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per user per calendar day. `activeSeconds` accumulates time between
// consecutive authenticated requests, but only when the gap between them is
// under the idle threshold (see activityTracker.js) — so leaving a tab open
// overnight doesn't count as active time, only genuine back-to-back usage does.
const UserActivity = sequelize.define('UserActivity', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  firstSeenAt: { type: DataTypes.DATE, allowNull: false, field: 'first_seen_at' },
  lastSeenAt: { type: DataTypes.DATE, allowNull: false, field: 'last_seen_at' },
  activeSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'active_seconds' },
}, {
  tableName: 'user_activity',
  underscored: true,
  timestamps: false,
  indexes: [
    { unique: true, fields: ['user_id', 'date'], name: 'user_activity_user_date_unique' },
  ],
});

module.exports = UserActivity;
