const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data', 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dbDir, 'lexsecure.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  mfa_enabled INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_fingerprint TEXT,
  ip TEXT,
  trust_score INTEGER DEFAULT 100,
  mfa_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now')),
  revoked INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  sha256 TEXT NOT NULL,
  encrypted INTEGER DEFAULT 1,
  extracted_text TEXT,
  ocr_confidence REAL,
  version_group TEXT,
  version_number INTEGER DEFAULT 1,
  risk_score INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL,
  source_ref TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS generated_contracts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  params_json TEXT NOT NULL,
  content TEXT NOT NULL,
  signature TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  expires_at TEXT,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,
  revoked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS blockchain_audit (
  id TEXT PRIMARY KEY,
  block_index INTEGER NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  details_json TEXT,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS threat_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  ip TEXT,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

if (process.env.REQUIRE_MFA === 'true') {
  try {
    db.prepare('UPDATE users SET mfa_enabled = 1 WHERE mfa_enabled = 0').run();
  } catch (e) {
    console.error('MFA auto-enable failed:', e.message);
  }
}

module.exports = db;

