const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Article = require('./Article');

// An article belongs to one author (User) and one category.
Article.belongsTo(User, { as: 'author', foreignKey: { name: 'authorId', field: 'author_id', allowNull: false } });
User.hasMany(Article, { as: 'articles', foreignKey: { name: 'authorId', field: 'author_id' } });

Article.belongsTo(Category, { as: 'category', foreignKey: { name: 'categoryId', field: 'category_id', allowNull: false } });
Category.hasMany(Article, { as: 'articles', foreignKey: { name: 'categoryId', field: 'category_id' } });

module.exports = {
  sequelize,
  User,
  Category,
  Article,
};
