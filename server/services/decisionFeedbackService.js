/**
 * DocuGuard AI — Human Decision Feedback Telemetry Service
 * Post-Phase-15 Commercial Hardening
 *
 * Captures human vs AI decision disagreement telemetry for analytical governance
 * and offline model validation.
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * Zero Automatic Retraining. This service strictly records telemetry for audit,
 * compliance, and future offline evaluation. It never silently alters deterministic
 * risk weights, scoring formulas, or model parameters.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { recordAudit } = require('../utils/audit');

/**
 * Categorizes the nature of human agreement or disagreement with AI recommendation.
 */
function classifyDisagreement(aiRecommendation, aiRiskScore, humanDecision) {
  const normAiRec = (aiRecommendation || '').toUpperCase();
  const normHumanDec = (humanDecision || '').toUpperCase();
  const score = typeof aiRiskScore === 'number' ? aiRiskScore : 50;

  if (normHumanDec === normAiRec || normHumanDec === 'ACCEPTED' || normHumanDec === 'APPROVED_AS_RECOMMENDED') {
    return 'RECOMMENDATION_ACCEPTED';
  }

  // AI flagged high risk, but human adjudicated low risk or approved without change
  if ((score >= 60 || normAiRec.includes('HIGH') || normAiRec.includes('REJECT')) &&
      (normHumanDec.includes('LOW') || normHumanDec === 'APPROVED' || normHumanDec === 'WAIVED')) {
    return 'AI_HIGH_HUMAN_LOW';
  }

  // AI flagged low/medium risk, but human adjudicated critical/high risk or rejected
  if ((score <= 40 || normAiRec.includes('LOW') || normAiRec.includes('APPROVE')) &&
      (normHumanDec.includes('HIGH') || normHumanDec.includes('REJECT') || normHumanDec === 'BLOCKED')) {
    return 'AI_LOW_HUMAN_HIGH';
  }

  return 'RECOMMENDATION_OVERRIDDEN';
}

/**
 * Record a human decision feedback telemetry event.
 */
async function recordDecisionFeedback({
  tenantId,
  documentId,
  decisionId = null,
  userId,
  clauseId = null,
  aiRecommendation,
  aiRiskScore = null,
  humanDecision,
  decisionReason,
  finalOutcome,
  metadata = {}
}) {
  if (!tenantId || !documentId || !userId) {
    throw new Error('tenantId, documentId, and userId are required to record decision feedback');
  }
  if (!aiRecommendation || !humanDecision || !decisionReason || !finalOutcome) {
    throw new Error('aiRecommendation, humanDecision, decisionReason, and finalOutcome are required');
  }

  const disagreementType = classifyDisagreement(aiRecommendation, aiRiskScore, humanDecision);
  const feedbackId = uuidv4();

  // Privacy safe metadata
  const safeMetadata = {
    ...metadata,
    recorded_at: new Date().toISOString(),
    is_telemetry_only: true,
    model_retrained: false
  };

  const query = `
    INSERT INTO contract_decision_feedback (
      id, tenant_id, document_id, decision_id, user_id, clause_id,
      ai_recommendation, ai_risk_score, human_decision, disagreement_type,
      decision_reason, final_outcome, metadata_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *;
  `;

  const values = [
    feedbackId,
    tenantId,
    documentId,
    decisionId,
    userId,
    clauseId,
    aiRecommendation,
    aiRiskScore,
    humanDecision,
    disagreementType,
    decisionReason,
    finalOutcome,
    JSON.stringify(safeMetadata)
  ];

  const { rows } = await db.query(query, values);
  const recorded = rows[0];

  await recordAudit(userId, 'HUMAN_DECISION_FEEDBACK_CAPTURED', {
    feedbackId,
    documentId,
    tenantId,
    disagreementType,
    aiRecommendation,
    humanDecision,
    finalOutcome
  });

  return {
    success: true,
    feedback: recorded,
    telemetry_notice: 'Feedback recorded into analytical governance dataset. Zero model weights modified.'
  };
}

/**
 * Retrieve aggregated feedback telemetry for a tenant or document.
 */
async function getFeedbackAnalytics({ tenantId, documentId = null, limit = 50 }) {
  if (!tenantId) throw new Error('tenantId is required');

  let baseQuery = 'WHERE tenant_id = $1';
  const params = [tenantId];

  if (documentId) {
    params.push(documentId);
    baseQuery += ` AND document_id = $${params.length}`;
  }

  // Aggregate counts by disagreement type
  const countQuery = `
    SELECT disagreement_type, COUNT(*)::int as count
    FROM contract_decision_feedback
    ${baseQuery}
    GROUP BY disagreement_type;
  `;
  const { rows: countRows } = await db.query(countQuery, params);

  const breakdown = {
    RECOMMENDATION_ACCEPTED: 0,
    RECOMMENDATION_OVERRIDDEN: 0,
    AI_HIGH_HUMAN_LOW: 0,
    AI_LOW_HUMAN_HIGH: 0
  };

  let totalEvents = 0;
  for (const row of countRows) {
    breakdown[row.disagreement_type] = row.count;
    totalEvents += row.count;
  }

  const acceptedCount = breakdown.RECOMMENDATION_ACCEPTED || 0;
  const acceptanceRate = totalEvents > 0 ? Math.round((acceptedCount / totalEvents) * 100) : 100;
  const overrideRate = 100 - acceptanceRate;

  // Recent feedback entries
  const recentQuery = `
    SELECT f.*, u.name as user_name, u.email as user_email
    FROM contract_decision_feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ${baseQuery}
    ORDER BY f.created_at DESC
    LIMIT $${params.length + 1};
  `;
  params.push(limit);
  const { rows: recentRows } = await db.query(recentQuery, params);

  return {
    tenant_id: tenantId,
    document_id: documentId,
    total_feedback_events: totalEvents,
    acceptance_rate_pct: acceptanceRate,
    override_rate_pct: overrideRate,
    disagreement_breakdown: breakdown,
    recent_events: recentRows,
    governance_model: 'DETERMINISTIC_EVIDENCE_GROUNDED',
    retraining_policy: 'NO_AUTOMATIC_RETRAINING'
  };
}

module.exports = {
  classifyDisagreement,
  recordDecisionFeedback,
  getFeedbackAnalytics
};
