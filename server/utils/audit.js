const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sha256 } = require('./crypto');

const GENESIS_HASH = '0'.repeat(64);

async function getLastBlock() {
  const { rows } = await db.query('SELECT * FROM blockchain_audit ORDER BY block_index DESC LIMIT 1');
  return rows[0];
}
vf
/** Append a new immutable, hash-chained audit block. */
async function recordAudit(userId, action, details = {}) {
  try {
    const last = await getLastBlock();
    const blockIndex = last ? Number(last.block_index) + 1 : 0;
    const prevHash = last ? last.hash : GENESIS_HASH;
    const timestamp = new Date().toISOString();
    const detailsJson = JSON.stringify(details);
    const hash = sha256(`${blockIndex}|${userId || 'anon'}|${action}|${detailsJson}|${prevHash}|${timestamp}`);

    const id = uuidv4();
    await db.query(
      `INSERT INTO blockchain_audit (id, block_index, user_id, action, details_json, prev_hash, hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, blockIndex, userId || null, action, detailsJson, prevHash, hash, timestamp]
    );

    return { id, blockIndex, hash };
  } catch (err) {
    console.error('recordAudit error:', err.message);
  }
}

/** Recompute every block's hash and confirm the chain has not been tampered with. */
async function verifyChain() {
  const { rows: blocks } = await db.query('SELECT * FROM blockchain_audit ORDER BY block_index ASC');
  let expectedPrev = GENESIS_HASH;
  const problems = [];

  for (const block of blocks) {
    const createdAtStr = block.created_at instanceof Date ? block.created_at.toISOString() : String(block.created_at);
    const recomputed = sha256(
      `${block.block_index}|${block.user_id || 'anon'}|${block.action}|${block.details_json}|${block.prev_hash}|${createdAtStr}`
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

async function logThreat(userId, ip, severity, category, message) {
  try {
    const id = uuidv4();
    await db.query(
      `INSERT INTO threat_logs (id, user_id, ip, severity, category, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId || null, ip || null, severity, category, message]
    );
    return id;
  } catch (err) {
    console.error('logThreat error:', err.message);
  }
}

module.exports = { recordAudit, verifyChain, logThreat, getLastBlock };
