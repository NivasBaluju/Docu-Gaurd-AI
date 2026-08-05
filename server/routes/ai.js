const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const {
  extractClauses, simplifyText, ragAnswer, riskScore,
  negotiationSuggestions, complianceCheck, extractDeadlines,
  detectPII, redactPII, diffDocuments
} = require('../utils/aiEngine');

const router = express.Router();

function getOwnedDocument(id, userId) {
  return db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
}

router.get('/documents/:id/clauses', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ clauses: extractClauses(doc.extracted_text || '') });
});

router.get('/documents/:id/simplify', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ original: doc.extracted_text, simplified: simplifyText(doc.extracted_text || '') });
});

router.post('/documents/:id/chat', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'question is required' });

  const result = ragAnswer(question, doc.extracted_text || '');

  db.prepare(`INSERT INTO chat_messages (id, document_id, user_id, role, content) VALUES (?, ?, ?, 'user', ?)`)
    .run(uuidv4(), doc.id, req.user.id, question);
  db.prepare(`INSERT INTO chat_messages (id, document_id, user_id, role, content, confidence, source_ref) VALUES (?, ?, ?, 'assistant', ?, ?, ?)`)
    .run(uuidv4(), doc.id, req.user.id, result.answer, result.confidence, JSON.stringify(result.sources));

  res.json(result);
});

router.get('/documents/:id/chat', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const messages = db.prepare('SELECT * FROM chat_messages WHERE document_id = ? ORDER BY created_at ASC').all(doc.id);
  res.json({ messages });
});

router.get('/documents/:id/risk', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(riskScore(doc.extracted_text || ''));
});

router.get('/documents/:id/negotiation', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ suggestions: negotiationSuggestions(doc.extracted_text || '') });
});

router.get('/documents/:id/compliance', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ frameworks: complianceCheck(doc.extracted_text || '') });
});

router.get('/documents/:id/deadlines', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ deadlines: extractDeadlines(doc.extracted_text || '') });
});

router.get('/deadlines', requireAuth, (req, res) => {
  const docs = db.prepare('SELECT id, original_name, extracted_text FROM documents WHERE user_id = ?').all(req.user.id);
  const all = [];
  for (const doc of docs) {
    const deadlines = extractDeadlines(doc.extracted_text || '');
    deadlines.forEach(d => all.push({ ...d, documentId: doc.id, documentName: doc.original_name }));
  }
  res.json({ deadlines: all });
});

router.get('/documents/:id/pii', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ items: detectPII(doc.extracted_text || '') });
});

router.post('/documents/:id/redact', requireAuth, (req, res) => {
  const doc = getOwnedDocument(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const { customTerms = [] } = req.body;
  const result = redactPII(doc.extracted_text || '', customTerms);
  recordAudit(req.user.id, 'PII_REDACTED', { documentId: doc.id, itemsFound: result.itemsFound });
  res.json(result);
});

router.post('/compare', requireAuth, (req, res) => {
  const { documentIdA, documentIdB } = req.body;
  const docA = getOwnedDocument(documentIdA, req.user.id);
  const docB = getOwnedDocument(documentIdB, req.user.id);
  if (!docA || !docB) return res.status(404).json({ error: 'One or both documents not found' });
  const result = diffDocuments(docA.extracted_text || '', docB.extracted_text || '');
  recordAudit(req.user.id, 'DOCUMENT_COMPARED', { documentIdA, documentIdB, totalChanges: result.totalChanges });
  res.json({ ...result, docA: docA.original_name, docB: docB.original_name });
});

module.exports = router;
