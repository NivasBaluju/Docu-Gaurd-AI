/**
 * Deciva — Enterprise Outbound Event & Outbox Delivery Service
 * ---------------------------------------------------------------------------
 * Implements the transactional Outbox pattern for reliable at-least-once event delivery.
 * Features bounded exponential backoff retries, Dead-Letter Queue (DLQ), and cryptographic audit.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { recordAudit } = require('../utils/audit');
const { getProvider } = require('./integrations/providerRegistry');
const CredentialVaultService = require('./credentialVaultService');

const MAX_DELIVERY_ATTEMPTS = 5;

const ALLOWED_OUTBOUND_EVENTS = [
  'DOCUMENT_IMPORTED',
  'DOCUMENT_UPDATED',
  'RISK_CHANGED',
  'COMPLIANCE_STATUS_CHANGED',
  'POLICY_VIOLATION_DETECTED',
  'WORKFLOW_SUBMITTED',
  'WORKFLOW_APPROVED',
  'WORKFLOW_REJECTED',
  'ACTION_CREATED',
  'ACTION_COMPLETED',
  'EXCEPTION_REQUESTED',
  'EXCEPTION_APPROVED',
  'EXCEPTION_REJECTED',
  'EXCEPTION_EXPIRED'
];

const IntegrationEventService = {
  /**
   * Records a canonical event into the outbox for reliable delivery.
   */
  emitEvent: async ({
    tenantId,
    integrationId = null,
    eventType,
    sourceObject,
    sourceObjectId,
    version = '1',
    summary = '',
    correlationId = null,
    details = {}
  }) => {
    if (!tenantId) throw new Error('tenantId is required to emit outbound events');
    if (!ALLOWED_OUTBOUND_EVENTS.includes(eventType)) {
      console.warn(`[Event Outbox] Emitting unlisted event type: ${eventType}`);
    }

    const eventId = `evt-${uuidv4()}`;
    const cleanDetails = { ...details };
    delete cleanDetails.raw_text;
    delete cleanDetails.extracted_text;
    delete cleanDetails.credentials;
    delete cleanDetails.password;

    const canonicalPayload = {
      event_id: eventId,
      event_type: eventType,
      tenant_id: tenantId,
      correlation_id: correlationId || `corr-${uuidv4()}`,
      occurred_at: new Date().toISOString(),
      source_object: sourceObject || 'system',
      source_object_id: sourceObjectId || null,
      version: String(version),
      summary: summary || `Event ${eventType} emitted`,
      details: cleanDetails
    };

    const id = uuidv4();
    await db.query(
      `INSERT INTO integration_event_outbox (
        id, tenant_id, integration_id, event_id, event_type, payload_json, status, attempt_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 0, CURRENT_TIMESTAMP)`,
      [id, tenantId, integrationId, eventId, eventType, JSON.stringify(canonicalPayload)]
    );

    return { id, eventId, status: 'PENDING', payload: canonicalPayload };
  },

  /**
   * Processes pending events from the outbox with bounded exponential backoff.
   */
  dispatchPendingEvents: async (limit = 20) => {
    // Select pending events ready for dispatch
    const { rows: events } = await db.query(
      `SELECT * FROM integration_event_outbox
       WHERE status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );

    const results = [];

    for (const ev of events) {
      const payload = typeof ev.payload_json === 'string' ? JSON.parse(ev.payload_json) : ev.payload_json;
      const attempt = (ev.attempt_count || 0) + 1;

      try {
        // Fetch destination integrations for this tenant
        let targetIntegrations = [];
        if (ev.integration_id) {
          const { rows } = await db.query(
            `SELECT * FROM enterprise_integrations WHERE id = $1 AND status = 'ACTIVE'`,
            [ev.integration_id]
          );
          targetIntegrations = rows;
        } else {
          // Broadcast to all active outbound integrations for this tenant
          const { rows } = await db.query(
            `SELECT * FROM enterprise_integrations
             WHERE tenant_id = $1 AND status = 'ACTIVE' AND integration_type IN ('OUTBOUND_API', 'WEBHOOK')`,
            [ev.tenant_id]
          );
          targetIntegrations = rows;
        }

        if (targetIntegrations.length === 0) {
          // If no active endpoints configured, mark delivered/logged safely without retry churn
          await db.query(
            `UPDATE integration_event_outbox
             SET status = 'DELIVERED', sent_at = CURRENT_TIMESTAMP, attempt_count = $1
             WHERE id = $2`,
            [attempt, ev.id]
          );
          results.push({ id: ev.id, status: 'DELIVERED', note: 'No target endpoints; archived' });
          continue;
        }

        for (const intg of targetIntegrations) {
          const provider = getProvider(intg.provider);
          const config = typeof intg.configuration_json === 'string'
            ? JSON.parse(intg.configuration_json)
            : (intg.configuration_json || {});

          const creds = intg.credentials_reference
            ? { token: CredentialVaultService.retrieveSecret(intg.credentials_reference) }
            : {};

          await provider.publishEvent(config, creds, payload);
        }

        // Successfully delivered
        await db.query(
          `UPDATE integration_event_outbox
           SET status = 'DELIVERED', sent_at = CURRENT_TIMESTAMP, attempt_count = $1, last_error = NULL
           WHERE id = $2`,
          [attempt, ev.id]
        );

        results.push({ id: ev.id, status: 'DELIVERED' });
      } catch (dispatchErr) {
        console.warn(`[Event Outbox] Dispatch failed for event ${ev.event_id}:`, dispatchErr.message);

        if (attempt >= MAX_DELIVERY_ATTEMPTS) {
          // Route to Dead Letter Queue (DLQ)
          await db.query(
            `UPDATE integration_event_outbox
             SET status = 'DEAD_LETTER', attempt_count = $1, last_error = $2
             WHERE id = $3`,
            [attempt, dispatchErr.message, ev.id]
          );
          results.push({ id: ev.id, status: 'DEAD_LETTER', error: dispatchErr.message });
        } else {
          // Exponential backoff: 5s, 15s, 45s, 120s...
          const backoffSec = Math.min(300, Math.pow(3, attempt) * 5);
          await db.query(
            `UPDATE integration_event_outbox
             SET status = 'PENDING', attempt_count = $1, last_error = $2,
                 next_attempt_at = CURRENT_TIMESTAMP + ($3 || ' seconds')::interval
             WHERE id = $4`,
            [attempt, dispatchErr.message, backoffSec, ev.id]
          );
          results.push({ id: ev.id, status: 'RETRY_SCHEDULED', nextAttemptInSeconds: backoffSec });
        }
      }
    }

    return results;
  },

  /**
   * Resets dead-lettered events back to PENDING for administrator-guided replay.
   */
  retryDeadLetterEvents: async (tenantId, eventId = null) => {
    let query = `UPDATE integration_event_outbox
                 SET status = 'PENDING', attempt_count = 0, next_attempt_at = CURRENT_TIMESTAMP, last_error = NULL
                 WHERE tenant_id = $1 AND status = 'DEAD_LETTER'`;
    const params = [tenantId];

    if (eventId) {
      query += ` AND (id = $2 OR event_id = $2)`;
      params.push(eventId);
    }

    const { rowCount } = await db.query(query, params);

    await recordAudit(tenantId, 'INTEGRATION_EVENTS_RETRIED', {
      replayedCount: rowCount,
      specificEventId: eventId
    });

    return { replayedCount: rowCount };
  },

  /**
   * Queries outbox events with pagination and filtering.
   */
  listEvents: async (tenantId, { integrationId, status, limit = 50, offset = 0 } = {}) => {
    let query = `SELECT * FROM integration_event_outbox WHERE tenant_id = $1`;
    const params = [tenantId];

    if (integrationId) {
      params.push(integrationId);
      query += ` AND integration_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    return rows;
  }
};

module.exports = IntegrationEventService;
