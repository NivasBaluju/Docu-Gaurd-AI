const rateLimit = require('express-rate-limit');

/**
 * Enterprise Rate Limiters for DocuGuard AI
 * Protects against brute-force attacks, OTP enumeration, SMTP exhaustion, and AI quota drainage.
 */

// 1. Strict Authentication Limiter (Login, Registration, OTP Requests)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Too many authentication requests from this IP address. Please try again in 15 minutes.'
  }
});

// 2. Ultra-Strict Code Verification Limiter (OTP verification, TOTP MFA verify)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 6, // Max 6 attempts to prevent 6-digit PIN brute forcing
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Too many failed code verification attempts. Access temporarily restricted for 15 minutes.'
  }
});

// 3. AI Inference & Heavy Processing Limiter (Chat, Simulation, Negotiation)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 25, // Max 25 queries per minute per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  message: {
    error: 'AI reasoning throughput limit exceeded. Please wait a moment before initiating another query.'
  }
});

module.exports = {
  authLimiter,
  otpVerifyLimiter,
  aiLimiter
};
