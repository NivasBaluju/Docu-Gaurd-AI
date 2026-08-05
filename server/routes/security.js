const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { verifyChain, recordAudit } = require('../utils/audit');
const { verifySignature, publicSigningKey } = require('../utils/crypto');

const router = express.Router();

// --- SOC dashboard summary ---------------------------------------------------
router.get('/dashboard', requireAuth, (req, res) => {
  const docCount = db.prepare('SELECT COUNT(*) c FROM documents WHERE user_id = ?').get(req.user.id).c;
  const avgRisk = db.prepare('SELECT AVG(risk_score) a FROM documents WHERE user_id = ? AND risk_score IS NOT NULL').get(req.user.id).a;
  const threatCount = db.prepare('SELECT COUNT(*) c FROM threat_logs WHERE user_id = ?').get(req.user.id).c;
  const chatCount = db.prepare('SELECT COUNT(*) c FROM chat_messages WHERE user_id = ?').get(req.user.id).c;
  const contractCount = db.prepare('SELECT COUNT(*) c FROM generated_contracts WHERE user_id = ?').get(req.user.id).c;
  const activeSessions = db.prepare('SELECT COUNT(*) c FROM sessions WHERE user_id = ? AND revoked = 0').get(req.user.id).c;
  const chain = verifyChain();

  res.json({
    documentsUploaded: docCount,
    avgRiskScore: avgRisk ? Math.round(avgRisk) : 0,
    threatAlerts: threatCount,
    chatInteractions: chatCount,
    contractsGenerated: contractCount,
    activeSessions,
    trustScore: req.trust.score,
    auditLedger: { totalBlocks: chain.totalBlocks, valid: chain.valid },
    complianceGauge: 82 // aggregate placeholder; real per-document scores available via /api/ai/documents/:id/compliance
  });
});

// --- Sessions manager ---------------------------------------------------
router.get('/sessions', requireAuth, (req, res) => {
  const sessions = db.prepare(`
    SELECT id, device_fingerprint, ip, trust_score, mfa_verified, created_at, last_seen, revoked
    FROM sessions WHERE user_id = ? ORDER BY last_seen DESC
  `).all(req.user.id);
  res.json({ sessions, currentSessionId: req.session.id });
});

router.post('/sessions/:id/revoke', requireAuth, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(session.id);
  recordAudit(req.user.id, 'SESSION_REVOKED', { sessionId: session.id });
  res.json({ ok: true });
});

// --- Blockchain audit ledger ---------------------------------------------
router.get('/audit', requireAuth, (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const blocks = db.prepare(`
    SELECT * FROM blockchain_audit WHERE user_id = ? OR user_id IS NULL
    ORDER BY block_index DESC LIMIT ?
  `).all(req.user.id, limit);
  res.json({ blocks });
});

router.get('/audit/verify', requireAuth, (req, res) => {
  res.json(verifyChain());
});

// --- Threat logs -----------------------------------------------------------
router.get('/threats', requireAuth, (req, res) => {
  const threats = db.prepare('SELECT * FROM threat_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.user.id);
  res.json({ threats });
});

// --- Digital signature verification -----------------------------------------
router.get('/signing-key', requireAuth, (req, res) => {
  res.json({ publicKey: publicSigningKey });
});

router.post('/verify-signature', requireAuth, (req, res) => {
  const { data, signature } = req.body;
  if (!data || !signature) return res.status(400).json({ error: 'data and signature are required' });
  const { sha256 } = require('../utils/crypto');
  const valid = verifySignature(sha256(data), signature);
  res.json({ valid });
});

// --- Zero trust status -------------------------------------------------------
router.get('/zero-trust', requireAuth, (req, res) => {
  res.json({ score: req.trust.score, reasons: req.trust.reasons, mfaEnabled: !!req.user.mfa_enabled });
});

module.exports = router;
