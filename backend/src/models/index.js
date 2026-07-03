const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Article = require('./Article');
const Page = require('./Page');
const Setting = require('./Setting');
const AiUsageLog = require('./AiUsageLog');

// Article associations
Article.belongsTo(User, { as: 'author', foreignKey: { name: 'authorId', field: 'author_id', allowNull: false } });
User.hasMany(Article, { as: 'articles', foreignKey: { name: 'authorId', field: 'author_id' } });

Article.belongsTo(Category, { as: 'category', foreignKey: { name: 'categoryId', field: 'category_id', allowNull: false } });
Category.hasMany(Article, { as: 'articles', foreignKey: { name: 'categoryId', field: 'category_id' } });

module.exports = {
  Setting,
  AiUsageLog,
  sequelize,
  User,
  Category,
  Article,
  Page,
};
