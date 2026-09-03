const { v4: uuidv4 } = require('uuid');

/**
 * Standardized Production Error Handler for DocuGuard AI.
 * Ensures consistent response envelopes: { ok: false, error: message, code, requestId }
 * Suppresses internal stack traces and raw database errors in production.
 */
function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const status = Number(err.status || err.statusCode) || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Structured log entry
  console.error(`[ERROR] [${requestId}] ${req.method} ${req.originalUrl} - HTTP ${status}: ${err.message}`);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  // Determine standardized code and user-facing message
  let message = err.message || 'An unexpected error occurred';
  let code = err.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');

  // Suppress sensitive Postgres / SQL syntax or connection strings from leaking
  if (err.routine || err.severity || (status >= 500 && isProduction)) {
    message = 'An internal system error occurred. Please reference requestId when contacting support.';
    code = 'INTERNAL_ERROR';
  }

  res.status(status).json({
    ok: false,
    error: message,
    code,
    requestId,
    ...(err.details ? { details: err.details } : {})
  });
}

module.exports = errorHandler;
