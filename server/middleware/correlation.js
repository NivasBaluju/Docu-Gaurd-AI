/**
 * DocuGuard AI — Request Correlation Middleware
 * ---------------------------------------------------------------------------
 * Assigns or extracts an X-Correlation-Id for every incoming HTTP request.
 * Propagates the ID on response headers and across service boundaries (Node -> Flask).
 */

const { v4: uuidv4 } = require('uuid');

const CORRELATION_HEADER = 'x-correlation-id';

function correlationMiddleware(req, res, next) {
  // Extract from incoming header or generate a new UUID v4
  const incomingId = req.headers[CORRELATION_HEADER] || req.headers['x-request-id'];
  // Sanitize incoming ID to ensure alphanumeric and hyphens only (max 64 chars)
  const correlationId = (typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(incomingId))
    ? incomingId
    : uuidv4();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  next();
}

/**
 * Returns an object containing the correlation header for outbound HTTP calls.
 */
function getCorrelationHeaders(req, additionalHeaders = {}) {
  const headers = { ...additionalHeaders };
  if (req && req.correlationId) {
    headers[CORRELATION_HEADER] = req.correlationId;
  }
  return headers;
}

module.exports = {
  correlationMiddleware,
  getCorrelationHeaders,
  CORRELATION_HEADER
};
