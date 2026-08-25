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
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/email');

const router = express.Router();

function issueToken(sessionId, userId) {
  return jwt.sign({ sessionId, userId }, JWT_SECRET, { expiresIn: '7d' });
}

// --- Register ---------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const { rows: existingRows } = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingRows[0]) return res.status(409).json({ error: 'An account with that email already exists' });

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);
    const mfaEnabled = process.env.REQUIRE_MFA !== 'false';
    await db.query(
      'INSERT INTO users (id, name, email, password_hash, mfa_enabled) VALUES ($1, $2, $3, $4, $5)',
      [id, name, email.toLowerCase(), hash, mfaEnabled]
    );

    await recordAudit(id, 'USER_REGISTERED', { email: email.toLowerCase(), mfaEnabled });
    sendWelcomeEmail(email.toLowerCase(), name).catch(err => console.error('Welcome email error:', err.message));
    res.json({ ok: true, message: 'Account created. Please log in.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Login (step 1: password) -----------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [(email || '').toLowerCase()]);
    const user = rows[0];
    if (!user) {
      await logThreat(null, req.ip, 'medium', 'auth', `Failed login attempt for unknown email ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) {
      await logThreat(user.id, req.ip, 'medium', 'auth', 'Failed login attempt: wrong password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const requireMfa = !!user.mfa_enabled || process.env.REQUIRE_MFA !== 'false';
    if (requireMfa) {
      // Issue a short-lived pre-auth token; MFA verification completes login.
      const preToken = jwt.sign({ preauth: true, userId: user.id }, JWT_SECRET, { expiresIn: '10m' });
      return res.json({ mfaRequired: true, method: 'totp', preToken });
    }

    const sessionId = uuidv4();
    await db.query(
      'INSERT INTO sessions (id, user_id, device_fingerprint, ip, mfa_verified) VALUES ($1, $2, $3, $4, false)',
      [sessionId, user.id, fingerprint(req), req.ip]
    );

    const token = issueToken(sessionId, user.id);
    await recordAudit(user.id, 'LOGIN_SUCCESS', { mfa: false });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, mfaEnabled: !!user.mfa_enabled } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- TOTP MFA setup ----------------------------------------------------------
router.post('/mfa/totp/setup', async (req, res) => {
  try {
    let userId;
    const { preToken } = req.body || {};
    if (preToken) {
      try {
        const payload = jwt.verify(preToken, JWT_SECRET);
        if (payload.preauth) userId = payload.userId;
      } catch (e) { }
    }
    if (!userId) {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET);
          userId = payload.userId;
        } catch (e) { }
      }
    }
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = authenticator.generateSecret();
    await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, user.id]);
    const otpauth = authenticator.keyuri(user.email, 'Docu-Gaurd AI', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    res.json({ secret, qrDataUrl });
  } catch (err) {
    console.error('TOTP setup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/mfa/totp/enable', async (req, res) => {
  try {
    let userId;
    const { code, preToken } = req.body || {};
    if (preToken) {
      try {
        const payload = jwt.verify(preToken, JWT_SECRET);
        if (payload.preauth) userId = payload.userId;
      } catch (e) { }
    }
    if (!userId) {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET);
          userId = payload.userId;
        } catch (e) { }
      }
    }
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.totp_secret) return res.status(400).json({ error: 'Run setup first' });

    const valid = authenticator.check(code || '', user.totp_secret);
    if (!valid) return res.status(400).json({ error: 'Invalid code' });
    await db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [user.id]);
    await recordAudit(user.id, 'MFA_ENABLED', { method: 'totp' });
    res.json({ ok: true });
  } catch (err) {
    console.error('TOTP enable error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function verifyOtpCode(userId, inputCode) {
  const cleanInput = String(inputCode || '').trim();
  if (!cleanInput) return false;
  const { rows: otpRows } = await db.query(
    `SELECT * FROM otp_codes
     WHERE user_id = $1 AND purpose = 'login' AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const otp = otpRows[0];
  if (!otp) return false;
  const isCodeMatch = String(otp.code).trim() === cleanInput;
  if (isCodeMatch) {
    await db.query('UPDATE otp_codes SET used = true WHERE id = $1', [otp.id]);
    return true;
  }
  return false;
}

router.post('/mfa/totp/verify', async (req, res) => {
  try {
    const { preToken, code } = req.body;
    let payload;
    try {
      payload = jwt.verify(preToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Login session expired, please log in again' });
    }
    if (!payload.preauth) return res.status(400).json({ error: 'Invalid pre-auth token' });

    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cleanCode = String(code || '').trim();
    let valid = false;

    if (user.totp_secret) {
      try {
        valid = authenticator.check(cleanCode, user.totp_secret);
      } catch (e) { }
    }

    if (!valid) {
      valid = await verifyOtpCode(user.id, cleanCode);
    }

    if (!valid) {
      await logThreat(user.id, req.ip, 'high', 'mfa', 'Failed MFA verification attempt');
      return res.status(401).json({ error: 'Invalid authentication code' });
    }

    const sessionId = uuidv4();
    await db.query(
      'INSERT INTO sessions (id, user_id, device_fingerprint, ip, mfa_verified) VALUES ($1, $2, $3, $4, true)',
      [sessionId, user.id, fingerprint(req), req.ip]
    );
    const token = issueToken(sessionId, user.id);
    await recordAudit(user.id, 'LOGIN_SUCCESS', { mfa: true });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, mfaEnabled: true } });
  } catch (err) {
    console.error('TOTP verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Email OTP (alternative second factor) ----------------------------------
router.post('/mfa/otp/request', async (req, res) => {
  try {
    const { preToken } = req.body;
    let payload;
    try {
      payload = jwt.verify(preToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Login session expired' });
    }
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const id = uuidv4();
    await db.query(
      `INSERT INTO otp_codes (id, user_id, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes')`,
      [id, user.id, code, 'login']
    );

    const result = await sendOtpEmail(user.email, code);
    res.json({ ok: true, devMode: result.devMode, devCode: result.devMode ? code : undefined });
  } catch (err) {
    console.error('OTP request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/mfa/otp/verify', async (req, res) => {
  try {
    const { preToken, code } = req.body;
    let payload;
    try {
      payload = jwt.verify(preToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Login session expired' });
    }

    const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cleanCode = String(code || '').trim();
    let valid = await verifyOtpCode(user.id, cleanCode);

    if (!valid && user.totp_secret) {
      try {
        valid = authenticator.check(cleanCode, user.totp_secret);
      } catch (e) { }
    }

    if (!valid) {
      await logThreat(user.id, req.ip, 'high', 'mfa', 'Failed OTP verification attempt');
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    const sessionId = uuidv4();
    await db.query(
      'INSERT INTO sessions (id, user_id, device_fingerprint, ip, mfa_verified) VALUES ($1, $2, $3, $4, true)',
      [sessionId, user.id, fingerprint(req), req.ip]
    );
    const token = issueToken(sessionId, user.id);
    await recordAudit(user.id, 'LOGIN_SUCCESS', { mfa: 'email_otp' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, mfaEnabled: !!user.mfa_enabled } });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Session info / logout ---------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, trust: req.trust, session: { id: req.session.id, createdAt: req.session.created_at } });
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await db.query('UPDATE sessions SET revoked = true WHERE id = $1', [req.session.id]);
    await recordAudit(req.user.id, 'LOGOUT', {});
    res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
