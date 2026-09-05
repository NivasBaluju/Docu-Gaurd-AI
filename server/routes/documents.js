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
const { getDocumentActions, syncDocumentActions } = require('./contractActions');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  getDocumentDecisionIntelligence,
  applyDecisionAction
} = require('../services/contractDecisionService');
const {
  evaluateContractMonitoring,
  getDocumentChanges,
  acknowledgeMonitoringEvent
} = require('../services/contractMonitoringService');
const {
  createDecisionWorkflow,
  listDocumentDecisions
} = require('../services/contractDecisionWorkflowService');
const { evaluateApprovalPolicy } = require('../services/approvalPolicyService');
const policyComplianceService = require('../services/policyComplianceService');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');

const { recordAiTelemetry } = require('../utils/aiTelemetry');
const logger = require('../utils/logger');

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'docuguard-internal-service-secret-key-default';

function getInternalHeaders(reqOrExtra = {}, extraHeaders = {}) {
  let req = null;
  let extras = {};
  if (reqOrExtra && (reqOrExtra.headers || reqOrExtra.correlationId)) {
    req = reqOrExtra;
    extras = extraHeaders;
  } else {
    extras = reqOrExtra;
  }
  const headers = {
    'x-internal-service-key': INTERNAL_SERVICE_KEY,
    ...extras
  };
  if (req && req.correlationId) {
    headers['x-correlation-id'] = req.correlationId;
  }
  return headers;
}

async function authorizeDocument(id, user) {
  const { rows } = await db.query(
    'SELECT id, user_id, original_name, filename, created_at FROM documents WHERE id = $1',
    [id]
  );
  if (rows.length === 0) {
    return { errorStatus: 404, errorMessage: 'Document not found' };
  }
  if (rows[0].user_id !== user.id && user.role !== 'admin') {
    return { errorStatus: 403, errorMessage: 'Unauthorized access to document' };
  }
  return { document: rows[0] };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

async function extractText(buffer, mimeType, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  try {
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const parsePromise = pdfParse(buffer);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PDF parsing timeout')), 10000)
      );
      const result = await Promise.race([parsePromise, timeoutPromise]);
      const extracted = (result.text || '').trim();
      if (!extracted) {
        return { text: '', confidence: 0.0, status: 'INSUFFICIENT_EVIDENCE', error: 'PDF contains no extractable digital text stream' };
      }
      return { text: extracted, confidence: 0.97, status: 'SUCCESS' };
    }
    if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const extracted = (result.value || '').trim();
      if (!extracted) {
        return { text: '', confidence: 0.0, status: 'INSUFFICIENT_EVIDENCE', error: 'DOCX contains no extractable text' };
      }
      return { text: extracted, confidence: 0.98, status: 'SUCCESS' };
    }
    if (mimeType.startsWith('text/') || ext === '.txt') {
      const extracted = buffer.toString('utf8').trim();
      if (!extracted) {
        return { text: '', confidence: 0.0, status: 'INSUFFICIENT_EVIDENCE', error: 'Text file is empty' };
      }
      return { text: extracted, confidence: 1.0, status: 'SUCCESS' };
    }
    if (mimeType.startsWith('image/')) {
      return { text: '', confidence: 0.0, status: 'OCR_REQUIRED', error: 'Image OCR required' };
    }
    const extracted = buffer.toString('utf8').trim();
    return { text: extracted, confidence: extracted ? 0.5 : 0.0, status: extracted ? 'SUCCESS' : 'INSUFFICIENT_EVIDENCE' };
  } catch (e) {
    console.warn('Extract text failure:', e.message);
    return { text: '', confidence: 0.0, status: 'EXTRACTION_FAILED', error: e.message };
  }
}

// --- Upload (Proxied to Flask Ingestion Engine) --------------------------
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const form = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' });
      form.append('file', blob, req.file.originalname);
      if (req.user && req.user.id) {
        form.append('user_id', req.user.id);
      }

      const flaskRes = await fetch('http://127.0.0.1:5001/api/documents/upload', {
        method: 'POST',
        headers: getInternalHeaders(req),
        body: form,
        signal: AbortSignal.timeout(6000)
      });

      if (flaskRes.ok) {
        const flaskData = await flaskRes.json();
        await recordAudit(req.user.id, 'DOCUMENT_UPLOADED', { 
          documentId: flaskData.document_id, 
          name: req.file.originalname, 
          sha256: flaskData.sha256 
        });
        return res.status(201).json({
          id: flaskData.document_id,
          document_id: flaskData.document_id,
          name: req.file.originalname,
          filename: req.file.originalname,
          size: req.file.size,
          sha256: flaskData.sha256,
          ocrConfidence: flaskData.ocr_confidence,
          riskScore: flaskData.risk_score,
          analysisStatus: flaskData.analysis_status || 'NOT_STARTED',
          encrypted: true
        });
      }
    } catch (proxyErr) {
      console.warn('Flask upload proxy failed, using direct node fallback:', proxyErr.message);
    }

    // Direct local fallback
    const hash = sha256(req.file.buffer);
    const encrypted = encryptBuffer(req.file.buffer);
    const id = uuidv4();
    const storedName = `${id}.enc`;

    try {
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, storedName), encrypted);
    } catch (wErr) {
      console.warn('Disk write warning:', wErr.message);
    }

    const extractRes = await extractText(req.file.buffer, req.file.mimetype || '', req.file.originalname || '');
    const text = extractRes.text || '';
    const confidence = extractRes.confidence || 0.0;
    const analysisStatus = extractRes.status === 'SUCCESS' ? 'NOT_STARTED' : (extractRes.status || 'INSUFFICIENT_EVIDENCE');
    const risk = (extractRes.status === 'SUCCESS' && text) ? riskScore(text).overall : 0;

    await db.query(`
      INSERT INTO documents (id, user_id, filename, original_name, mime_type, size, sha256, encrypted, extracted_text, ocr_confidence, version_group, version_number, risk_score, analysis_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13)
    `, [id, req.user.id, storedName, req.file.originalname, req.file.mimetype, req.file.size, hash, text, confidence, id, 1, risk, analysisStatus]);

    await recordAudit(req.user.id, 'DOCUMENT_UPLOADED', { documentId: id, name: req.file.originalname, sha256: hash });

    res.status(201).json({
      id, document_id: id, name: req.file.originalname, filename: req.file.originalname, size: req.file.size, sha256: hash,
      ocrConfidence: confidence, riskScore: risk, analysisStatus: 'NOT_STARTED', encrypted: true
    });
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: 'Document upload could not be completed' });
  }
});

// --- List / get / delete -------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? `SELECT id, original_name AS filename, original_name, mime_type, size, sha256, ocr_confidence, risk_score, version_group, version_number, created_at
         FROM documents ORDER BY created_at DESC`
      : `SELECT id, original_name AS filename, original_name, mime_type, size, sha256, ocr_confidence, risk_score, version_group, version_number, created_at
         FROM documents WHERE user_id = $1 ORDER BY created_at DESC`;
    const params = isAdmin ? [] : [req.user.id];

    const { rows: docs } = await db.query(query, params);
    res.json(docs);
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
    const filePath = path.resolve(uploadsDir, doc.filename);
    if (!filePath.startsWith(path.resolve(uploadsDir) + path.sep)) {
      return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.warn('Could not delete file from disk:', fileErr.message);
      }
    }
    await db.query('DELETE FROM chat_messages WHERE document_id = $1', [doc.id]);
    await db.query('DELETE FROM share_links WHERE document_id = $1', [doc.id]);
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
    const filePath = path.resolve(uploadsDir, doc.filename);
    if (!filePath.startsWith(path.resolve(uploadsDir) + path.sep)) {
      return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }
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

// --- AI Analysis Endpoints (Proxied to Flask AI Engine) -------------------
router.get('/:id/analysis', requireAuth, async (req, res) => {
  try {
    const authCheck = await authorizeDocument(req.params.id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/analysis`, {
      headers: getInternalHeaders(req)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Analysis fetch error:', err);
    res.status(500).json({ error: 'AI Analysis service unavailable' });
  }
});

router.get('/:id/clauses', requireAuth, async (req, res) => {
  try {
    const authCheck = await authorizeDocument(req.params.id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/clauses`, {
      headers: getInternalHeaders(req)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Clauses fetch error:', err);
    res.status(500).json({ error: 'Clauses service unavailable' });
  }
});

router.get('/:id/deadlines', requireAuth, async (req, res) => {
  try {
    const authCheck = await authorizeDocument(req.params.id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/deadlines`, {
      headers: getInternalHeaders(req)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Deadlines fetch error:', err);
    res.status(500).json({ error: 'Deadlines service unavailable' });
  }
});

router.get('/:id/risks', requireAuth, async (req, res) => {
  try {
    const authCheck = await authorizeDocument(req.params.id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/risks`, {
      headers: getInternalHeaders(req)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Risks fetch error:', err);
    res.status(500).json({ error: 'Risk service unavailable' });
  }
});

router.post('/:id/analyze', requireAuth, aiLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const authCheck = await authorizeDocument(req.params.id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/analyze`, {
      method: 'POST',
      headers: getInternalHeaders(req)
    });
    const data = await response.json();
    const durationMs = Date.now() - startTime;

    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user.id,
      documentId: req.params.id,
      operationType: 'ANALYSIS',
      provider: 'flask-nlp',
      model: 'docuguard-analyzer',
      durationMs,
      status: response.ok ? 'SUCCESS' : 'FAILED',
      groundedStatus: 'GROUNDED'
    });

    res.status(response.status).json(data);
  } catch (err) {
    console.error('Analyze trigger error:', err);
    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user?.id,
      documentId: req.params.id,
      operationType: 'ANALYSIS',
      durationMs: Date.now() - startTime,
      status: 'FAILED',
      errorCategory: err.message
    });
    res.status(500).json({ error: 'AI Analyze service unavailable' });
  }
});

// --- Phase 6.1: Document AI Chat with RAG --------------------------------
router.post('/:id/chat', requireAuth, aiLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification FIRST
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const question = req.body.question || req.body.message;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Question is required and cannot be empty' });
    }

    // Forward request to Flask RAG Engine
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/chat`, {
      method: 'POST',
      headers: getInternalHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question: String(question).trim() })
    });

    const ragData = await flaskRes.json();
    const durationMs = Date.now() - startTime;

    if (!flaskRes.ok) {
      recordAiTelemetry({
        correlationId: req.correlationId,
        userId: req.user.id,
        documentId: id,
        operationType: 'CHAT_RAG',
        durationMs,
        status: 'FAILED',
        errorCategory: `HTTP_${flaskRes.status}`
      });
      return res.status(flaskRes.status).json(ragData);
    }

    const isGrounded = ragData.grounded !== false && ragData.groundingStatus !== 'INSUFFICIENT_EVIDENCE';
    const groundedStatus = isGrounded ? (ragData.confidence < 0.6 ? 'PARTIAL' : 'GROUNDED') : 'INSUFFICIENT_EVIDENCE';

    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user.id,
      documentId: id,
      operationType: 'CHAT_RAG',
      provider: ragData.provider || 'local',
      model: ragData.model || 'docuguard-rag',
      durationMs,
      status: 'SUCCESS',
      groundedStatus,
      tokensUsed: ragData.tokensUsed || 0,
      fallbackUsed: Boolean(ragData.fallbackUsed)
    });

    // Persist conversation messages
    const userMsgId = uuidv4();
    const assistantMsgId = uuidv4();

    await db.query(
      `INSERT INTO chat_messages (id, document_id, user_id, role, content, created_at)
       VALUES ($1, $2, $3, 'USER', $4, CURRENT_TIMESTAMP)`,
      [userMsgId, id, req.user.id, String(question).trim()]
    );

    await db.query(
      `INSERT INTO chat_messages (id, document_id, user_id, role, content, confidence, grounded, sources, created_at)
       VALUES ($1, $2, $3, 'ASSISTANT', $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [
        assistantMsgId,
        id,
        req.user.id,
        ragData.answer || '',
        ragData.confidence || 0.0,
        ragData.grounded !== undefined ? ragData.grounded : true,
        JSON.stringify(ragData.sources || [])
      ]
    );

    res.json(ragData);
  } catch (err) {
    console.error('Document chat proxy error:', err);
    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user?.id,
      documentId: req.params.id,
      operationType: 'CHAT_RAG',
      durationMs: Date.now() - startTime,
      status: 'FAILED',
      errorCategory: err.message
    });
    res.status(500).json({ error: 'AI Chat service unavailable' });
  }
});

router.get('/:id/chat', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const { rows: messages } = await db.query(
      `SELECT id, role, content, confidence, grounded, sources, created_at AS "createdAt"
       FROM chat_messages
       WHERE document_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    const formattedMessages = messages.map(m => ({
      ...m,
      sources: typeof m.sources === 'string' ? JSON.parse(m.sources) : (m.sources || [])
    }));

    res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('Document chat history fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// --- Phase 6.2: AI Contract Negotiation & Intelligent Redlining -----------
router.post('/:id/negotiate', requireAuth, aiLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification FIRST
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const { clauseId, clauseType, mode = 'balanced' } = req.body;

    const validModes = ['balanced', 'protective', 'aggressive', 'collaborative'];
    if (mode && !validModes.includes(mode)) {
      return res.status(400).json({
        error: `Invalid negotiation mode '${mode}'. Must be one of: ${validModes.join(', ')}`
      });
    }

    // Forward to Flask Negotiation AI Engine
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/negotiate`, {
      method: 'POST',
      headers: getInternalHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ clauseId, clauseType, mode })
    });

    const negData = await flaskRes.json();
    const durationMs = Date.now() - startTime;

    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user.id,
      documentId: id,
      operationType: 'NEGOTIATION',
      provider: 'flask-nlp',
      model: 'docuguard-redliner',
      durationMs,
      status: flaskRes.ok ? 'SUCCESS' : 'FAILED',
      groundedStatus: 'GROUNDED',
      metadata: { mode }
    });

    res.status(flaskRes.status).json(negData);
  } catch (err) {
    console.error('Document negotiation proxy error:', err);
    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user?.id,
      documentId: req.params.id,
      operationType: 'NEGOTIATION',
      durationMs: Date.now() - startTime,
      status: 'FAILED',
      errorCategory: err.message
    });
    res.status(500).json({ error: 'AI Negotiation service unavailable' });
  }
});

router.get('/:id/negotiation-suggestions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/negotiation-suggestions`, {
      headers: getInternalHeaders(req)
    });
    const oppData = await flaskRes.json();
    res.status(flaskRes.status).json(oppData);
  } catch (err) {
    console.error('Document negotiation suggestions proxy error:', err);
    res.status(500).json({ error: 'AI Negotiation suggestions service unavailable' });
  }
});

// --- Enterprise Word (DOCX) Redline Export with Tracked Changes -----------
router.post('/:id/export-redline-docx', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const { mode = 'balanced', clauses = null } = req.body;
    const { generateDocumentRedlineDocx } = require('../services/docxExportService');

    const result = await generateDocumentRedlineDocx({
      documentId: id,
      userId: req.user.id,
      negotiationMode: mode,
      requestedClauses: clauses
    });

    if (req.query.download === 'true') {
      return res.download(result.storage_path, result.filename);
    }

    return res.status(200).json({
      success: true,
      document_id: result.document_id,
      filename: result.filename,
      download_url: `/api/documents/${id}/download-redline-docx?file=${encodeURIComponent(result.filename)}`,
      clauses_count: result.clauses_count,
      generated_at: result.generated_at
    });
  } catch (err) {
    console.error('DOCX redline export error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'DOCX_EXPORT_FAILED' });
  }
});

router.get('/:id/download-redline-docx', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const requestedFile = req.query.file;
    if (!requestedFile || !/^redline_[a-zA-Z0-9_-]+\.docx$/.test(requestedFile)) {
      return res.status(400).json({ error: 'Invalid or missing filename' });
    }

    const filePath = path.resolve(__dirname, '../../storage/docx_exports', requestedFile);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Export file not found or expired' });
    }

    return res.download(filePath, requestedFile);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Phase F: Cryptographic Audit Export Package -----------
router.post('/:id/export-audit-package', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const { generateCryptographicAuditExport } = require('../services/auditExportService');
    const result = await generateCryptographicAuditExport({
      documentId: id,
      userId: req.user.id,
      tenantId: req.user.tenant_id
    });

    return res.status(200).json({
      success: true,
      export_id: result.export_id,
      filename: result.filename,
      bundle_sha256: result.bundle_sha256,
      sections_count: result.sections_count,
      manifest: result.manifest,
      download_url: `/api/documents/${id}/download-audit-package?file=${encodeURIComponent(result.filename)}`,
      generated_at: result.generated_at
    });
  } catch (err) {
    console.error('Audit package export error:', err);
    return res.status(500).json({ error: err.message, code: 'AUDIT_EXPORT_FAILED' });
  }
});

router.get('/:id/download-audit-package', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const requestedFile = req.query.file;
    if (!requestedFile || !/^audit_package_[a-zA-Z0-9_-]+\.json$/.test(requestedFile)) {
      return res.status(400).json({ error: 'Invalid or missing filename' });
    }

    const filePath = path.resolve(__dirname, '../../storage/audit_exports', requestedFile);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audit export package not found or expired' });
    }

    return res.download(filePath, requestedFile);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Phase 6.3: AI Contract Risk Simulation & What-If Analysis -----------
router.post('/:id/simulate', requireAuth, aiLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification FIRST
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const { scenario } = req.body;
    if (!scenario || typeof scenario !== 'string' || !scenario.trim()) {
      return res.status(400).json({ error: 'Scenario text is required for risk simulation' });
    }

    // Forward to Flask Simulation Engine
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/simulate`, {
      method: 'POST',
      headers: getInternalHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ scenario: scenario.trim() })
    });

    const simData = await flaskRes.json();
    const durationMs = Date.now() - startTime;

    // If simulation processed successfully, persist to contract_simulations in PostgreSQL
    if (flaskRes.status === 200) {
      try {
        const simId = uuidv4();
        await db.query(
          `INSERT INTO contract_simulations (
            id, document_id, user_id, scenario, grounded, document_evidence, simulation_analysis, risk_level
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [
            simId,
            id,
            req.user.id,
            scenario.trim(),
            simData.grounded !== false,
            JSON.stringify(simData.documentEvidence || []),
            JSON.stringify(simData.simulationAnalysis || {}),
            simData.simulationAnalysis?.riskLevel || 'UNKNOWN'
          ]
        );
        simData.simulationId = simId;
      } catch (dbErr) {
        console.error('Failed to persist contract simulation:', dbErr);
      }
    }

    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user.id,
      documentId: id,
      operationType: 'SIMULATION',
      provider: 'flask-nlp',
      model: 'docuguard-simulator',
      durationMs,
      status: flaskRes.ok ? 'SUCCESS' : 'FAILED',
      groundedStatus: simData.grounded !== false ? 'GROUNDED' : 'PARTIAL',
      metadata: { riskLevel: simData.simulationAnalysis?.riskLevel }
    });

    res.status(flaskRes.status).json(simData);
  } catch (err) {
    console.error('Document simulation proxy error:', err);
    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user?.id,
      documentId: req.params.id,
      operationType: 'SIMULATION',
      durationMs: Date.now() - startTime,
      status: 'FAILED',
      errorCategory: err.message
    });
    res.status(500).json({ error: 'AI Simulation service unavailable' });
  }
});

router.get('/:id/simulations', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const { rows: simulations } = await db.query(
      `SELECT id, scenario, grounded, document_evidence AS "documentEvidence",
              simulation_analysis AS "simulationAnalysis", risk_level AS "riskLevel",
              created_at AS "createdAt"
       FROM contract_simulations
       WHERE document_id = $1
       ORDER BY created_at DESC;`,
      [id]
    );

    const formattedSimulations = simulations.map(s => ({
      ...s,
      documentEvidence: typeof s.documentEvidence === 'string' ? JSON.parse(s.documentEvidence) : (s.documentEvidence || []),
      simulationAnalysis: typeof s.simulationAnalysis === 'string' ? JSON.parse(s.simulationAnalysis) : (s.simulationAnalysis || {})
    }));

    res.json({ simulations: formattedSimulations, count: formattedSimulations.length });
  } catch (err) {
    console.error('Document simulations history fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve simulation history' });
  }
});

// --- Phase 6.4: Executive Contract Risk Prioritization & Action Center ----
router.get('/:id/intelligence', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authentication & Authorization Check
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    // Call Flask Intelligence Engine (pure computation boundary)
    const intelStart = Date.now();
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/intelligence`, {
      headers: getInternalHeaders(req)
    });
    const intelData = await flaskRes.json();

    if (!flaskRes.ok) {
      return res.status(flaskRes.status).json(intelData);
    }

    recordAiTelemetry({
      correlationId: req.correlationId,
      userId: req.user.id,
      documentId: id,
      operationType: 'INTELLIGENCE',
      provider: 'flask-nlp',
      model: 'docuguard-intelligence',
      durationMs: Date.now() - intelStart,
      status: 'SUCCESS',
      groundedStatus: 'GROUNDED'
    });

    // Gateway Single Persistence Boundary: Persist intelligence snapshot to PostgreSQL
    try {
      const snapId = uuidv4();
      await db.query(
        `INSERT INTO contract_intelligence (
          id, document_id, user_id, health_score, critical_count, important_count,
          monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          snapId,
          id,
          req.user.id,
          intelData.healthScore || 0,
          intelData.metrics?.criticalCount || 0,
          intelData.metrics?.importantCount || 0,
          intelData.metrics?.monitoringCount || 0,
          intelData.metrics?.healthyCount || 0,
          intelData.executiveSummary || '',
          JSON.stringify(intelData.conflicts || []),
          JSON.stringify(intelData.actionPlan || []),
          JSON.stringify(intelData.metrics || {})
        ]
      );
      intelData.snapshotId = snapId;
    } catch (persistErr) {
      console.warn('Contract intelligence snapshot persistence warning:', persistErr.message);
    }

    res.json(intelData);
  } catch (err) {
    console.error('Document intelligence proxy error:', err);
    res.status(500).json({ error: 'Executive Intelligence service unavailable' });
  }
});

router.post('/:id/intelligence/refresh', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authentication & Authorization Check
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    // Call Flask Intelligence Engine refresh endpoint
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/intelligence/refresh`, {
      method: 'POST',
      headers: getInternalHeaders(req)
    });
    const intelData = await flaskRes.json();

    if (!flaskRes.ok) {
      return res.status(flaskRes.status).json(intelData);
    }

    // Gateway Single Persistence Boundary: Persist refreshed snapshot
    try {
      const snapId = uuidv4();
      await db.query(
        `INSERT INTO contract_intelligence (
          id, document_id, user_id, health_score, critical_count, important_count,
          monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          snapId,
          id,
          req.user.id,
          intelData.healthScore || 0,
          intelData.metrics?.criticalCount || 0,
          intelData.metrics?.importantCount || 0,
          intelData.metrics?.monitoringCount || 0,
          intelData.metrics?.healthyCount || 0,
          intelData.executiveSummary || '',
          JSON.stringify(intelData.conflicts || []),
          JSON.stringify(intelData.actionPlan || []),
          JSON.stringify(intelData.metrics || {})
        ]
      );
      intelData.snapshotId = snapId;
    } catch (persistErr) {
      console.warn('Contract intelligence snapshot persistence warning:', persistErr.message);
    }

    res.json(intelData);
  } catch (err) {
    console.error('Document intelligence refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh executive intelligence' });
  }
});

// --- Phase 7.2: Contract Actions Listing and Synchronization --------------
router.get('/:id/actions', requireAuth, getDocumentActions);
router.post('/:id/actions/sync', requireAuth, syncDocumentActions);

// --- Phase 10: Contract Decision Intelligence, What-If Scenarios & Decision Actions ---
router.get('/:id/decision-intelligence', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const data = await getDocumentDecisionIntelligence(id, req.user, req.correlationId);
    res.json(data);
  } catch (err) {
    console.error('Decision Intelligence error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Decision Intelligence service unavailable' });
  }
});

router.post('/:id/decisions/scenarios', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const data = await getDocumentDecisionIntelligence(id, req.user, req.correlationId);
    res.json({
      documentId: id,
      exposureScore: data.exposureScore,
      whatIfScenarios: data.whatIfScenarios || [],
      disclaimer: data.disclaimer
    });
  } catch (err) {
    console.error('Decision Scenarios error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Decision scenarios service unavailable' });
  }
});

router.post('/:id/decisions/act', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const result = await applyDecisionAction(id, req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error('Apply Decision Action error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to apply decision action' });
  }
});

// --- Phase 11: Enterprise Portfolio Intelligence & Continuous Monitoring Routes ---
router.get('/:id/monitoring', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const data = await evaluateContractMonitoring(id, req.correlationId);
    res.json(data);
  } catch (err) {
    console.error('Document monitoring error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Contract monitoring service unavailable' });
  }
});

router.get('/:id/lifecycle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const { rows } = await db.query(
      `SELECT * FROM contract_lifecycle_states WHERE document_id = $1`,
      [id]
    );
    if (!rows.length) {
      const evalData = await evaluateContractMonitoring(id, req.correlationId);
      return res.json({ success: true, lifecycle: evalData.lifecycle });
    }
    res.json({ success: true, lifecycle: rows[0] });
  } catch (err) {
    console.error('Document lifecycle error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Contract lifecycle service unavailable' });
  }
});

router.get('/:id/changes', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const data = await getDocumentChanges(id, req.user);
    res.json(data);
  } catch (err) {
    console.error('Document changes error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Contract changes service unavailable' });
  }
});

router.post('/:id/monitoring/:eventId/acknowledge', requireAuth, async (req, res) => {
  try {
    const { id, eventId } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const updated = await acknowledgeMonitoringEvent(id, eventId, req.user);
    res.json({ success: true, event: updated });
  } catch (err) {
    console.error('Acknowledge monitoring event error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to acknowledge monitoring event' });
  }
});

// --- Phase 12: Decision Workflows & Approval Governance ---
router.get('/:id/decisions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const decisions = await listDocumentDecisions(id, req.user, req.query);
    res.json({ success: true, decisions });
  } catch (err) {
    console.error('List document decisions error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to list document decisions' });
  }
});

router.post('/:id/decisions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const result = await createDecisionWorkflow(req.user.id, id, req.user.id, req.body);
    res.status(201).json({ success: true, decision: result });
  } catch (err) {
    console.error('Create decision workflow error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create decision workflow' });
  }
});

router.post('/:id/decisions/policy-evaluate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const evaluation = evaluateApprovalPolicy(req.body);
    res.json({ success: true, evaluation });
  } catch (err) {
    console.error('Evaluate approval policy error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to evaluate approval policy' });
  }
});

// --- Phase 13: Document Governance, Policy Evaluation & Findings ---
router.get('/:id/compliance-governance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const tenantId = req.user.tenant_id || req.user.id;
    const evaluation = await policyComplianceService.getDocumentCompliance(tenantId, id);
    res.json({ success: true, evaluation });
  } catch (err) {
    console.error('Get document compliance error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to get compliance evaluation' });
  }
});

router.post('/:id/compliance-governance/evaluate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const tenantId = req.user.tenant_id || req.user.id;
    const evaluation = await policyComplianceService.evaluateDocumentCompliance(tenantId, id, req.user.id, req.body || {});
    res.json({ success: true, evaluation });
  } catch (err) {
    console.error('Evaluate document compliance error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to evaluate document compliance' });
  }
});

router.get('/:id/compliance-governance/findings', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const tenantId = req.user.tenant_id || req.user.id;
    const findings = await policyComplianceService.getDocumentFindings(tenantId, id);
    res.json({ success: true, findings });
  } catch (err) {
    console.error('Get document findings error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to get compliance findings' });
  }
});

router.post('/:id/compliance-governance/findings/:findingId/exception', requireAuth, async (req, res) => {
  try {
    const { id, findingId } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const tenantId = req.user.tenant_id || req.user.id;
    const { reason } = req.body;
    const exception = await policyComplianceService.requestException(tenantId, id, findingId, req.user.id, reason);
    res.status(201).json({ success: true, exception });
  } catch (err) {
    console.error('Request exception error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Failed to request exception' });
  }
});

router.get('/:id/compliance-governance/exceptions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const authCheck = await authorizeDocument(id, req.user);
    if (authCheck.errorStatus) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.errorMessage });
    }

    const tenantId = req.user.tenant_id || req.user.id;
    const exceptions = await policyComplianceService.listExceptions(tenantId, { document_id: id });
    res.json({ success: true, exceptions });
  } catch (err) {
    console.error('Get document exceptions error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to get document exceptions' });
  }
});

// --- Phase 7.7: Workflow Analytics, Attention Queue, and Escalation Evaluation ---
const workflowAnalyticsRouter = require('./workflowAnalytics');
router.use('/', workflowAnalyticsRouter);

module.exports = router;
