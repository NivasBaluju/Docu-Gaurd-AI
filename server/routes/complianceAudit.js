const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const complianceService = require('../services/complianceAuditService');
const exportService = require('../services/evidenceExportService');
const integrityService = require('../services/evidenceIntegrityService');

// ============================================================================
// 1. STATLESS IN-MEMORY EVIDENCE VERIFICATION
// ============================================================================

/**
 * POST /api/compliance/verify
 * Stateless in-memory tamper and integrity verification.
 * Accepts: { evidence: object, expectedHash: string }
 * Returns: { valid: boolean, expectedHash: string, computedHash: string, algorithm: 'SHA-256' }
 */
router.post('/verify', requireAuth, (req, res) => {
  try {
    const { evidence, expectedHash } = req.body || {};
    if (!evidence || !expectedHash) {
      return res.status(400).json({
        error: 'Both evidence object and expectedHash string are required for verification',
        valid: false
      });
    }

    const result = integrityService.verifyEvidenceHash(evidence, expectedHash);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, valid: false });
  }
});

// ============================================================================
// 2. CONTRACT COMPLIANCE EVIDENCE & EXPORTS
// ============================================================================

/**
 * GET /api/compliance/documents/:documentId/evidence
 * Fetch canonical evidence and manifest for a specific document.
 */
router.get('/documents/:documentId/evidence', requireAuth, async (req, res) => {
  try {
    const data = await complianceService.getContractEvidence(req.params.documentId, req.user);
    return res.status(200).json(data);
  } catch (err) {
    console.error('[Compliance Route Error]:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/documents/:documentId/export/json
 * Download full machine-readable canonical evidence package as JSON.
 */
router.get('/documents/:documentId/export/json', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getContractEvidence(req.params.documentId, req.user);
    const jsonOutput = exportService.generateJsonExport(evidencePackage);

    const safeName = (evidencePackage.subject?.filename || req.params.documentId).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="contract_evidence_${safeName}.json"`);
    return res.send(jsonOutput);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/documents/:documentId/export/pdf
 * Download formatted executive compliance audit summary as PDF.
 */
router.get('/documents/:documentId/export/pdf', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getContractEvidence(req.params.documentId, req.user);
    const pdfBuffer = await exportService.generatePdfExport('CONTRACT_GOVERNANCE_AUDIT', evidencePackage);
    const safeName = (evidencePackage.subject?.filename || req.params.documentId).replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="contract_audit_${safeName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[Contract PDF Export Error]:', err);
    const status = err.status || 500;
    if (!res.headersSent) {
      return res.status(status).json({ error: err.message });
    }
  }
});

/**
 * GET /api/compliance/documents/:documentId/export/actions.csv
 * Download flattened action items CSV for spreadsheet analysis.
 */
router.get('/documents/:documentId/export/actions.csv', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getContractEvidence(req.params.documentId, req.user);
    const csvOutput = exportService.generateCsvExport('actions', evidencePackage);

    const safeName = (evidencePackage.subject?.filename || req.params.documentId).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contract_actions_${safeName}.csv"`);
    return res.send(csvOutput);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/documents/:documentId/export/decisions.csv
 * Download decision ledger CSV.
 */
router.get('/documents/:documentId/export/decisions.csv', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getContractEvidence(req.params.documentId, req.user);
    const csvOutput = exportService.generateCsvExport('decisions', evidencePackage);

    const safeName = (evidencePackage.subject?.filename || req.params.documentId).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contract_decisions_${safeName}.csv"`);
    return res.send(csvOutput);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/documents/:documentId/export/activity.csv
 * Download action activity audit log CSV.
 */
router.get('/documents/:documentId/export/activity.csv', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getContractEvidence(req.params.documentId, req.user);
    const csvOutput = exportService.generateCsvExport('activity', evidencePackage);

    const safeName = (evidencePackage.subject?.filename || req.params.documentId).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contract_activity_${safeName}.csv"`);
    return res.send(csvOutput);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

// ============================================================================
// 3. PORTFOLIO COMPLIANCE EVIDENCE & EXPORTS
// ============================================================================

/**
 * GET /api/compliance/portfolio/evidence
 * Fetch complete portfolio governance evidence and manifest.
 */
router.get('/portfolio/evidence', requireAuth, async (req, res) => {
  try {
    const data = await complianceService.getPortfolioEvidence(req.user);
    return res.status(200).json(data);
  } catch (err) {
    console.error('[Portfolio Evidence Error]:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/portfolio/export/json
 * Download portfolio evidence package as JSON.
 */
router.get('/portfolio/export/json', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getPortfolioEvidence(req.user);
    const jsonOutput = exportService.generateJsonExport(evidencePackage);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio_compliance_evidence.json"');
    return res.send(jsonOutput);
  } catch (err) {
    console.error('[Portfolio JSON Export Error]:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/portfolio/export/pdf
 * Download executive portfolio governance audit summary as PDF.
 */
router.get('/portfolio/export/pdf', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getPortfolioEvidence(req.user);
    const pdfBuffer = await exportService.generatePdfExport('PORTFOLIO_GOVERNANCE_AUDIT', evidencePackage);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio_compliance_audit.pdf"');
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[Portfolio PDF Export Error]:', err);
    const status = err.status || 500;
    if (!res.headersSent) {
      return res.status(status).json({ error: err.message });
    }
  }
});

/**
 * GET /api/compliance/portfolio/export/actions.csv
 * Download portfolio-wide action queue CSV.
 */
router.get('/portfolio/export/actions.csv', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getPortfolioEvidence(req.user);
    const csvOutput = exportService.generateCsvExport('portfolio_actions', evidencePackage);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio_action_queue.csv"');
    return res.send(csvOutput);
  } catch (err) {
    console.error('[Portfolio Actions CSV Error]:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/portfolio/export/contracts.csv
 * Download portfolio contract rankings CSV.
 */
router.get('/portfolio/export/contracts.csv', requireAuth, async (req, res) => {
  try {
    const evidencePackage = await complianceService.getPortfolioEvidence(req.user);
    const csvOutput = exportService.generateCsvExport('portfolio_contracts', evidencePackage);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio_contracts_health.csv"');
    return res.send(csvOutput);
  } catch (err) {
    console.error('[Portfolio Contracts CSV Error]:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
});

module.exports = router;
