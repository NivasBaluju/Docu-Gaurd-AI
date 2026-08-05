const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { generateContract, CONTRACT_TYPES } = require('../utils/contractTemplates');
const { signData, sha256 } = require('../utils/crypto');

const router = express.Router();

router.get('/types', requireAuth, (req, res) => {
  res.json({ types: CONTRACT_TYPES });
});

router.post('/generate', requireAuth, (req, res) => {
  const { type, params } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });
  let content;
  try {
    content = generateContract(type, params || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const signature = signData(sha256(content));
  const id = uuidv4();
  db.prepare(`
    INSERT INTO generated_contracts (id, user_id, contract_type, params_json, content, signature)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, type, JSON.stringify(params || {}), content, signature);

  recordAudit(req.user.id, 'CONTRACT_GENERATED', { contractId: id, type });
  res.json({ id, content, signature });
});

router.get('/', requireAuth, (req, res) => {
  const contracts = db.prepare(`
    SELECT id, contract_type, created_at FROM generated_contracts WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ contracts });
});

router.get('/:id', requireAuth, (req, res) => {
  const contract = db.prepare('SELECT * FROM generated_contracts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json({ contract });
});

module.exports = router;
