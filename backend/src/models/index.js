const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Article = require('./Article');
const Page = require('./Page');
const Setting = require('./Setting');
const AiUsageLog = require('./AiUsageLog');
const UserActivity = require('./UserActivity');
const GuestOtp = require('./GuestOtp');
const GuestChatMessage = require('./GuestChatMessage');

// Article associations
Article.belongsTo(User, { as: 'author', foreignKey: { name: 'authorId', field: 'author_id', allowNull: false } });
User.hasMany(Article, { as: 'articles', foreignKey: { name: 'authorId', field: 'author_id' } });

Article.belongsTo(Category, { as: 'category', foreignKey: { name: 'categoryId', field: 'category_id', allowNull: false } });
Category.hasMany(Article, { as: 'articles', foreignKey: { name: 'categoryId', field: 'category_id' } });

// AI usage log associations (needed for the AI Costs dashboard's include: [{ model: User, as: 'user' }])
AiUsageLog.belongsTo(User, { as: 'user', foreignKey: { name: 'userId', field: 'user_id' } });

// User activity associations (needed for the daily activity report's include: [{ model: User, as: 'user' }])
UserActivity.belongsTo(User, { as: 'user', foreignKey: { name: 'userId', field: 'user_id' } });

module.exports = {
  Setting,
  AiUsageLog,
  UserActivity,
  GuestOtp,
  GuestChatMessage,
  sequelize,
  User,
  Category,
  Article,
  Page,
};
