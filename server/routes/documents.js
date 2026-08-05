const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { encryptBuffer, decryptBuffer, sha256 } = require('../utils/crypto');
const { recordAudit } = require('../utils/audit');
const { riskScore } = require('../utils/aiEngine');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

async function extractText(buffer, mimeType, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  try {
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return { text: result.text, confidence: 0.97 };
    }
    if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, confidence: 0.98 };
    }
    if (mimeType.startsWith('text/') || ext === '.txt') {
      return { text: buffer.toString('utf8'), confidence: 1.0 };
    }
    if (mimeType.startsWith('image/')) {
      return { text: '[Image file uploaded — OCR engine not bundled in this build. Upload a .txt/.pdf/.docx for full text analysis, or paste the text manually.]', confidence: 0.4 };
    }
    return { text: buffer.toString('utf8'), confidence: 0.5 };
  } catch (e) {
    return { text: '', confidence: 0 };
  }
}

// --- Upload -------------------------------------------------------------
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const hash = sha256(req.file.buffer);
  const encrypted = encryptBuffer(req.file.buffer);
  const id = uuidv4();
  const storedName = `${id}.enc`;
  fs.writeFileSync(path.join(uploadsDir, storedName), encrypted);

  const { text, confidence } = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
  const risk = text ? riskScore(text).overall : null;

  const versionGroup = req.body.versionGroup || id;
  const versionNumber = req.body.versionNumber ? Number(req.body.versionNumber) : 1;

  await db.query(`
    INSERT INTO documents (id, user_id, filename, original_name, mime_type, size, sha256, encrypted, extracted_text, ocr_confidence, version_group, version_number, risk_score)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12)
  `, [id, req.user.id, storedName, req.file.originalname, req.file.mimetype, req.file.size, hash, text, confidence, versionGroup, versionNumber, risk]);

  await recordAudit(req.user.id, 'DOCUMENT_UPLOADED', { documentId: id, name: req.file.originalname, sha256: hash });

  res.json({
    id, name: req.file.originalname, size: req.file.size, sha256: hash,
    ocrConfidence: confidence, riskScore: risk, encrypted: true
  });
});

// --- List / get / delete -------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows: docs } = await db.query(`
      SELECT id, original_name, mime_type, size, sha256, ocr_confidence, risk_score, version_group, version_number, created_at
      FROM documents WHERE user_id = $1 ORDER BY created_at DESC
    `, [req.user.id]);
    res.json({ documents: docs });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM documents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await recordAudit(req.user.id, 'DOCUMENT_VIEWED', { documentId: doc.id });
    res.json({ document: doc });
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM documents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filePath = path.join(uploadsDir, doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.query('DELETE FROM documents WHERE id = $1', [doc.id]);
    await recordAudit(req.user.id, 'DOCUMENT_DELETED', { documentId: doc.id });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Verify integrity (recompute SHA-256 of decrypted file vs stored hash) --
router.get('/:id/verify', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM documents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filePath = path.join(uploadsDir, doc.filename);
    if (!fs.existsSync(filePath)) return res.status(410).json({ error: 'File missing from storage' });
    const encrypted = fs.readFileSync(filePath);
    let decrypted, currentHash, valid;
    try {
      decrypted = decryptBuffer(encrypted);
      currentHash = sha256(decrypted);
      valid = currentHash === doc.sha256;
    } catch (e) {
      return res.json({ valid: false, error: 'Decryption/authentication failed — file may be corrupted or tampered with.' });
    }
    res.json({ valid, storedHash: doc.sha256, currentHash });
  } catch (err) {
    console.error('Verify document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
