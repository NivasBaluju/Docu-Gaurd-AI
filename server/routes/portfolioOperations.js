'use strict';

/**
 * Phase 8.0 — Portfolio Operations Routes
 *
 * POST /api/portfolio/operations/preview
 *   Pre-flight validation; returns previewId + eligible/blocked breakdown.
 *
 * POST /api/portfolio/operations/:previewId/execute
 *   Atomic execution; receives ONLY previewId + Idempotency-Key header.
 *   All operation details are loaded from the stored preview record.
 *
 * GET  /api/portfolio/operations/history
 *   Paginated batch history for the authenticated user.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  previewBulkOperation,
  executeBulkOperation,
  getBatchHistory,
} = require('../services/bulkOperationsService');

/**
 * POST /api/portfolio/operations/preview
 *
 * Body: { operation, mode, actionIds, payload }
 */
router.post('/preview', requireAuth, async (req, res, next) => {
  try {
    const { operation, mode, actionIds, payload } = req.body;
    const result = await previewBulkOperation(req.user, { operation, mode, actionIds, payload });

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({
        error: result.errorMessage,
        ...(result.blockReason ? { blockReason: result.blockReason } : {}),
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/portfolio/operations/:previewId/execute
 *
 * Headers: Idempotency-Key: <UUID>
 * Body:    (none — all operation details loaded from stored preview)
 */
router.post('/:previewId/execute', requireAuth, async (req, res, next) => {
  try {
    const { previewId } = req.params;
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

    const result = await executeBulkOperation(req.user, previewId, idempotencyKey);

    if (result.errorStatus) {
      return res.status(result.errorStatus).json({
        error: result.errorMessage,
        ...(result.code ? { code: result.code } : {}),
        ...(result.rolledBack !== undefined ? { rolledBack: result.rolledBack } : {}),
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/operations/history
 *
 * Query: ?page=1&limit=20
 */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await getBatchHistory(req.user, { page, limit });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
