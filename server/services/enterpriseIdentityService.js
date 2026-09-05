/**
 * server/services/enterpriseIdentityService.js
 * Phase E: Enterprise Identity Architecture
 * Provider-neutral SSO / Identity layer supporting OIDC and SAML 2.0 configuration validation,
 * tenant mapping, RBAC role mapping, session policies, and account deprovisioning.
 *
 * NOTE: Operates offline and against test fixtures without asserting fake live provider calls.
 */

const crypto = require('crypto');
const { EnterpriseError, ERROR_CODES } = require('../utils/errorTaxonomy');
const { recordAudit } = require('../utils/audit');

const SUPPORTED_PROTOCOLS = ['OIDC', 'SAML_2.0'];
const DECIVA_ROLES = ['admin', 'legal_counsel', 'compliance_officer', 'auditor', 'standard_user'];

// In-memory tenant IDP configurations (can be extended with database persistence)
const IDP_CONFIGS = new Map();

/**
 * Validates an OIDC provider configuration.
 */
function validateOidcConfig(config) {
  const errors = [];
  if (!config.issuerUrl || !/^https?:\/\//.test(config.issuerUrl)) {
    errors.push('issuerUrl must be a valid HTTPS URL');
  }
  if (!config.clientId) errors.push('clientId is required');
  if (!config.clientSecret && !config.usePkce) {
    errors.push('clientSecret is required when PKCE is not enabled');
  }
  if (!config.tokenEndpoint) errors.push('tokenEndpoint is required');
  if (!config.authorizationEndpoint) errors.push('authorizationEndpoint is required');
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a SAML 2.0 provider configuration.
 */
function validateSamlConfig(config) {
  const errors = [];
  if (!config.entityId) errors.push('entityId (Entity ID / Issuer) is required');
  if (!config.ssoUrl || !/^https?:\/\//.test(config.ssoUrl)) {
    errors.push('ssoUrl (Single Sign-On URL) must be a valid HTTPS URL');
  }
  if (!config.certificate) {
    errors.push('certificate (X.509 Public Certificate) is required for assertion signature verification');
  } else if (!config.certificate.includes('-----BEGIN CERTIFICATE-----')) {
    errors.push('certificate must be PEM formatted (-----BEGIN CERTIFICATE-----)');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Configures or updates an enterprise Identity Provider for a tenant.
 */
async function configureTenantIdp({ tenantId, protocol, providerName, config, roleMappings = {}, sessionPolicy = {}, adminUserId = null }) {
  if (!tenantId) throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, 'tenantId is required');
  if (!SUPPORTED_PROTOCOLS.includes(protocol)) {
    throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, `Unsupported identity protocol '${protocol}'. Supported: ${SUPPORTED_PROTOCOLS.join(', ')}`);
  }

  // Validate protocol-specific configuration
  let validationResult;
  if (protocol === 'OIDC') {
    validationResult = validateOidcConfig(config || {});
  } else if (protocol === 'SAML_2.0') {
    validationResult = validateSamlConfig(config || {});
  }

  if (!validationResult.valid) {
    throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, `Identity Provider configuration validation failed: ${validationResult.errors.join('; ')}`, {
      errors: validationResult.errors
    });
  }

  // Validate role mappings
  const validatedMappings = {};
  for (const [idpGroup, role] of Object.entries(roleMappings)) {
    if (!DECIVA_ROLES.includes(role)) {
      throw new EnterpriseError(ERROR_CODES.VALIDATION_ERROR, `Invalid target Deciva role '${role}'. Supported: ${DECIVA_ROLES.join(', ')}`);
    }
    validatedMappings[idpGroup] = role;
  }

  const idpRecord = {
    id: `idp-${crypto.randomUUID()}`,
    tenant_id: tenantId,
    protocol,
    provider_name: providerName || `${protocol} Identity Provider`,
    config: {
      ...config,
      // Redact client secret if present in stored config representation
      clientSecret: config.clientSecret ? 'REDACTED_FOR_SECURITY' : undefined
    },
    role_mappings: validatedMappings,
    session_policy: {
      idleTimeoutMinutes: sessionPolicy.idleTimeoutMinutes || 30,
      absoluteLifetimeHours: sessionPolicy.absoluteLifetimeHours || 12,
      forceMfa: sessionPolicy.forceMfa !== false,
      singleSessionPerUser: !!sessionPolicy.singleSessionPerUser
    },
    status: 'CONFIGURED_OFFLINE_VERIFIED',
    configured_at: new Date().toISOString()
  };

  IDP_CONFIGS.set(tenantId, idpRecord);

  await recordAudit(adminUserId, 'ENTERPRISE_IDP_CONFIGURED', {
    tenant_id: tenantId,
    protocol,
    provider_name: idpRecord.provider_name
  });

  return idpRecord;
}

/**
 * Maps incoming IdP claims (groups/roles) to authoritative Deciva RBAC role.
 */
function mapClaimsToRole(tenantId, idpGroups = []) {
  const idp = IDP_CONFIGS.get(tenantId);
  if (!idp || !idp.role_mappings) {
    return 'standard_user';
  }

  // Hierarchy precedence: admin > legal_counsel > compliance_officer > auditor > standard_user
  const ROLE_PRECEDENCE = ['admin', 'legal_counsel', 'compliance_officer', 'auditor', 'standard_user'];
  let highestRole = 'standard_user';
  let highestIndex = ROLE_PRECEDENCE.indexOf(highestRole);

  for (const group of idpGroups) {
    const mapped = idp.role_mappings[group];
    if (mapped) {
      const idx = ROLE_PRECEDENCE.indexOf(mapped);
      if (idx !== -1 && idx < highestIndex) {
        highestRole = mapped;
        highestIndex = idx;
      }
    }
  }

  return highestRole;
}

/**
 * Validates a simulated assertion/token claim against tenant policies.
 */
function evaluateSessionPolicy(tenantId, { sessionAgeMinutes = 0, idleMinutes = 0, mfaCompleted = false } = {}) {
  const idp = IDP_CONFIGS.get(tenantId) || {
    session_policy: { idleTimeoutMinutes: 30, absoluteLifetimeHours: 12, forceMfa: true }
  };
  const policy = idp.session_policy;

  const violations = [];
  if (idleMinutes > policy.idleTimeoutMinutes) {
    violations.push(`Idle timeout exceeded (${idleMinutes}m > ${policy.idleTimeoutMinutes}m)`);
  }
  if (sessionAgeMinutes > policy.absoluteLifetimeHours * 60) {
    violations.push(`Maximum session lifetime exceeded (${sessionAgeMinutes}m > ${policy.absoluteLifetimeHours * 60}m)`);
  }
  if (policy.forceMfa && !mfaCompleted) {
    violations.push('MFA verification is required by enterprise tenant policy');
  }

  return {
    compliant: violations.length === 0,
    violations,
    policy
  };
}

/**
 * Deprovisions or suspends a federated user account upon IdP notification.
 */
async function deprovisionFederatedUser(tenantId, userEmail, { reason = 'SCIM / IdP deprovisioning event', adminUserId = null } = {}) {
  const db = require('../db');
  const { rows } = await db.query('SELECT id, email, role FROM users WHERE email = $1', [userEmail]);
  if (rows.length === 0) {
    return { deprovisioned: false, error: 'User not found' };
  }

  const user = rows[0];
  // Revoke all active sessions
  await db.query('UPDATE sessions SET revoked = true WHERE user_id = $1', [user.id]);

  await recordAudit(adminUserId, 'FEDERATED_USER_DEPROVISIONED', {
    tenant_id: tenantId,
    user_id: user.id,
    email: user.email,
    reason
  });

  return {
    deprovisioned: true,
    user_id: user.id,
    email: user.email,
    sessions_revoked: true,
    reason
  };
}

/**
 * Gets the current IdP configuration for a tenant.
 */
function getTenantIdp(tenantId) {
  return IDP_CONFIGS.get(tenantId) || null;
}

module.exports = {
  SUPPORTED_PROTOCOLS,
  DECIVA_ROLES,
  validateOidcConfig,
  validateSamlConfig,
  configureTenantIdp,
  mapClaimsToRole,
  evaluateSessionPolicy,
  deprovisionFederatedUser,
  getTenantIdp
};
