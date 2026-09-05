/**
 * DocuGuard AI — Enterprise Credential Vault Service
 * ---------------------------------------------------------------------------
 * Provides zero-plaintext cryptographic secret storage using AES-256-GCM.
 * Protects API tokens, webhook signing secrets, and OAuth credentials.
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { encryptSecret, decryptSecret, sha256, MASTER_KEY } = require('../utils/crypto');
const logger = require('../utils/logger');

const CredentialVaultService = {
  /**
   * Encrypts plaintext using AES-256-GCM, returning { ciphertext, iv, tag } hex strings.
   */
  encrypt: (plaintext) => {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Secret must be a non-empty string');
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext: ciphertext.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  },

  /**
   * Decrypts an AES-256-GCM payload with { ciphertext, iv, tag } or standard descriptor.
   */
  decrypt: (payload) => {
    if (!payload) return null;
    if (typeof payload === 'string') {
      return CredentialVaultService.retrieveSecret(payload);
    }
    if (payload.ciphertext && payload.iv && payload.tag) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(payload.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'hex')), decipher.final()]);
      return decrypted.toString('utf8');
    }
    return CredentialVaultService.retrieveSecret(payload);
  },

  /**
   * Encrypts and formats a sensitive secret using AES-256-GCM.
   * Returns a secure credentials reference descriptor.
   */
  storeSecret: (plaintextSecret, metadata = {}) => {
    if (!plaintextSecret || typeof plaintextSecret !== 'string') {
      throw new Error('Secret must be a non-empty string');
    }

    const encryptedPayload = encryptSecret(plaintextSecret);
    const keyFingerprint = sha256(plaintextSecret).slice(0, 8);
    const secretId = uuidv4();

    return {
      secret_id: secretId,
      fingerprint: keyFingerprint,
      ciphertext: encryptedPayload,
      algorithm: 'AES-256-GCM',
      created_at: new Date().toISOString(),
      metadata: {
        provider: metadata.provider || 'generic',
        key_type: metadata.key_type || 'api_key'
      }
    };
  },

  /**
   * Decrypts a secure credential reference back to plaintext for active transit use.
   * Handles string descriptors, JSON strings, and descriptor objects.
   * Never log the return value of this method.
   */
  retrieveSecret: (credentialDescriptor) => {
    if (!credentialDescriptor) return null;

    let desc = credentialDescriptor;
    if (typeof desc === 'string' && desc.trim().startsWith('{')) {
      try {
        desc = JSON.parse(desc);
      } catch {}
    }

    // Handle both direct ciphertext strings and full descriptor objects
    const ciphertext = typeof desc === 'object' && desc !== null
      ? desc.ciphertext
      : desc;

    if (!ciphertext) return null;

    try {
      return decryptSecret(ciphertext);
    } catch (err) {
      console.error('[Credential Vault] Decryption failure:', err.message);
      throw new Error('Failed to decrypt credential from vault');
    }
  },

  /**
   * Rotates an existing secret with a new plaintext value.
   */
  rotateSecret: (oldDescriptor, newPlaintextSecret) => {
    let oldDesc = oldDescriptor;
    if (typeof oldDesc === 'string' && oldDesc.trim().startsWith('{')) {
      try { oldDesc = JSON.parse(oldDesc); } catch {}
    }
    return CredentialVaultService.storeSecret(newPlaintextSecret, {
      ...(oldDesc?.metadata || {}),
      previous_fingerprint: oldDesc?.fingerprint
    });
  },

  /**
   * Masks a secret or descriptor for safe display in UI or logs.
   */
  maskSecret: (credentialDescriptor) => {
    if (!credentialDescriptor) return '********';
    let desc = credentialDescriptor;
    if (typeof desc === 'string' && desc.trim().startsWith('{')) {
      try { desc = JSON.parse(desc); } catch {}
    }
    const fp = typeof desc === 'object' && desc?.fingerprint
      ? desc.fingerprint
      : 'sec';
    return `sec_••••••••_${fp}`;
  }
};

module.exports = CredentialVaultService;
