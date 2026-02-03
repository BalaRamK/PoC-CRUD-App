const errorHandler = (err, req, res, next) => {
  console.error('[errorHandler]', err?.message || err, err?.response?.status, req?.method, req?.path);

  const statusCode = err.response?.status || 500;
  const message =
    err.response?.data?.error?.message?.value
    || err.response?.data?.error?.message
    || (typeof err.response?.data === 'string' ? err.response.data.substring(0, 200) : null)
    || err.message
    || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message: String(message).substring(0, 500),
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = errorHandler;