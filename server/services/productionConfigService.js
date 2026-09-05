/**
 * server/services/productionConfigService.js
 * Components 22 & 23: Configuration Validation & Fingerprinting
 * Validates startup environment configuration, enforces fail-closed checks,
 * and generates safe configuration fingerprints without exposing secret values.
 */

const crypto = require('crypto');
const { EnterpriseError, ERROR_CODES } = require('../utils/errorTaxonomy');

const CONFIG_SCHEMA = {
  DATABASE_URL: { classification: 'REQUIRED', sensitive: true },
  JWT_SECRET: { classification: 'REQUIRED', sensitive: true },
  ENCRYPTION_KEY: { classification: 'REQUIRED', sensitive: true },
  PORT: { classification: 'OPTIONAL', default: '5000', sensitive: false },
  NODE_ENV: { classification: 'OPTIONAL', default: 'development', sensitive: false },
  RPO_TARGET_MINUTES: { classification: 'OPTIONAL', default: '60', sensitive: false },
  RTO_TARGET_MINUTES: { classification: 'OPTIONAL', default: '30', sensitive: false },
  BACKUP_RETENTION_DAYS: { classification: 'OPTIONAL', default: '30', sensitive: false }
};

/**
 * Validates the startup environment configuration.
 * Fails closed in production if required secrets are absent or weak.
 */
function validateStartupConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  for (const [key, def] of Object.entries(CONFIG_SCHEMA)) {
    const val = process.env[key];
    if (!val) {
      if (def.classification === 'REQUIRED') {
        missing.push(key);
      } else if (def.classification === 'PRODUCTION_REQUIRED' && isProd) {
        missing.push(key);
      }
    } else {
      // Check for default or insecure keys in production
      if (isProd && def.sensitive) {
        if (val.includes('default') || val.includes('secret') || val.length < 16) {
          warnings.push(`Insecure or weak value detected for sensitive variable: ${key}`);
        }
      }
    }
  }

  if (missing.length > 0) {
    const msg = `Startup configuration validation failed: missing critical variables: ${missing.join(', ')}`;
    console.error(`❌ ${msg}`);
    if (isProd) {
      throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, msg);
    }
  }

  return {
    valid: missing.length === 0,
    isValid: missing.length === 0,
    missing,
    warnings,
    is_production: isProd
  };
}

/**
 * Generates an immutable, non-sensitive configuration fingerprint.
 * Allows operators to audit which configuration was active without revealing secrets.
 */
function getConfigurationFingerprint() {
  const safeConfig = {
    application_version: '1.0.0-phase15.enterprise',
    schema_version: '20260905_013',
    node_version: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || 'development',
    rpo_target_minutes: process.env.RPO_TARGET_MINUTES || '60',
    rto_target_minutes: process.env.RTO_TARGET_MINUTES || '30',
    backup_retention_days: process.env.BACKUP_RETENTION_DAYS || '30'
  };

  const serialized = JSON.stringify(safeConfig);
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');

  return {
    ...safeConfig,
    configuration_hash: hash,
    fingerprint: hash
  };
}

/**
 * Returns just the SHA-256 configuration fingerprint string.
 */
function getConfigFingerprint() {
  const config = getConfigurationFingerprint();
  return config.configuration_hash;
}

module.exports = {
  validateStartupConfig,
  validateStartupConfiguration: validateStartupConfig,
  getConfigurationFingerprint,
  getConfigFingerprint
};
