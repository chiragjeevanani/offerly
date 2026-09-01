const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  console.error(err.stack || err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new Error(message);
    error.statusCode = 400;
  }

  const message = error.message || 'Server Error';

  // Response shape is inconsistent across this codebase (some handlers use
  // `{ error }`, others `{ message }`) - emit both here since this is the
  // last-resort fallback and callers on either convention read it correctly.
  res.status(error.statusCode || 500).json({
    success: false,
    error: message,
    message,
  });
};

export default errorHandler;
