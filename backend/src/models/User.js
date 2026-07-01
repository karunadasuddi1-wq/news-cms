const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const ROLES = ['admin', 'editor', 'author'];

class User extends Model {
  async checkPassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  toSafeJSON() {
    const { id, name, email, role, bio, avatar, socialLinks, createdAt, updatedAt } = this;
    return { id, name, email, role, bio, avatar, socialLinks, createdAt, updatedAt };
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
      defaultValue: 'author',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    socialLinks: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'social_links',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    hooks: {
      beforeValidate: async (user) => {
        if (user._plainPassword) {
          user.passwordHash = await bcrypt.hash(user._plainPassword, 10);
        }
      },
    },
  }
);

// Virtual setter: User.build({..., password: 'plain'}) hashes automatically on save.
Object.defineProperty(User.prototype, 'password', {
  set(value) {
    this._plainPassword = value;
  },
});

User.ROLES = ROLES;

module.exports = User;
