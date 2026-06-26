const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Page = sequelize.define('Page', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    content: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    metaDescription: { type: DataTypes.STRING(320), allowNull: true, field: 'meta_description' },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_published' },
    showInFooter: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'show_in_footer' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  }, {
    tableName: 'pages',
    underscored: true,
  });
  return Page;
};
