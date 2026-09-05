const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  submitAsyncJob,
  getJob,
  cancelJob,
  retryJob,
  listJobs
} = require('../services/jobExecutionService');
const { EnterpriseError, ERROR_CODES } = require('../utils/errorTaxonomy');

const router = express.Router();

/**
 * POST /api/jobs/submit
 * Submits an asynchronous enterprise workload. Returns HTTP 202 with job tracking metadata.
 */
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { jobType, payload = {}, idempotencyKey = null, maxAttempts = 3 } = req.body;
    if (!jobType) {
      return res.status(400).json({ error: 'jobType is required', code: 'INVALID_JOB_TYPE' });
    }

    const tenantId = req.user.tenant_id || req.user.id;
    const correlationId = req.headers['x-correlation-id'] || `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const response = await submitAsyncJob({
      jobType,
      tenantId,
      idempotencyKey,
      correlationId,
      payload,
      maxAttempts
    });

    return res.status(response.status_code || 202).json(response);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'JOB_SUBMIT_FAILED' });
  }
});

/**
 * GET /api/jobs/:id
 * Retrieves job status, progress percentage, error information, and execution results.
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.role === 'admin' ? null : (req.user.tenant_id || req.user.id);
    const job = await getJob(req.params.id, { tenantId });
    return res.status(200).json(job);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'JOB_FETCH_FAILED' });
  }
});

/**
 * POST /api/jobs/:id/cancel
 * Cancels a queued or running job.
 */
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.role === 'admin' ? null : (req.user.tenant_id || req.user.id);
    const reason = req.body.reason || 'User requested cancellation';
    const result = await cancelJob(req.params.id, {
      tenantId,
      reason,
      cancelledBy: req.user.id
    });
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'JOB_CANCEL_FAILED' });
  }
});

/**
 * POST /api/jobs/:id/retry
 * Retries a failed job.
 */
router.post('/:id/retry', requireAuth, async (req, res) => {
  try {
    const result = await retryJob(req.params.id, { adminUserId: req.user.id });
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'JOB_RETRY_FAILED' });
  }
});

/**
 * GET /api/jobs
 * Lists background jobs for the authenticated user/tenant.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.role === 'admin' ? (req.query.tenantId || null) : (req.user.tenant_id || req.user.id);
    const status = req.query.status || null;
    const limit = parseInt(req.query.limit || '50', 10);
    const jobs = await listJobs({ tenantId, status, limit });
    return res.status(200).json({ jobs, count: jobs.length });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'JOB_LIST_FAILED' });
  }
});

module.exports = router;
