const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.response?.status || 500;
  const message = err.response?.data?.error?.message?.value || err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = errorHandler;