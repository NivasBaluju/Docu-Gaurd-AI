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

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');

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
      return { text: result.text || '', confidence: 0.97 };
    }
    if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '', confidence: 0.98 };
    }
    if (mimeType.startsWith('text/') || ext === '.txt') {
      return { text: buffer.toString('utf8'), confidence: 1.0 };
    }
    if (mimeType.startsWith('image/')) {
      return { text: '[Image file uploaded — OCR engine not bundled in this build. Upload a .txt/.pdf/.docx for full text analysis, or paste the text manually.]', confidence: 0.4 };
    }
    return { text: buffer.toString('utf8'), confidence: 0.5 };
  } catch (e) {
    console.warn('Extract text warning:', e.message);
    return { text: '[Text extraction fallback]', confidence: 0.3 };
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

    const { text, confidence } = await extractText(req.file.buffer, req.file.mimetype || '', req.file.originalname || '');
    const risk = text ? riskScore(text).overall : 5;

    await db.query(`
      INSERT INTO documents (id, user_id, filename, original_name, mime_type, size, sha256, encrypted, extracted_text, ocr_confidence, version_group, version_number, risk_score, analysis_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, 'NOT_STARTED')
    `, [id, req.user.id, storedName, req.file.originalname, req.file.mimetype, req.file.size, hash, text, confidence, id, 1, risk]);

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
    // Query directly from Flask PostgreSQL backend
    try {
      const flaskRes = await fetch('http://127.0.0.1:5001/api/documents');
      if (flaskRes.ok) {
        const flaskDocs = await flaskRes.json();
        return res.json(flaskDocs);
      }
    } catch (flaskErr) {
      // Fallback to direct DB query if Flask is restarting
    }

    const { rows: docs } = await db.query(`
      SELECT id, original_name AS filename, original_name, mime_type, size, sha256, ocr_confidence, risk_score, version_group, version_number, created_at
      FROM documents WHERE user_id = $1 ORDER BY created_at DESC
    `, [req.user.id]);
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
    const filePath = path.join(uploadsDir, doc.filename);
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

// --- AI Analysis Endpoints (Proxied to Flask AI Engine) -------------------
router.get('/:id/analysis', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/analysis`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Analysis fetch error:', err);
    res.status(500).json({ error: 'AI Analysis service unavailable' });
  }
});

router.get('/:id/clauses', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/clauses`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Clauses fetch error:', err);
    res.status(500).json({ error: 'Clauses service unavailable' });
  }
});

router.get('/:id/deadlines', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/deadlines`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Deadlines fetch error:', err);
    res.status(500).json({ error: 'Deadlines service unavailable' });
  }
});

router.get('/:id/risks', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/risks`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Risks fetch error:', err);
    res.status(500).json({ error: 'Risk service unavailable' });
  }
});

router.post('/:id/analyze', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:5001/api/documents/${req.params.id}/analyze`, {
      method: 'POST'
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Analyze trigger error:', err);
    res.status(500).json({ error: 'AI Analyze service unavailable' });
  }
});

// --- Phase 6.1: Document AI Chat with RAG --------------------------------
router.post('/:id/chat', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Question is required and cannot be empty' });
    }

    // Layer 1: Gateway Authorization & Ownership verification
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    // Forward request to Flask RAG Engine
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: String(question).trim() })
    });

    const ragData = await flaskRes.json();
    if (!flaskRes.ok) {
      return res.status(flaskRes.status).json(ragData);
    }

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
    res.status(500).json({ error: 'AI Chat service unavailable' });
  }
});

router.get('/:id/chat', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
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
router.post('/:id/negotiate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { clauseId, clauseType, mode = 'balanced' } = req.body;

    const validModes = ['balanced', 'protective', 'aggressive', 'collaborative'];
    if (mode && !validModes.includes(mode)) {
      return res.status(400).json({
        error: `Invalid negotiation mode '${mode}'. Must be one of: ${validModes.join(', ')}`
      });
    }

    // Layer 1: Gateway Authorization & Ownership verification
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    // Forward to Flask Negotiation AI Engine
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/negotiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clauseId, clauseType, mode })
    });

    const negData = await flaskRes.json();
    res.status(flaskRes.status).json(negData);
  } catch (err) {
    console.error('Document negotiation proxy error:', err);
    res.status(500).json({ error: 'AI Negotiation service unavailable' });
  }
});

router.get('/:id/negotiation-suggestions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/negotiation-suggestions`);
    const oppData = await flaskRes.json();
    res.status(flaskRes.status).json(oppData);
  } catch (err) {
    console.error('Document negotiation suggestions proxy error:', err);
    res.status(500).json({ error: 'AI Negotiation suggestions service unavailable' });
  }
});

// --- Phase 6.3: AI Contract Risk Simulation & What-If Analysis -----------
router.post('/:id/simulate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { scenario } = req.body;

    if (!scenario || typeof scenario !== 'string' || !scenario.trim()) {
      return res.status(400).json({ error: 'Scenario text is required for risk simulation' });
    }

    // Layer 1: Gateway Authorization & Ownership verification
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    // Forward to Flask Simulation Engine
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenario.trim() })
    });

    const simData = await flaskRes.json();

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

    res.status(flaskRes.status).json(simData);
  } catch (err) {
    console.error('Document simulation proxy error:', err);
    res.status(500).json({ error: 'AI Simulation service unavailable' });
  }
});

router.get('/:id/simulations', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Layer 1: Gateway Authorization & Ownership verification
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
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
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    // Call Flask Intelligence Engine (pure computation boundary)
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/intelligence`);
    const intelData = await flaskRes.json();

    if (!flaskRes.ok) {
      return res.status(flaskRes.status).json(intelData);
    }

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
    const { rows: docRows } = await db.query(
      'SELECT id, user_id FROM documents WHERE id = $1',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to document' });
    }

    // Call Flask Intelligence Engine refresh endpoint
    const flaskRes = await fetch(`http://127.0.0.1:5001/api/documents/${id}/intelligence/refresh`, {
      method: 'POST'
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

// --- Phase 7.7: Workflow Analytics, Attention Queue, and Escalation Evaluation ---
const workflowAnalyticsRouter = require('./workflowAnalytics');
router.use('/', workflowAnalyticsRouter);

module.exports = router;
