const jwt = require('jsonwebtoken');
const config = require('../config/env');

function requireGuestAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please verify your email first.' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.type !== 'guest' || !payload.email) {
      return res.status(401).json({ error: 'Invalid session. Please verify your email again.' });
    }
    req.guestEmail = payload.email;
    req.guestSubmissionToken = payload.token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please verify your email again.' });
  }
}

module.exports = { requireGuestAuth };
