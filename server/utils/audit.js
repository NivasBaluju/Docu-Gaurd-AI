const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sha256 } = require('./crypto');

const GENESIS_HASH = '0'.repeat(64);

function getLastBlock() {
  return db.prepare('SELECT * FROM blockchain_audit ORDER BY block_index DESC LIMIT 1').get();
}

/** Append a new immutable, hash-chained audit block. */
function recordAudit(userId, action, details = {}) {
  const last = getLastBlock();
  const blockIndex = last ? last.block_index + 1 : 0;
  const prevHash = last ? last.hash : GENESIS_HASH;
  const timestamp = new Date().toISOString();
  const detailsJson = JSON.stringify(details);
  const hash = sha256(`${blockIndex}|${userId || 'anon'}|${action}|${detailsJson}|${prevHash}|${timestamp}`);

  const id = uuidv4();
  db.prepare(`
    INSERT INTO blockchain_audit (id, block_index, user_id, action, details_json, prev_hash, hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, blockIndex, userId || null, action, detailsJson, prevHash, hash, timestamp);

  return { id, blockIndex, hash };
}

/** Recompute every block's hash and confirm the chain has not been tampered with. */
function verifyChain() {
  const blocks = db.prepare('SELECT * FROM blockchain_audit ORDER BY block_index ASC').all();
  let expectedPrev = GENESIS_HASH;
  const problems = [];

  for (const block of blocks) {
    const recomputed = sha256(
      `${block.block_index}|${block.user_id || 'anon'}|${block.action}|${block.details_json}|${block.prev_hash}|${block.created_at}`
    );
    if (block.prev_hash !== expectedPrev) {
      problems.push({ block: block.block_index, issue: 'prev_hash mismatch (chain broken)' });
    }
    if (recomputed !== block.hash) {
      problems.push({ block: block.block_index, issue: 'hash mismatch (tampering detected)' });
    }
    expectedPrev = block.hash;
  }

  return { valid: problems.length === 0, totalBlocks: blocks.length, problems };
}

function logThreat(userId, ip, severity, category, message) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO threat_logs (id, user_id, ip, severity, category, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId || null, ip || null, severity, category, message);
  return id;
}

module.exports = { recordAudit, verifyChain, logThreat, getLastBlock };
