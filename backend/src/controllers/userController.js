const { User, Article } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const users = await User.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ users: users.map((u) => u.toSafeJSON()) });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role, bio, avatar, socialLinks } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (!User.ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${User.ROLES.join(', ')}.` });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists.' });
  }

  const user = User.build({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role,
    bio: bio || null,
    avatar: avatar || null,
    socialLinks: socialLinks || {},
  });
  user.password = password; // virtual setter, hashed in beforeCreate hook
  await user.save();

  res.status(201).json({ user: user.toSafeJSON() });
});

const update = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { name, role, isActive, password, bio, avatar, socialLinks } = req.body;

  if (name) user.name = name.trim();
  if (role) {
    if (!User.ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${User.ROLES.join(', ')}.` });
    }
    if (user.id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: "You can't remove your own admin role." });
    }
    user.role = role;
  }
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;
  if (socialLinks !== undefined) user.socialLinks = socialLinks;
  if (typeof isActive === 'boolean') {
    if (user.id === req.user.id && !isActive) {
      return res.status(400).json({ error: "You can't deactivate your own account." });
    }
    user.isActive = isActive;
  }
  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    user.password = password;
  }

  await user.save();
  res.json({ user: user.toSafeJSON() });
});

const remove = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.id === req.user.id) {
    return res.status(400).json({ error: "You can't delete your own account." });
  }

  const articleCount = await Article.count({ where: { authorId: user.id } });
  if (articleCount > 0) {
    return res.status(409).json({
      error: `This user has ${articleCount} article(s). Reassign or delete those first, or deactivate the account instead.`,
    });
  }

  await user.destroy();
  res.status(204).send();
});

module.exports = { list, create, update, remove };
