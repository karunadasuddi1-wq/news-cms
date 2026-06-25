function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message).join(' ');
    return res.status(400).json({ error: messages || 'Invalid data submitted.' });
  }

  console.error(err);
  const status = err.status || 500;
  const message =
    status === 500 ? 'Something went wrong on our end. Please try again.' : err.message;
  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
