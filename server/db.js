const { Pool } = require("pg");
require("dotenv").config();

// Strip parameters that are unsupported by pg on Vercel's Node runtime
// (channel_binding=require causes FUNCTION_INVOCATION_FAILED)
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

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg pool client:', err.message);
});

async function initDb() {
  const schema = `
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

    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS grounded BOOLEAN DEFAULT TRUE;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sources JSONB;

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

    -- Phase 7.1: Live human-managed workflow state for Phase 6.4 prioritized actions
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

    -- Phase 7.1: Append-only record of workflow decisions and status transitions
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

    -- Phase 7.1: General append-only audit trail for action workflow events
    CREATE TABLE IF NOT EXISTS contract_action_activity (
      id VARCHAR(36) PRIMARY KEY,
      action_id VARCHAR(36) NOT NULL REFERENCES contract_actions(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      actor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Phase 7.5: Human discussion and team collaboration thread per workflow action
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

    -- Phase 7.6: Deterministic notification and deadline intelligence system
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

    CREATE INDEX IF NOT EXISTS idx_contract_actions_document_id
      ON contract_actions(document_id);

    CREATE INDEX IF NOT EXISTS idx_contract_actions_snapshot_id
      ON contract_actions(intelligence_snapshot_id);

    CREATE INDEX IF NOT EXISTS idx_contract_actions_status
      ON contract_actions(status);

    CREATE INDEX IF NOT EXISTS idx_contract_actions_owner_id
      ON contract_actions(owner_id);

    CREATE INDEX IF NOT EXISTS idx_contract_actions_priority
      ON contract_actions(priority_score DESC);

    CREATE INDEX IF NOT EXISTS idx_contract_action_decisions_action_id
      ON contract_action_decisions(action_id);

    CREATE INDEX IF NOT EXISTS idx_contract_action_activity_action_id
      ON contract_action_activity(action_id);

    CREATE INDEX IF NOT EXISTS idx_contract_action_comments_action_id
      ON contract_action_comments(action_id);

    CREATE INDEX IF NOT EXISTS idx_contract_action_comments_parent_id
      ON contract_action_comments(parent_comment_id);

    CREATE INDEX IF NOT EXISTS idx_contract_action_comments_created_at
      ON contract_action_comments(created_at ASC);

    CREATE INDEX IF NOT EXISTS idx_contract_action_comments_author_id
      ON contract_action_comments(author_id);

    CREATE INDEX IF NOT EXISTS idx_contract_notifications_user_id
      ON contract_notifications(user_id);

    CREATE INDEX IF NOT EXISTS idx_contract_notifications_user_unread
      ON contract_notifications(user_id, is_read);

    CREATE INDEX IF NOT EXISTS idx_contract_notifications_action_id
      ON contract_notifications(action_id);

    CREATE INDEX IF NOT EXISTS idx_contract_notifications_document_id
      ON contract_notifications(document_id);

    CREATE INDEX IF NOT EXISTS idx_contract_notifications_created_at
      ON contract_notifications(created_at DESC);

    -- Phase 8.0: Batch operation registry for Controlled Portfolio Operations
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
      CONSTRAINT portfolio_operation_batches_idempotency_unique
        UNIQUE (user_id, idempotency_key)
    );

    CREATE INDEX IF NOT EXISTS idx_portfolio_batches_user_id
      ON portfolio_operation_batches(user_id);

    CREATE INDEX IF NOT EXISTS idx_portfolio_batches_status
      ON portfolio_operation_batches(status);

    CREATE INDEX IF NOT EXISTS idx_portfolio_batches_created_at
      ON portfolio_operation_batches(user_id, created_at DESC);
  `;
  try {
    await pool.query(schema);
    // Ensure foreign key constraints cascade on delete for existing database tables
    await pool.query(`
      ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_document_id_fkey;
      ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

      ALTER TABLE share_links DROP CONSTRAINT IF EXISTS share_links_document_id_fkey;
      ALTER TABLE share_links ADD CONSTRAINT share_links_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

      ALTER TABLE contract_simulations DROP CONSTRAINT IF EXISTS contract_simulations_document_id_fkey;
      ALTER TABLE contract_simulations ADD CONSTRAINT contract_simulations_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

      ALTER TABLE contract_intelligence DROP CONSTRAINT IF EXISTS contract_intelligence_document_id_fkey;
      ALTER TABLE contract_intelligence ADD CONSTRAINT contract_intelligence_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

      ALTER TABLE contract_action_comments DROP CONSTRAINT IF EXISTS contract_action_comments_parent_comment_id_fkey;
      ALTER TABLE contract_action_comments ADD CONSTRAINT contract_action_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES contract_action_comments(id) ON DELETE SET NULL;

      ALTER TABLE contract_actions ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE contract_actions ADD COLUMN IF NOT EXISTS escalation_rule VARCHAR(50);
      ALTER TABLE contract_actions ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
      ALTER TABLE contract_actions ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;

      CREATE INDEX IF NOT EXISTS idx_contract_actions_escalated
        ON contract_actions(document_id, is_escalated);
    `);
    console.log("✅ PostgreSQL schema initialized successfully");
  } catch (err) {
    console.error("❌ PostgreSQL Schema Initialization Error:", err);
  }
}

pool.connect()
  .then(async (client) => {
    console.log("✅ Connected to PostgreSQL");
    client.release();
    await initDb();
  })
  .catch(err => console.error("❌ PostgreSQL Connection Error:", err));

module.exports = pool;