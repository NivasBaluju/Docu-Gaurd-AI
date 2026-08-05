const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { decryptBuffer, randomToken } = require('../utils/crypto');
const { recordAudit, logThreat } = require('../utils/audit');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');

// --- Create a secure share link ---------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  const { documentId, password, expiresInHours, maxDownloads } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(documentId, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const id = uuidv4();
  const token = randomToken(16);
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const expiresAt = expiresInHours ? new Date(Date.now() + Number(expiresInHours) * 3600 * 1000).toISOString() : null;

  db.prepare(`
    INSERT INTO share_links (id, document_id, token, password_hash, expires_at, max_downloads)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, doc.id, token, passwordHash, expiresAt, maxDownloads || null);

  recordAudit(req.user.id, 'SHARE_LINK_CREATED', { documentId: doc.id, expiresAt, maxDownloads: maxDownloads || null });
  res.json({ id, token, url: `/api/share/${token}`, expiresAt, passwordProtected: !!password, maxDownloads: maxDownloads || null });
});

router.get('/', requireAuth, (req, res) => {
  const links = db.prepare(`
    SELECT sl.id, sl.token, sl.expires_at, sl.max_downloads, sl.download_count, sl.revoked, sl.created_at, d.original_name
    FROM share_links sl JOIN documents d ON d.id = sl.document_id
    WHERE d.user_id = ? ORDER BY sl.created_at DESC
  `).all(req.user.id);
  res.json({ links });
});

router.post('/:id/revoke', requireAuth, (req, res) => {
  const link = db.prepare(`
    SELECT sl.* FROM share_links sl JOIN documents d ON d.id = sl.document_id
    WHERE sl.id = ? AND d.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!link) return res.status(404).json({ error: 'Share link not found' });
  db.prepare('UPDATE share_links SET revoked = 1 WHERE id = ?').run(link.id);
  recordAudit(req.user.id, 'SHARE_LINK_REVOKED', { linkId: link.id });
  res.json({ ok: true });
});

// --- Public access to a shared document (no auth required) -----------------
router.post('/:token/access', async (req, res) => {
  const link = db.prepare('SELECT * FROM share_links WHERE token = ?').get(req.params.token);
  if (!link || link.revoked) return res.status(404).json({ error: 'Link not found or revoked' });
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Link has expired' });
  }
  if (link.max_downloads && link.download_count >= link.max_downloads) {
    return res.status(410).json({ error: 'Download limit reached' });
  }
  if (link.password_hash) {
    const ok = await bcrypt.compare(req.body.password || '', link.password_hash);
    if (!ok) {
      logThreat(null, req.ip, 'medium', 'share_link', `Failed password attempt on share link ${link.token}`);
      return res.status(401).json({ error: 'Incorrect password' });
    }
  }

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(link.document_id);
  const filePath = path.join(uploadsDir, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(410).json({ error: 'File no longer available' });

  const decrypted = decryptBuffer(fs.readFileSync(filePath));
  db.prepare('UPDATE share_links SET download_count = download_count + 1 WHERE id = ?').run(link.id);
  recordAudit(null, 'SHARED_DOCUMENT_ACCESSED', { linkId: link.id, documentId: doc.id });

  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
  res.send(decrypted);
});

module.exports = router;
