const { Pool } = require("pg");
require("dotenv").config();

// Strip parameters that are unsupported by pg on Vercel's Node runtime
function sanitizeDbUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('channel_binding');
    return u.toString();
  } catch {
    return url;
  }
}

const connectionString = sanitizeDbUrl(process.env.DATABASE_URL);
const isLocal = connectionString && connectionString.includes('localhost');

// Enterprise-hardened database TLS configuration
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const allowSelfSigned = process.env.DB_SSL_ALLOW_SELF_SIGNED === 'true';

let sslConfig = false;
if (!isLocal && connectionString) {
  sslConfig = {
    rejectUnauthorized: !allowSelfSigned,
    ca: process.env.DATABASE_CA_CERT || undefined
  };
  if (allowSelfSigned) {
    console.warn('[SECURITY WARNING] PostgreSQL TLS certificate verification is disabled via DB_SSL_ALLOW_SELF_SIGNED=true.');
  }
}

// Enterprise-hardened connection pool configuration
const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: isServerless ? 5 : (Number(process.env.DB_POOL_MAX) || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  statement_timeout: 15000,
  query_timeout: 20000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg pool client:', err.message);
});

/**
 * Formal, version-tracked schema migration definitions.
 * Each migration executes within an isolated transaction and is recorded in schema_migrations.
 */
const MIGRATIONS = [
  {
    version: '20260901_001_core_schema',
    name: 'Initial core users, sessions, otp, documents, threat logs',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        totp_secret TEXT,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint TEXT,
        ip TEXT,
        trust_score INTEGER DEFAULT 100,
        mfa_verified BOOLEAN DEFAULT FALSE,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS otp_codes (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        purpose TEXT NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT,
        size BIGINT,
        sha256 TEXT,
        encrypted BOOLEAN DEFAULT TRUE,
        extracted_text TEXT,
        ocr_confidence REAL,
        version_group VARCHAR(36),
        version_number INTEGER DEFAULT 1,
        risk_score INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL,
        source_ref TEXT,
        grounded BOOLEAN DEFAULT TRUE,
        sources JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS generated_contracts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        contract_type TEXT NOT NULL,
        params_json TEXT,
        content TEXT NOT NULL,
        signature TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS share_links (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        max_downloads INTEGER,
        download_count INTEGER DEFAULT 0,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blockchain_audit (
        id VARCHAR(36) PRIMARY KEY,
        block_index INTEGER NOT NULL,
        user_id VARCHAR(36),
        action TEXT NOT NULL,
        details_json TEXT,
        prev_hash TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS threat_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        ip TEXT,
        severity TEXT,
        category TEXT,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    version: '20260902_002_intelligence_and_workflow',
    name: 'Contract intelligence snapshots, simulations, and human workflow actions',
    sql: `
      CREATE TABLE IF NOT EXISTS contract_simulations (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        scenario TEXT NOT NULL,
        grounded BOOLEAN DEFAULT TRUE,
        document_evidence JSONB,
        simulation_analysis JSONB,
        risk_level TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contract_intelligence (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        health_score INTEGER,
        critical_count INTEGER DEFAULT 0,
        important_count INTEGER DEFAULT 0,
        monitoring_count INTEGER DEFAULT 0,
        healthy_count INTEGER DEFAULT 0,
        executive_summary TEXT,
        conflicts_json JSONB,
        actions_json JSONB,
        metrics_json JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contract_actions (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        intelligence_snapshot_id VARCHAR(36) REFERENCES contract_intelligence(id) ON DELETE SET NULL,
        source_action_id VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        category VARCHAR(30) NOT NULL,
        priority_score INTEGER NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        decision VARCHAR(30),
        owner_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        decision_reason TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE,
        is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
        escalation_rule VARCHAR(50),
        escalation_reason TEXT,
        escalated_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT contract_actions_snapshot_source_unique UNIQUE (document_id, intelligence_snapshot_id, source_action_id)
      );

      CREATE TABLE IF NOT EXISTS contract_action_decisions (
        id VARCHAR(36) PRIMARY KEY,
        action_id VARCHAR(36) NOT NULL REFERENCES contract_actions(id) ON DELETE CASCADE,
        previous_status VARCHAR(30),
        new_status VARCHAR(30) NOT NULL,
        decision VARCHAR(30),
        reason TEXT,
        decided_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contract_action_activity (
        id VARCHAR(36) PRIMARY KEY,
        action_id VARCHAR(36) NOT NULL REFERENCES contract_actions(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        actor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    version: '20260902_003_collaboration_and_notifications',
    name: 'Action comments, notifications, and workflow indices',
    sql: `
      CREATE TABLE IF NOT EXISTS contract_action_comments (
        id VARCHAR(36) PRIMARY KEY,
        action_id VARCHAR(36) NOT NULL REFERENCES contract_actions(id) ON DELETE CASCADE,
        parent_comment_id VARCHAR(36) REFERENCES contract_action_comments(id) ON DELETE SET NULL,
        author_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        body TEXT NOT NULL,
        context_references JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS contract_notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
        action_id VARCHAR(36) REFERENCES contract_actions(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        deduplication_key VARCHAR(255) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT contract_notifications_dedup_unique UNIQUE (user_id, deduplication_key)
      );

      CREATE INDEX IF NOT EXISTS idx_contract_actions_document_id ON contract_actions(document_id);
      CREATE INDEX IF NOT EXISTS idx_contract_actions_status ON contract_actions(status);
      CREATE INDEX IF NOT EXISTS idx_contract_actions_owner_id ON contract_actions(owner_id);
      CREATE INDEX IF NOT EXISTS idx_contract_actions_priority ON contract_actions(priority_score DESC);
      CREATE INDEX IF NOT EXISTS idx_contract_actions_escalated ON contract_actions(document_id, is_escalated);
      CREATE INDEX IF NOT EXISTS idx_contract_action_decisions_action_id ON contract_action_decisions(action_id);
      CREATE INDEX IF NOT EXISTS idx_contract_action_activity_action_id ON contract_action_activity(action_id);
      CREATE INDEX IF NOT EXISTS idx_contract_action_comments_action_id ON contract_action_comments(action_id);
      CREATE INDEX IF NOT EXISTS idx_contract_notifications_user_unread ON contract_notifications(user_id, is_read);
    `
  },
  {
    version: '20260903_004_controlled_operations_8_0',
    name: 'Controlled batch operations table and idempotency tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS portfolio_operation_batches (
        id               VARCHAR(36)   PRIMARY KEY,
        user_id          VARCHAR(36)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation_type   VARCHAR(30)   NOT NULL,
        status           VARCHAR(20)   NOT NULL DEFAULT 'PREVIEWED',
        mode             VARCHAR(20)   NOT NULL DEFAULT 'STRICT',
        requested_count  INTEGER       NOT NULL DEFAULT 0,
        eligible_count   INTEGER       NOT NULL DEFAULT 0,
        executed_count   INTEGER       NOT NULL DEFAULT 0,
        blocked_count    INTEGER       NOT NULL DEFAULT 0,
        preview_hash     VARCHAR(64)   NOT NULL,
        idempotency_key  VARCHAR(255),
        request_hash     VARCHAR(64),
        payload_json     JSONB         NOT NULL DEFAULT '{}'::jsonb,
        blocked_json     JSONB         NOT NULL DEFAULT '[]'::jsonb,
        result_json      JSONB         NOT NULL DEFAULT '{}'::jsonb,
        created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at     TIMESTAMP WITH TIME ZONE,
        CONSTRAINT portfolio_operation_batches_idempotency_unique UNIQUE (user_id, idempotency_key)
      );

      CREATE INDEX IF NOT EXISTS idx_portfolio_batches_user_id ON portfolio_operation_batches(user_id);
      CREATE INDEX IF NOT EXISTS idx_portfolio_batches_status ON portfolio_operation_batches(status);
      CREATE INDEX IF NOT EXISTS idx_portfolio_batches_created_at ON portfolio_operation_batches(user_id, created_at DESC);
    `
  },
  {
    version: '20260903_005_governed_operations_8_1',
    name: 'Governed operations approval control, policy audit, and separation of duties columns',
    sql: `
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS policy_version VARCHAR(20) NOT NULL DEFAULT '1.0';
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS policy_flags JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS policy_details JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS approved_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS approval_comments TEXT;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE portfolio_operation_batches ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      CREATE INDEX IF NOT EXISTS idx_portfolio_batches_approval_status ON portfolio_operation_batches(status, requires_approval);
      CREATE INDEX IF NOT EXISTS idx_portfolio_batches_approved_by ON portfolio_operation_batches(approved_by);
    `
  },
  {
    version: '20260903_006_enterprise_hardening_8_2',
    name: 'Enterprise hardening: activity logs, foreign key cascades, and governance indexes',
    sql: `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
    `
  },
  {
    version: '20260904_007_phase9_enterprise_observability',
    name: 'Enterprise AI telemetry logging, operational correlation tracking, and grounding observability',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_telemetry_logs (
        id VARCHAR(36) PRIMARY KEY,
        correlation_id VARCHAR(64),
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
        operation_type VARCHAR(50) NOT NULL,
        model_provider VARCHAR(50),
        model_name VARCHAR(50),
        duration_ms INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
        grounded_status VARCHAR(30) DEFAULT 'GROUNDED',
        tokens_used INTEGER DEFAULT 0,
        fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
        error_category VARCHAR(50),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ai_telemetry_correlation ON ai_telemetry_logs(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_ai_telemetry_operation ON ai_telemetry_logs(operation_type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_telemetry_document ON ai_telemetry_logs(document_id);
    `
  },
  {
    version: '20260904_008_phase10_decision_intelligence',
    name: 'Phase 10 contract decision intelligence, deterministic exposure snapshot, and decision tracking',
    sql: `
      ALTER TABLE contract_intelligence ADD COLUMN IF NOT EXISTS decision_intelligence_json JSONB;
      ALTER TABLE contract_intelligence ADD COLUMN IF NOT EXISTS exposure_score INTEGER;
      ALTER TABLE contract_intelligence ADD COLUMN IF NOT EXISTS primary_driver TEXT;

      CREATE INDEX IF NOT EXISTS idx_contract_intelligence_doc_created ON contract_intelligence(document_id, created_at DESC);
    `
  },
  {
    version: '20260904_009_phase11_portfolio_monitoring',
    name: 'Phase 11 contract portfolio continuous monitoring, change detection, and lifecycle control',
    sql: `
      CREATE TABLE IF NOT EXISTS contract_monitoring_events (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        priority_score INTEGER NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_reference TEXT,
        previous_value TEXT,
        current_value TEXT,
        risk_delta INTEGER DEFAULT 0,
        affected_dimension VARCHAR(50),
        deduplication_key VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT contract_monitoring_events_dedup_unique UNIQUE (document_id, deduplication_key)
      );

      CREATE INDEX IF NOT EXISTS idx_monitoring_events_user_status ON contract_monitoring_events(user_id, status, priority_score DESC);
      CREATE INDEX IF NOT EXISTS idx_monitoring_events_doc_detected ON contract_monitoring_events(document_id, detected_at DESC);

      CREATE TABLE IF NOT EXISTS contract_lifecycle_states (
        document_id VARCHAR(36) PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        state VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        renewal_date TIMESTAMP WITH TIME ZONE,
        notice_deadline TIMESTAMP WITH TIME ZONE,
        cure_deadline TIMESTAMP WITH TIME ZONE,
        expiration_date TIMESTAMP WITH TIME ZONE,
        evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_lifecycle_states_user_state ON contract_lifecycle_states(user_id, state);
      CREATE INDEX IF NOT EXISTS idx_lifecycle_states_notice_deadline ON contract_lifecycle_states(notice_deadline);
    `
  }
];

/**
 * Executes pending database migrations sequentially and records them in schema_migrations.
 */
async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rows: appliedRows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(appliedRows.map(r => r.version));

    let count = 0;
    for (const m of MIGRATIONS) {
      if (!applied.has(m.version)) {
        await client.query('BEGIN');
        await client.query(m.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [m.version, m.name]
        );
        await client.query('COMMIT');
        console.log(`[MIGRATION] Applied: ${m.version} (${m.name})`);
        count++;
      }
    }
    if (count > 0) {
      console.log(`✅ Applied ${count} new schema migrations.`);
    } else {
      console.log(`✅ Schema migrations up-to-date (${MIGRATIONS.length} migrations recorded).`);
    }
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('❌ Schema Migration Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function initDb() {
  try {
    await runMigrations();
    console.log("✅ PostgreSQL schema initialized and migrations verified successfully");
  } catch (err) {
    console.error("❌ CRITICAL: PostgreSQL Schema Migration Failed:", err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw err;
  }
}

pool.connect()
  .then(async (client) => {
    console.log("✅ Connected to PostgreSQL");
    client.release();
    await initDb();
  })
  .catch(err => console.error("❌ PostgreSQL Connection Error:", err));

pool.initDb = initDb;

module.exports = pool;