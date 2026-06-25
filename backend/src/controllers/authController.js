const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

  if (!user || !user.isActive || !(await user.checkPassword(password))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = signToken(user);
  return res.json({ token, user: user.toSafeJSON() });
});

const me = asyncHandler(async (req, res) => {
  return res.json({ user: req.user.toSafeJSON() });
});

module.exports = { login, me };
