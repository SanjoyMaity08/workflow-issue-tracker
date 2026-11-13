/**
 * 404 handler for unmatched routes.
 */
export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Central error handler. Turns mongoose validation / cast errors into the
 * 400 shape the API documents.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(400).json({ message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  return res.status(status).json({ message: err.message || 'Server error' });
};
