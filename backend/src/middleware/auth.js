const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User } = require('../models');
const { recordActivity } = require('./activityTracker');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findByPk(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'This account is no longer active.' });
    }

    req.user = user;
    recordActivity(user.id); // fire-and-forget — never awaited, never blocks the request
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  }
}

module.exports = { requireAuth };
