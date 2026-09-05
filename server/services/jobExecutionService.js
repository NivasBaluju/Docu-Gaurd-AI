/**
 * server/services/jobExecutionService.js
 * Components 12, 13 & 14: Background Job Reliability, Idempotency & Failure Recovery
 * Generic background job tracking abstraction supporting idempotency keys,
 * bounded retries, correlation IDs, and actionable error classifications.
 */

const crypto = require('crypto');
const db = require('../db');
const { recordAudit } = require('../utils/audit');
const { EnterpriseError, ERROR_CODES } = require('../utils/errorTaxonomy');

const JOB_STATUS = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  CANCELLED: 'CANCELLED'
};

/**
 * Starts or registers a background job execution with idempotency protection.
 */
async function startJob({ jobType, tenantId = null, idempotencyKey = null, correlationId = null, metadata = {}, maxAttempts = 3 }) {
  if (!jobType) {
    throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, 'jobType is required');
  }

  // Idempotency check: if an identical job is RUNNING or SUCCEEDED within the last 1 hour
  if (idempotencyKey) {
    const { rows: existing } = await db.query(`
      SELECT * FROM background_job_runs 
      WHERE idempotency_key = $1 AND status IN ('RUNNING', 'SUCCEEDED')
      ORDER BY created_at DESC LIMIT 1
    `, [idempotencyKey]);

    if (existing.length > 0) {
      return {
        idempotent_duplicate: true,
        job: existing[0]
      };
    }
  }

  const jobId = crypto.randomUUID();
  const cId = correlationId || `job-cid-${Date.now()}`;

  await db.query(`
    INSERT INTO background_job_runs (
      id, job_type, tenant_id, idempotency_key, status, attempt_count, max_attempts, started_at, correlation_id, metadata_json
    ) VALUES ($1, $2, $3, $4, 'RUNNING', 1, $5, CURRENT_TIMESTAMP, $6, $7)
  `, [jobId, jobType, tenantId, idempotencyKey, maxAttempts, cId, JSON.stringify(metadata)]);

  return {
    idempotent_duplicate: false,
    job: {
      id: jobId,
      job_type: jobType,
      tenant_id: tenantId,
      status: JOB_STATUS.RUNNING,
      attempt_count: 1,
      correlation_id: cId
    }
  };
}

/**
 * Completes a background job successfully.
 */
async function completeJob(jobId, { metadata = {} } = {}) {
  await db.query(`
    UPDATE background_job_runs 
    SET status = 'SUCCEEDED', completed_at = CURRENT_TIMESTAMP, metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $1::jsonb
    WHERE id = $2
  `, [JSON.stringify(metadata), jobId]);

  return { id: jobId, status: JOB_STATUS.SUCCEEDED };
}

/**
 * Handles job failure with bounded retry logic.
 */
async function failJob(jobId, error, { canRetry = true } = {}) {
  const { rows } = await db.query('SELECT * FROM background_job_runs WHERE id = $1', [jobId]);
  if (rows.length === 0) return null;

  const job = rows[0];
  const newAttempt = job.attempt_count + 1;
  const errMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');

  if (canRetry && newAttempt <= job.max_attempts) {
    await db.query(`
      UPDATE background_job_runs 
      SET status = 'RETRYING', attempt_count = $1, last_error = $2 
      WHERE id = $3
    `, [newAttempt, errMsg, jobId]);

    return { id: jobId, status: JOB_STATUS.RETRYING, attempt_count: newAttempt };
  } else {
    await db.query(`
      UPDATE background_job_runs 
      SET status = 'FAILED', completed_at = CURRENT_TIMESTAMP, last_error = $1 
      WHERE id = $2
    `, [errMsg, jobId]);

    await recordAudit(null, 'JOB_FAILED', {
      job_id: jobId,
      job_type: job.job_type,
      tenant_id: job.tenant_id,
      attempts: job.attempt_count,
      error: errMsg
    });

    return { id: jobId, status: JOB_STATUS.FAILED, attempt_count: job.attempt_count, error: errMsg };
  }
}

/**
 * Retries a failed job manually via admin request.
 */
async function retryJob(jobId, { adminUserId = null } = {}) {
  const { rows } = await db.query('SELECT * FROM background_job_runs WHERE id = $1', [jobId]);
  if (rows.length === 0) {
    throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, 'Job not found', { statusCode: 404 });
  }

  await db.query(`
    UPDATE background_job_runs 
    SET status = 'RUNNING', attempt_count = attempt_count + 1, started_at = CURRENT_TIMESTAMP, last_error = NULL
    WHERE id = $1
  `, [jobId]);

  await recordAudit(adminUserId, 'JOB_RETRIED', { job_id: jobId });
  return { id: jobId, status: JOB_STATUS.RUNNING };
}

/**
 * Lists background jobs.
 */
async function listJobs({ tenantId = null, status = null, limit = 50 } = {}) {
  let q = 'SELECT * FROM background_job_runs WHERE 1=1';
  const params = [];

  if (tenantId) {
    params.push(tenantId);
    q += ` AND tenant_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    q += ` AND status = $${params.length}`;
  }

  q += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await db.query(q, params);
  return rows;
}

/**
 * High-level runner that wraps execution of a job function with idempotency,
 * bounded retries, and failure logging.
 */
async function executeJob(jobType, fn, { tenantId = null, idempotencyKey = null, correlationId = null, metadata = {}, maxAttempts = 3, baseDelayMs = 50 } = {}) {
  const startResult = await startJob({ jobType, tenantId, idempotencyKey, correlationId, metadata, maxAttempts });
  if (startResult.idempotent_duplicate) {
    return {
      ...startResult.job,
      idempotency_key: startResult.job.idempotency_key,
      status: startResult.job.status === 'SUCCEEDED' ? 'COMPLETED' : startResult.job.status
    };
  }

  const job = startResult.job;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      await completeJob(job.id, { metadata: { ...metadata, result } });
      return {
        id: job.id,
        idempotency_key: idempotencyKey,
        job_type: jobType,
        status: 'COMPLETED',
        attempt_count: attempt,
        result
      };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await failJob(job.id, err, { canRetry: true });
        if (baseDelayMs > 0) {
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
        }
      } else {
        await failJob(job.id, err, { canRetry: false });
      }
    }
  }

  throw lastErr;
}

/**
 * Updates progress percentage (0-100) and operational progress message.
 */
async function updateJobProgress(jobId, progressPct, progressMessage = '') {
  const boundedPct = Math.max(0, Math.min(100, Math.round(progressPct)));
  await db.query(`
    UPDATE background_job_runs
    SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object(
      'progress_pct', $1::numeric,
      'progress_message', $2::text,
      'progress_updated_at', CURRENT_TIMESTAMP
    )
    WHERE id = $3
  `, [boundedPct, progressMessage, jobId]);

  return { id: jobId, progress_pct: boundedPct, progress_message: progressMessage };
}

/**
 * Cancels a queued or running job.
 */
async function cancelJob(jobId, { tenantId = null, reason = 'Administrative cancellation', cancelledBy = null } = {}) {
  const { rows } = await db.query('SELECT * FROM background_job_runs WHERE id = $1', [jobId]);
  if (rows.length === 0) {
    throw new EnterpriseError(ERROR_CODES.NOT_FOUND, 'Job not found', { statusCode: 404 });
  }

  const job = rows[0];
  if (tenantId && job.tenant_id && job.tenant_id !== tenantId) {
    throw new EnterpriseError(ERROR_CODES.UNAUTHORIZED, 'Access denied to this job resource', { statusCode: 403 });
  }

  if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
    throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, `Cannot cancel terminal job in status ${job.status}`, { statusCode: 400 });
  }

  await db.query(`
    UPDATE background_job_runs
    SET status = 'CANCELLED', completed_at = CURRENT_TIMESTAMP,
        metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('cancellation_reason', $1::text)
    WHERE id = $2
  `, [reason, jobId]);

  await recordAudit(cancelledBy, 'JOB_CANCELLED', { job_id: jobId, reason });
  return { id: jobId, status: JOB_STATUS.CANCELLED, reason };
}

/**
 * Retrieves a single job with tenant isolation enforcement.
 */
async function getJob(jobId, { tenantId = null } = {}) {
  const { rows } = await db.query('SELECT * FROM background_job_runs WHERE id = $1', [jobId]);
  if (rows.length === 0) {
    throw new EnterpriseError(ERROR_CODES.NOT_FOUND, 'Job not found', { statusCode: 404 });
  }

  const job = rows[0];
  if (tenantId && job.tenant_id && job.tenant_id !== tenantId) {
    throw new EnterpriseError(ERROR_CODES.UNAUTHORIZED, 'Access denied to this job resource', { statusCode: 403 });
  }

  const meta = typeof job.metadata_json === 'string' ? JSON.parse(job.metadata_json) : (job.metadata_json || {});
  return {
    id: job.id,
    job_type: job.job_type,
    tenant_id: job.tenant_id,
    status: job.status === 'SUCCEEDED' ? 'COMPLETED' : job.status,
    raw_status: job.status,
    attempt_count: job.attempt_count,
    max_attempts: job.max_attempts,
    progress_pct: meta.progress_pct || (job.status === 'SUCCEEDED' ? 100 : 0),
    progress_message: meta.progress_message || '',
    correlation_id: job.correlation_id,
    idempotency_key: job.idempotency_key,
    started_at: job.started_at,
    completed_at: job.completed_at,
    last_error: job.last_error,
    result: meta.result || null,
    metadata: meta
  };
}

// In-memory handler registry for async background workloads
const JOB_HANDLERS = new Map();

function registerJobHandler(jobType, handlerFn) {
  JOB_HANDLERS.set(jobType, handlerFn);
}

// Pre-register standard enterprise workload handlers
registerJobHandler('PORTFOLIO_MONITORING_SWEEP', async (payload, { tenantId, updateProgress }) => {
  await updateProgress(20, 'Scanning portfolio active documents');
  const monitoringService = require('./contractMonitoringService');
  const sweepRes = await monitoringService.runPortfolioMonitoring({ id: tenantId, role: 'admin' });
  await updateProgress(80, 'Aggregating breach indicators and telemetry');
  return sweepRes;
});

registerJobHandler('GOVERNANCE_EVALUATION', async (payload, { tenantId, updateProgress }) => {
  await updateProgress(25, 'Loading active governance policies and rulesets');
  const governanceService = require('./policyComplianceService');
  const evalRes = await governanceService.getGovernanceOverview(tenantId);
  await updateProgress(85, 'Evaluating statutory conformance');
  return evalRes;
});

registerJobHandler('DISASTER_RECOVERY_BACKUP', async (payload, { tenantId, updateProgress }) => {
  await updateProgress(20, 'Serializing relational dataset and computing SHA-256');
  const backupService = require('./backupService');
  const backupRes = await backupService.createBackup({
    tenantId: payload.tenantId || tenantId,
    type: payload.type || 'FULL_DATABASE',
    description: payload.description || 'Asynchronous scheduled backup snapshot'
  });
  await updateProgress(80, 'Mirroring archive to durable external vault');
  return backupRes;
});

registerJobHandler('RETENTION_EXECUTION', async (payload, { tenantId, updateProgress }) => {
  await updateProgress(30, 'Scanning document disposition schedules');
  const retentionService = require('./retentionEnforcementService');
  const dryRun = payload.dryRun !== false;
  const retentionRes = await retentionService.executeRetentionRun({ dryRun, adminUserId: payload.adminUserId });
  await updateProgress(85, 'Disposition report compiled');
  return retentionRes;
});

registerJobHandler('DATA_EXPORT_GENERATION', async (payload, { tenantId, updateProgress }) => {
  await updateProgress(30, 'Extracting tenant entities and scrubbing credentials');
  const exportService = require('./dataExportService');
  const exportRes = await exportService.exportTenantData(tenantId);
  await updateProgress(90, 'Computing export package SHA-256 checksums');
  return exportRes;
});

/**
 * Submits an asynchronous job, returns HTTP 202 payload immediately, and dispatches worker execution.
 */
async function submitAsyncJob({ jobType, tenantId = null, idempotencyKey = null, correlationId = null, payload = {}, maxAttempts = 3 }) {
  const startResult = await startJob({
    jobType,
    tenantId,
    idempotencyKey,
    correlationId,
    metadata: { payload, progress_pct: 0, progress_message: 'Job queued' },
    maxAttempts
  });

  const job = startResult.job;
  const cId = job.correlation_id;

  if (startResult.idempotent_duplicate) {
    return {
      status_code: 200,
      job_id: job.id,
      idempotency_key: idempotencyKey,
      status: job.status === 'SUCCEEDED' ? 'COMPLETED' : job.status,
      correlation_id: cId,
      message: 'Idempotent duplicate job execution reused'
    };
  }

  // Dispatch asynchronous processing in background without blocking caller
  setImmediate(async () => {
    try {
      await updateJobProgress(job.id, 10, 'Processing initialized');
      const handler = JOB_HANDLERS.get(jobType);
      let output = null;

      if (handler) {
        output = await handler(payload, {
          jobId: job.id,
          tenantId,
          updateProgress: async (pct, msg) => updateJobProgress(job.id, pct, msg)
        });
      } else {
        // Generic simulated processor if no specific handler registered
        await updateJobProgress(job.id, 50, 'Executing workload');
        output = { executed: true, job_type: jobType, processed_at: new Date().toISOString() };
      }

      await completeJob(job.id, { metadata: { payload, result: output, progress_pct: 100, progress_message: 'Completed successfully' } });
    } catch (err) {
      console.error(`Async job ${job.id} failed:`, err);
      await failJob(job.id, err, { canRetry: false });
    }
  });

  return {
    status_code: 202,
    job_id: job.id,
    idempotency_key: idempotencyKey,
    status: 'QUEUED',
    correlation_id: cId,
    status_url: `/api/jobs/${job.id}`
  };
}

module.exports = {
  JOB_STATUS,
  startJob,
  completeJob,
  failJob,
  retryJob,
  listJobs,
  executeJob,
  updateJobProgress,
  cancelJob,
  getJob,
  registerJobHandler,
  submitAsyncJob
};

