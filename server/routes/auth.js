const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const db = require('../db');
const { fingerprint, JWT_SECRET, requireAuth } = require('../middleware/auth');
const { authLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');
const { encryptSecret, decryptSecret } = require('../utils/crypto');
const { recordAudit, logThreat } = require('../utils/audit');
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/email');

const router = express.Router();

const ADMIN_EMAIL = 'balujunivas@gmail.com';

function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

function issueToken(sessionId, userId) {
  return jwt.sign({ sessionId, userId }, JWT_SECRET, { expiresIn: '7d' });
}

// --- Register (Passwordless Email OTP) ---------------------------------------
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const { rows: existingRows } = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    let user = existingRows[0];

    const role = isAdminEmail(cleanEmail) ? 'admin' : 'user';
    const displayName = (name && name.trim()) ? name.trim() : cleanEmail.split('@')[0];

    if (!user) {
      const id = uuidv4();
      const placeholderHash = await bcrypt.hash(uuidv4(), 10);
      const { rows: newRows } = await db.query(
        'INSERT INTO users (id, name, email, password_hash, role, mfa_enabled) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
        [id, displayName, cleanEmail, placeholderHash, role]
      );
      user = newRows[0];
      await recordAudit(id, 'USER_REGISTERED', { email: cleanEmail, role });
      setImmediate(() => {
        sendWelcomeEmail(cleanEmail, displayName).catch(err => console.warn('Welcome email background dispatch error:', err.message));
      });
    } else {
      const finalRole = isAdminEmail(cleanEmail) ? 'admin' : (user.role || 'user');
      await db.query('UPDATE users SET role = $1, name = COALESCE($2, name) WHERE id = $3', [
        finalRole,
        displayName,
        user.id
      ]);
      user.role = finalRole;
    }

    // Invalidate older unused login OTPs for this user
    await db.query("UPDATE otp_codes SET used = true WHERE user_id = $1 AND purpose = 'login'", [user.id]);

    // Generate cryptographically secure 6-digit OTP (CSPRNG) and send strictly to email
    const code = String(crypto.randomInt(100000, 1000000));
    await db.query(
      `INSERT INTO otp_codes (id, user_id, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes')`,
      [uuidv4(), user.id, code, 'login']
    );

    const emailRes = await sendOtpEmail(user.email, code);
    const preToken = jwt.sign({ preauth: true, userId: user.id }, JWT_SECRET, { expiresIn: '10m' });

    res.json({
      ok: true,
      mfaRequired: true,
      method: 'email',
      preToken,
      deliveryFailed: Boolean(emailRes.deliveryFailed)
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Login (Passwordless Email OTP) ------------------------------------------
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Corporate or personal email address is required', field: 'email' });
    }

    let user;
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (rows[0]) {
      user = rows[0];
      const expectedRole = isAdminEmail(cleanEmail) ? 'admin' : (user.role || 'user');
      if (user.role !== expectedRole) {
        await db.query('UPDATE users SET role = $1 WHERE id = $2', [expectedRole, user.id]);
        user.role = expectedRole;
      }
    } else {
      // Seamless passwordless auto-provisioning
      const id = uuidv4();
      const displayName = cleanEmail.split('@')[0];
      const placeholderHash = await bcrypt.hash(uuidv4(), 10);
      const role = isAdminEmail(cleanEmail) ? 'admin' : 'user';
      const { rows: newRows } = await db.query(
        'INSERT INTO users (id, name, email, password_hash, role, mfa_enabled) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
        [id, displayName, cleanEmail, placeholderHash, role]
      );
      user = newRows[0];
      await recordAudit(id, 'USER_REGISTERED', { email: cleanEmail, role });
      setImmediate(() => {
        sendWelcomeEmail(cleanEmail, displayName).catch(err => console.warn('Welcome email error:', err.message));
      });
    }

    // Invalidate previous login OTPs for this user
    await db.query("UPDATE otp_codes SET used = true WHERE user_id = $1 AND purpose = 'login'", [user.id]);

    // Generate cryptographically secure 6-digit OTP (CSPRNG) and dispatch strictly to email
    const code = String(crypto.randomInt(100000, 1000000));
    await db.query(
      `INSERT INTO otp_codes (id, user_id, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes')`,
      [uuidv4(), user.id, code, 'login']
    );

    const emailRes = await sendOtpEmail(user.email, code);
    const preToken = jwt.sign({ preauth: true, userId: user.id }, JWT_SECRET, { expiresIn: '10m' });

    return res.json({
      ok: true,
      mfaRequired: true,
      method: 'email',
      preToken,
      deliveryFailed: Boolean(emailRes.deliveryFailed)
    });
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
    const encryptedSecret = encryptSecret(secret);
    await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [encryptedSecret, user.id]);
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

    const resolvedSecret = decryptSecret(user.totp_secret);
    const valid = authenticator.check(code || '', resolvedSecret);
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

router.post('/mfa/totp/verify', otpVerifyLimiter, async (req, res) => {
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
        const resolvedSecret = decryptSecret(user.totp_secret);
        valid = authenticator.check(cleanCode, resolvedSecret);
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
    const userRole = isAdminEmail(user.email) ? 'admin' : (user.role || 'user');
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: userRole, mfaEnabled: true } });
  } catch (err) {
    console.error('TOTP verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Email OTP (alternative second factor) ----------------------------------
router.post('/mfa/otp/request', authLimiter, async (req, res) => {
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

    const code = String(crypto.randomInt(100000, 1000000));
    const id = uuidv4();
    await db.query(
      `INSERT INTO otp_codes (id, user_id, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes')`,
      [id, user.id, code, 'login']
    );

    const emailRes = await sendOtpEmail(user.email, code);
    res.json({
      ok: true,
      deliveryFailed: Boolean(emailRes.deliveryFailed)
    });
  } catch (err) {
    console.error('OTP request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/mfa/otp/verify', otpVerifyLimiter, async (req, res) => {
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
        const resolvedSecret = decryptSecret(user.totp_secret);
        valid = authenticator.check(cleanCode, resolvedSecret);
      } catch (e) { }
    }

    if (!valid) {
      await logThreat(user.id, req.ip, 'high', 'mfa', 'Failed OTP verification attempt');
      return res.status(401).json({ error: 'Incorrect or expired verification code. Please try again.', field: 'otp' });
    }

    // Ensure role is admin if special email
    const userRole = isAdminEmail(user.email) ? 'admin' : (user.role || 'user');
    if (user.role !== userRole) {
      await db.query('UPDATE users SET role = $1 WHERE id = $2', [userRole, user.id]);
    }

    const sessionId = uuidv4();
    await db.query(
      'INSERT INTO sessions (id, user_id, device_fingerprint, ip, mfa_verified) VALUES ($1, $2, $3, $4, true)',
      [sessionId, user.id, fingerprint(req), req.ip]
    );
    const token = issueToken(sessionId, user.id);
    await recordAudit(user.id, 'LOGIN_SUCCESS', { mfa: 'email_otp' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: userRole, mfaEnabled: !!user.mfa_enabled } });
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
