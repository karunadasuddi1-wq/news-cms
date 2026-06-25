const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

const STATUSES = ['draft', 'pending_review', 'published'];

class Article extends Model {}

Article.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    excerpt: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    featuredImage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'featured_image',
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'draft',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
    },
    seoTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'seo_title',
    },
    seoDescription: {
      type: DataTypes.STRING(320),
      allowNull: true,
      field: 'seo_description',
    },
    focusKeyword: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'focus_keyword',
    },
    ogImage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'og_image',
    },
    canonicalUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'canonical_url',
    },
    noIndex: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'no_index',
    },
    views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const val = this.getDataValue('tags');
        if (!val) return [];
        return val.split(',').map(t => t.trim()).filter(Boolean);
      },
      set(arr) {
        if (Array.isArray(arr)) {
          this.setDataValue('tags', arr.join(','));
        } else {
          this.setDataValue('tags', arr || null);
        }
      },
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_at',
    },
    secondaryCategories: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'secondary_categories',
      get() {
        const val = this.getDataValue('secondaryCategories');
        if (!val) return [];
        try { return JSON.parse(val); } catch { return []; }
      },
      set(arr) {
        this.setDataValue('secondaryCategories', Array.isArray(arr) ? JSON.stringify(arr) : null);
      },
    },
  },
  {
    sequelize,
    modelName: 'Article',
    tableName: 'articles',
    underscored: true,
  }
);

Article.STATUSES = STATUSES;

module.exports = Article;
