/**
 * DocuGuard AI — Enterprise AI Telemetry Service
 * ---------------------------------------------------------------------------
 * Asynchronously records non-invasive, privacy-safe AI operational telemetry.
 * Under NO circumstances does this service store raw contract text, prompts, or PII.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('./logger');

/**
 * Records an AI operation event into ai_telemetry_logs.
 */
async function recordAiTelemetry({
  correlationId,
  userId,
  documentId,
  operationType,
  provider = 'local',
  model = 'heuristic',
  durationMs = 0,
  status = 'SUCCESS',
  groundedStatus = 'GROUNDED',
  tokensUsed = 0,
  fallbackUsed = false,
  errorCategory = null,
  metadata = {}
}) {
  try {
    const id = uuidv4();
    // Strictly sanitize metadata to ensure no raw text or secrets slip into metadata JSON
    const cleanMeta = logger.sanitize(metadata || {});

    // Asynchronous insert
    db.query(
      `INSERT INTO ai_telemetry_logs (
        id, correlation_id, user_id, document_id, operation_type,
        model_provider, model_name, duration_ms, status, grounded_status,
        tokens_used, fallback_used, error_category, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)`,
      [
        id,
        correlationId || null,
        userId || null,
        documentId || null,
        operationType,
        provider,
        model,
        Math.max(0, Math.floor(durationMs)),
        status,
        groundedStatus,
        Math.max(0, Math.floor(tokensUsed)),
        Boolean(fallbackUsed),
        errorCategory || null,
        JSON.stringify(cleanMeta)
      ]
    ).catch(err => {
      console.warn('[AI Telemetry] Async DB write warning:', err.message);
    });

    // Also emit structured operational log
    logger.info('AI_OPERATION_COMPLETED', {
      correlationId,
      userId,
      documentId,
      durationMs,
      status,
      data: {
        operationType,
        provider,
        model,
        groundedStatus,
        fallbackUsed,
        errorCategory
      }
    });

    return id;
  } catch (err) {
    console.warn('[AI Telemetry] Failed to dispatch telemetry:', err.message);
    return null;
  }
}

/**
 * Retrieve aggregated telemetry metrics for enterprise observability dashboard.
 */
async function getTelemetryMetrics(options = {}) {
  const { timeWindowHours = 24 } = options;
  try {
    const { rows: stats } = await db.query(`
      SELECT 
        COUNT(*) AS total_operations,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) AS successful_operations,
        COUNT(CASE WHEN fallback_used = true THEN 1 END) AS fallback_operations,
        COUNT(CASE WHEN grounded_status = 'INSUFFICIENT_EVIDENCE' THEN 1 END) AS ungrounded_refusals,
        ROUND(AVG(duration_ms)::numeric, 2) AS avg_duration_ms,
        SUM(tokens_used) AS total_tokens_used,
        operation_type
      FROM ai_telemetry_logs
      WHERE created_at >= NOW() - ($1 || ' hours')::interval
      GROUP BY operation_type
    `, [timeWindowHours]);

    return {
      windowHours: timeWindowHours,
      operations: stats.map(s => ({
        operationType: s.operation_type,
        total: Number(s.total_operations),
        success: Number(s.successful_operations),
        fallback: Number(s.fallback_operations),
        ungroundedRefusals: Number(s.ungrounded_refusals),
        avgDurationMs: Number(s.avg_duration_ms) || 0,
        tokensUsed: Number(s.total_tokens_used) || 0
      }))
    };
  } catch (err) {
    console.warn('[AI Telemetry] Metric query error:', err.message);
    return { windowHours: timeWindowHours, operations: [] };
  }
}

module.exports = {
  recordAiTelemetry,
  getTelemetryMetrics
};
