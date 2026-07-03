const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiUsageLog = sequelize.define('AiUsageLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
  action: { type: DataTypes.STRING(100), allowNull: false },
  provider: { type: DataTypes.STRING(50), allowNull: false },
  model: { type: DataTypes.STRING(100), allowNull: true },
  inputTokens: { type: DataTypes.INTEGER, defaultValue: 0, field: 'input_tokens' },
  outputTokens: { type: DataTypes.INTEGER, defaultValue: 0, field: 'output_tokens' },
  costUsd: { type: DataTypes.DECIMAL(10, 6), defaultValue: 0, field: 'cost_usd' },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'ai_usage_log',
  underscored: true,
  updatedAt: false,
});

AiUsageLog.associate = (models) => {
  AiUsageLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
};
module.exports = AiUsageLog;
