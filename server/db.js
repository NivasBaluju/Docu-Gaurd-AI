const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
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
  `;
  try {
    await pool.query(schema);
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