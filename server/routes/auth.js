const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const db = require('../db');
const { fingerprint, JWT_SECRET, requireAuth } = require('../middleware/auth');
const { recordAudit, logThreat } = require('../utils/audit');

const router = express.Router();

function issueToken(sessionId, userId) {
  return jwt.sign({ sessionId, userId }, JWT_SECRET, { expiresIn: '7d' });
}

async function sendOtpEmail(toEmail, code) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[DEV MODE] OTP for ${toEmail}: ${code} (no SMTP configured — set SMTP_* in .env to send real emails)`);
    return { devMode: true };
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: toEmail,
    subject: 'Your LexSecure AI verification code',
    text: `Your one-time verification code is: ${code}\nIt expires in 10 minutes.`
  });
  return { devMode: false };
}

// --- Register ---------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const id = uuidv4();
  const hash = await bcrypt.hash(password, 12);
  const mfaEnabled = (process.env.REQUIRE_MFA !== 'false') ? 1 : 0;
  db.prepare('INSERT INTO users (id, name, email, password_hash, mfa_enabled) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, email.toLowerCase(), hash, mfaEnabled);

  recordAudit(id, 'USER_REGISTERED', { email: email.toLowerCase(), mfaEnabled: !!mfaEnabled });
  res.json({ ok: true, message: 'Account created. Please log in.' });
});

// --- Login (step 1: password) -----------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase());
  if (!user) {
    logThreat(null, req.ip, 'medium', 'auth', `Failed login attempt for unknown email ${email}`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const ok = await bcrypt.compare(password || '', user.password_hash);
  if (!ok) {
    logThreat(user.id, req.ip, 'medium', 'auth', 'Failed login attempt: wrong password');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const requireMfa = !!user.mfa_enabled || process.env.REQUIRE_MFA !== 'false';
  if (requireMfa) {
    // Issue a short-lived pre-auth token; MFA verification completes login.
    const preToken = jwt.sign({ preauth: true, userId: user.id }, JWT_SECRET, { expiresIn: '10m' });
    return res.json({ mfaRequired: true, method: 'totp', preToken });
  }

  const sessionId = uuidv4();
  db.prepare('INSERT INTO sessions (id, user_id, device_fingerprint, ip, mfa_verified) VALUES (?, ?, ?, ?, 0)')
    .run(sessionId, user.id, fingerprint(req), req.ip);

  const token = issueToken(sessionId, user.id);
  recordAudit(user.id, 'LOGIN_SUCCESS', { mfa: false });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, mfaEnabled: !!user.mfa_enabled } });
});


// --- TOTP MFA setup ----------------------------------------------------------
router.post('/mfa/totp/setup', async (req, res) => {
  let userId;
  const { preToken } = req.body || {};
  if (preToken) {
    try {
      const payload = jwt.verify(preToken, JWT_SECRET);
      if (payload.preauth) userId = payload.userId;
    } catch (e) {}
  }
  if (!userId) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        userId = payload.userId;
      } catch (e) {}
    }
  }
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = authenticator.generateSecret();
  db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, user.id);
  const otpauth = authenticator.keyuri(user.email, 'LexSecure AI', secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  res.json({ secret, qrDataUrl });
});


router.post('/mfa/totp/enable', (req, res) => {
  let userId;
  const { code, preToken } = req.body || {};
  if (preToken) {
    try {
      const payload = jwt.verify(preToken, JWT_SECRET);
      if (payload.preauth) userId = payload.userId;
    } catch (e) {}
  }
  if (!userId) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        userId = payload.userId;
      } catch (e) {}
    }
  }
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.totp_secret) return res.status(400).json({ error: 'Run setup first' });

  const valid = authenticator.check(code || '', user.totp_secret);
  if (!valid) return res.status(400).json({ error: 'Invalid code' });
  db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(user.id);
  recordAudit(user.id, 'MFA_ENABLED', { method: 'totp' });
  res.json({ ok: true });
});


router.post('/mfa/totp/verify', (req, res) => {
  const { preToken, code } = req.body;
  let payload;
  try {
    payload = jwt.verify(preToken, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Login session expired, please log in again' });
  }
  if (!payload.preauth) return res.status(400).json({ error: 'Invalid pre-auth token' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
  const valid = authenticator.check(code || '', user.totp_secret || '');
  if (!valid) {
    logThreat(user.id, req.ip, 'high', 'mfa', 'Failed TOTP verification attempt');
    return res.status(401).json({ error: 'Invalid authentication code' });
  }

  const sessionId = uuidv4();
  db.prepare('INSERT INTO sessions (id, user_id, device_fingerprint, ip, mfa_verified) VALUES (?, ?, ?, ?, 1)')
    .run(sessionId, user.id, fingerprint(req), req.ip);
  const token = issueToken(sessionId, user.id);
  recordAudit(user.id, 'LOGIN_SUCCESS', { mfa: true });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, mfaEnabled: true } });
});

// --- Email OTP (alternative second factor) ----------------------------------
router.post('/mfa/otp/request', async (req, res) => {
  const { preToken } = req.body;
  let payload;
  try {
    payload = jwt.verify(preToken, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Login session expired' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO otp_codes (id, user_id, code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, user.id, code, 'login', expiresAt);

  const result = await sendOtpEmail(user.email, code);
  res.json({ ok: true, devMode: result.devMode, devCode: result.devMode ? code : undefined });
});

router.post('/mfa/otp/verify', (req, res) => {
  const { preToken, code } = req.body;
  let payload;
  try {
    payload = jwt.verify(preToken, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Login session expired' });
  }
  const otp = db.prepare(`
    SELECT * FROM otp_codes WHERE user_id = ? AND purpose = 'login' AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(payload.userId);

  if (!otp || otp.code !== code || new Date(otp.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired code' });
  }
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
  const sessionId = uuidv4();
  db.prepare('INSERT INTO sessions (id, user_id, device_fingerprint, ip, mfa_verified) VALUES (?, ?, ?, ?, 1)')
    .run(sessionId, user.id, fingerprint(req), req.ip);
  const token = issueToken(sessionId, user.id);
  recordAudit(user.id, 'LOGIN_SUCCESS', { mfa: 'email_otp' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, mfaEnabled: !!user.mfa_enabled } });
});

// --- Session info / logout ---------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, trust: req.trust, session: { id: req.session.id, createdAt: req.session.created_at } });
});

router.post('/logout', requireAuth, (req, res) => {
  db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(req.session.id);
  recordAudit(req.user.id, 'LOGOUT', {});
  res.json({ ok: true });
});

module.exports = router;
