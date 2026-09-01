const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { verifyChain, recordAudit, logThreat } = require('../utils/audit');

const router = express.Router();

// --- Admin Platform Overview -------------------------------------------------
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const [usersRes, docsRes, sessRes, threatsRes] = await Promise.all([
      db.query('SELECT COUNT(*) AS c FROM users'),
      db.query('SELECT COUNT(*) AS c FROM documents'),
      db.query('SELECT COUNT(*) AS c FROM sessions WHERE revoked = false'),
      db.query('SELECT COUNT(*) AS c FROM threat_logs')
    ]);

    const chain = await verifyChain();

    res.json({
      totalUsers: Number(usersRes.rows[0].c),
      totalDocuments: Number(docsRes.rows[0].c),
      totalActiveSessions: Number(sessRes.rows[0].c),
      totalThreatAlerts: Number(threatsRes.rows[0].c),
      blockchainAudit: { totalBlocks: chain.totalBlocks, valid: chain.valid }
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Global Risky Users Radar ------------------------------------------------
router.get('/risky-users', requireAdmin, async (req, res) => {
  try {
    const { rows: users } = await db.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.created_at,
        COALESCE(d.doc_count, 0) AS doc_count,
        COALESCE(s.active_sessions, 0) AS active_sessions,
        COALESCE(s.min_trust, 100) AS min_trust,
        COALESCE(t.threat_count, 0) AS threat_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS doc_count FROM documents GROUP BY user_id
      ) d ON d.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS active_sessions, MIN(trust_score) AS min_trust
        FROM sessions WHERE revoked = false GROUP BY user_id
      ) s ON s.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS threat_count FROM threat_logs GROUP BY user_id
      ) t ON t.user_id = u.id
      ORDER BY 
        CASE 
          WHEN COALESCE(t.threat_count, 0) > 0 OR COALESCE(s.min_trust, 100) < 70 THEN 1 
          ELSE 2 
        END,
        u.created_at DESC
    `);

    // Fetch recent threats for each user
    const formatted = await Promise.all(users.map(async (u) => {
      const threatCount = Number(u.threat_count);
      const minTrust = Number(u.min_trust);
      const docCount = Number(u.doc_count);
      const activeSessions = Number(u.active_sessions);

      let riskLevel = 'HEALTHY';
      if (threatCount > 1 || minTrust <= 40) {
        riskLevel = 'CRITICAL_RISK';
      } else if (threatCount === 1 || minTrust < 75) {
        riskLevel = 'ELEVATED_RISK';
      }

      const { rows: threatList } = await db.query(
        'SELECT id, severity, category, message, ip, created_at FROM threat_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3',
        [u.id]
      );

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.email.toLowerCase() === 'balujunivas@gmail.com' ? 'admin' : u.role,
        createdAt: u.created_at,
        docCount,
        activeSessions,
        minTrust,
        threatCount,
        riskLevel,
        recentThreats: threatList
      };
    }));

    res.json({ users: formatted });
  } catch (err) {
    console.error('Risky users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Quarantine / Revoke All Sessions for Risky User -------------------------
router.post('/quarantine-user/:id', requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    const targetUser = rows[0];
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Revoke all sessions
    await db.query('UPDATE sessions SET revoked = true WHERE user_id = $1', [targetUserId]);

    // Record threat & audit log
    await logThreat(targetUserId, req.ip, 'high', 'admin_quarantine', `User quarantined by admin ${req.user.email}`);
    await recordAudit(req.user.id, 'ADMIN_USER_QUARANTINED', { targetUserId, targetEmail: targetUser.email });

    res.json({ ok: true, message: `All active sessions revoked for ${targetUser.email}` });
  } catch (err) {
    console.error('Quarantine user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Global Threat Logs ------------------------------------------------------
router.get('/threat-logs', requireAdmin, async (req, res) => {
  try {
    const { rows: threats } = await db.query(`
      SELECT t.id, t.user_id, u.email AS user_email, t.ip, t.severity, t.category, t.message, t.created_at
      FROM threat_logs t
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);
    res.json({ threats });
  } catch (err) {
    console.error('Admin threat logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
