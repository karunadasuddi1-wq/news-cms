// Usage: requireRole('admin') or requireRole('admin', 'editor')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sign in to continue.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `This action needs one of these roles: ${allowedRoles.join(', ')}.`,
      });
    }
    return next();
  };
}

module.exports = { requireRole };
