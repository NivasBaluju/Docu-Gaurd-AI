const crypto = require('crypto');

/**
 * Recursively normalizes and sorts object keys alphabetically to produce
 * a deterministic canonical data representation.
 * 
 * Rules:
 * - Object keys are sorted alphabetically.
 * - Array order is strictly preserved (caller pre-sorts arrays deterministically).
 * - Date objects and standard ISO date strings are normalized to ISO-8601 UTC.
 * - undefined fields are omitted.
 * - null values are explicitly retained.
 * - Numbers and booleans maintain standard JSON representation.
 */
function canonicalizeData(obj) {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'number') {
      // Normalize NaN and Infinity to null for valid JSON
      if (!isFinite(obj)) return null;
      return obj;
    }
    if (typeof obj === 'string') {
      // If it matches standard ISO date string format, standardize it
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
        const d = new Date(obj);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }
      }
      return obj;
    }
    return obj;
  }

  if (obj instanceof Date) {
    return isNaN(obj.getTime()) ? null : obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => canonicalizeData(item));
  }

  const sortedKeys = Object.keys(obj).sort();
  const canonicalObj = {};
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      canonicalObj[key] = canonicalizeData(val);
    }
  }
  return canonicalObj;
}

/**
 * Converts any JavaScript object into its deterministic canonical JSON string.
 */
function canonicalizeEvidence(data) {
  const canonical = canonicalizeData(data);
  return JSON.stringify(canonical);
}

/**
 * Generates an SHA-256 cryptographic content hash of canonicalized evidence payload.
 */
function generateEvidenceHash(data) {
  const canonicalString = canonicalizeEvidence(data);
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * In-memory stateless tamper verification.
 * Recomputes the SHA-256 hash of provided evidence and compares against expected hash.
 */
function verifyEvidenceHash(evidenceData, expectedHash) {
  if (!evidenceData || typeof evidenceData !== 'object') {
    return {
      valid: false,
      expectedHash: expectedHash || '',
      computedHash: '',
      algorithm: 'SHA-256',
      error: 'Invalid or missing evidence payload'
    };
  }

  const computedHash = generateEvidenceHash(evidenceData);
  const normalizedExpected = (expectedHash || '').trim().toLowerCase();
  const normalizedComputed = computedHash.toLowerCase();

  const valid = Boolean(normalizedExpected && normalizedExpected === normalizedComputed);

  return {
    valid,
    expectedHash: expectedHash || '',
    computedHash,
    algorithm: 'SHA-256'
  };
}

module.exports = {
  canonicalizeData,
  canonicalizeEvidence,
  generateEvidenceHash,
  verifyEvidenceHash
};
