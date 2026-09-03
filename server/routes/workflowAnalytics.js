const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const workflowAnalyticsService = require('../services/workflowAnalyticsService');
const escalationService = require('../services/escalationService');

/**
 * GET /api/documents/:id/workflow-analytics
 * Strictly read-only aggregated operational intelligence for a document.
 */
router.get('/:id/workflow-analytics', requireAuth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const result = await workflowAnalyticsService.getDocumentWorkflowAnalytics(documentId, req.user);

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({ error: result.errorMessage });
    }

    return res.json(result);
  } catch (err) {
    console.error('getDocumentWorkflowAnalytics route error:', err);
    return res.status(500).json({ error: 'Failed to retrieve workflow analytics' });
  }
});

/**
 * GET /api/documents/:id/attention-queue
 * Strictly read-only executive attention queue for urgent items.
 */
router.get('/:id/attention-queue', requireAuth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const result = await escalationService.getExecutiveAttentionQueue(documentId, req.user);

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({ error: result.errorMessage });
    }

    return res.json(result);
  } catch (err) {
    console.error('getExecutiveAttentionQueue route error:', err);
    return res.status(500).json({ error: 'Failed to retrieve executive attention queue' });
  }
});

/**
 * POST /api/documents/:id/escalations/evaluate
 * Explicit evaluation endpoint for document workflow escalations.
 */
router.post('/:id/escalations/evaluate', requireAuth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const result = await escalationService.evaluateDocumentEscalations(documentId, req.user);

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({ error: result.errorMessage });
    }

    return res.json(result);
  } catch (err) {
    console.error('evaluateDocumentEscalations route error:', err);
    return res.status(500).json({ error: 'Failed to evaluate document escalations' });
  }
});

module.exports = router;
