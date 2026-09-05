const rateLimit = require('express-rate-limit');

/**
 * Enterprise Rate Limiters for Deciva
 * Protects against brute-force attacks, OTP enumeration, SMTP exhaustion, and AI quota drainage.
 */

const isDev = process.env.NODE_ENV !== 'production';

// 1. Strict Authentication Limiter (Login, Registration, OTP Requests)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 20, // Max 20 attempts per IP per 15 minutes in prod (100 in dev)
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
  max: isDev ? 30 : 10, // Max 10 attempts to prevent PIN brute forcing in prod
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

// 4. Integration Operations Limiter (Sync runs, connection checks)
const integrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Integration operational throughput limit reached. Please wait before retrying.'
  }
});

// 5. Inbound Webhook Limiter (Prevents webhook flood / resource exhaustion)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Webhook receiver rate limit exceeded.'
  }
});

module.exports = {
  authLimiter,
  otpVerifyLimiter,
  aiLimiter,
  integrationLimiter,
  webhookLimiter
};
