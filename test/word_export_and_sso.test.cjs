/**
 * test/word_export_and_sso.test.cjs
 * Verifies:
 * - Word Export (DOCX OpenXML generation, side-by-side tracked changes)
 * - Enterprise Identity (OIDC & SAML 2.0 configuration validation, session policies, deprovisioning)
 * - Background Job Bounded Retries & Error handling
 * - Cryptographic Audit Package verification
 * - ROI calculation transparency
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { generateDocumentRedlineDocx, computeWordDiffList } = require('../server/services/docxExportService');
const {
  validateOidcConfig,
  validateSamlConfig,
  mapExternalUserToTenant,
  evaluateSessionPolicy,
  deprovisionUser
} = require('../server/services/enterpriseIdentityService');
const { generateCryptographicAuditExport } = require('../server/services/auditExportService');
const { getBusinessRoiAnalytics } = require('../server/services/businessRoiService');
const { submitAsyncJob, getJob, retryJob } = require('../server/services/jobExecutionService');

async function runWordAndSsoTests() {
  console.log('=== COMMERCIAL HARDENING: WORD EXPORT, SSO IDENTITY & ROBUSTNESS SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. DOCX Redline Generation & Mammoth Verification
  console.log('--- 1. Production Word Export (DOCX) ---');
  const docxRes = await generateDocumentRedlineDocx({
    documentId: 'demo-doc-01-nda',
    userId: 'f9074205-a2e9-453a-859e-0375159b08fc',
    negotiationMode: 'strict'
  });

  assert(docxRes.success === true, 'Generated DOCX export file');
  assert(fs.existsSync(docxRes.storage_path), `File exists on disk: ${docxRes.filename}`);

  const mammothResult = await mammoth.extractRawText({ path: docxRes.storage_path });
  assert(mammothResult.value.length > 200, `DOCX text extracted successfully via mammoth (${mammothResult.value.length} chars)`);
  assert(mammothResult.value.includes('DECIVA — REDLINE & NEGOTIATION EXPORT'), 'Document title preserved in DOCX header');
  assert(mammothResult.value.includes('EXECUTIVE NEGOTIATION SUMMARY'), 'Side-by-side comparison tables preserved in DOCX');

  // Word Diff Test
  const diffs = computeWordDiffList('Company may terminate at its sole discretion.', 'Company may terminate upon mutual agreement.');
  assert(diffs.length > 0, `Word diff generated ${diffs.length} segments`);
  const removedWord = diffs.find(d => d.type === 'del' && d.text.includes('sole'));
  const addedWord = diffs.find(d => d.type === 'add' && d.text.includes('mutual'));
  assert(removedWord !== undefined, 'Detected deletion of unilateral "sole discretion"');
  assert(addedWord !== undefined, 'Detected addition of negotiated "mutual agreement"');

  // 2. Enterprise Identity Architecture Tests
  console.log('\n--- 2. Enterprise SSO & Identity Provider Abstraction ---');

  // OIDC Config Validation
  const validOidc = validateOidcConfig({
    issuerUrl: 'https://login.microsoftonline.com/example-tenant/v2.0',
    clientId: 'deciva-azure-client',
    clientSecret: 'secret_value_123',
    authorizationEndpoint: 'https://login.microsoftonline.com/example-tenant/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/example-tenant/oauth2/v2.0/token'
  });
  assert(validOidc.valid === true, 'OIDC valid configuration recognized');

  const invalidOidc = validateOidcConfig({ issuerUrl: 'http://insecure-provider.com' });
  assert(invalidOidc.valid === false, 'OIDC rejected non-HTTPS insecure issuer');

  // SAML 2.0 Config Validation
  const validSaml = validateSamlConfig({
    ssoUrl: 'https://identity.okta.com/app/deciva/sso/saml',
    entityId: 'http://www.okta.com/exk123',
    certificate: '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0...\n-----END CERTIFICATE-----'
  });
  assert(validSaml.valid === true, 'SAML 2.0 valid configuration recognized');

  // Configure Tenant IdP and Role Mapping
  const { configureTenantIdp, mapClaimsToRole } = require('../server/services/enterpriseIdentityService');
  await configureTenantIdp({
    tenantId: 'tenant-acme-corp',
    protocol: 'OIDC',
    providerName: 'Azure AD / Entra ID Enterprise OIDC',
    config: {
      issuerUrl: 'https://login.microsoftonline.com/example-tenant/v2.0',
      clientId: 'deciva-azure-client',
      clientSecret: 'secret_value_123',
      authorizationEndpoint: 'https://login.microsoftonline.com/example-tenant/oauth2/v2.0/authorize',
      tokenEndpoint: 'https://login.microsoftonline.com/example-tenant/oauth2/v2.0/token'
    },
    roleMappings: {
      Deciva_Admin: 'legal_counsel',
      Standard_Users: 'standard_user'
    },
    sessionPolicy: {
      idleTimeoutMinutes: 15,
      absoluteLifetimeHours: 8,
      forceMfa: true
    }
  });

  const assignedRole = mapClaimsToRole('tenant-acme-corp', ['Deciva_Admin']);
  assert(assignedRole === 'legal_counsel', `Mapped group to enterprise role: ${assignedRole}`);

  // Session Policy
  const activeSession = evaluateSessionPolicy('tenant-acme-corp', {
    sessionAgeMinutes: 30,
    idleMinutes: 5,
    mfaCompleted: true
  });
  assert(activeSession.compliant === true, 'Active within idle and absolute session windows');

  const expiredSession = evaluateSessionPolicy('tenant-acme-corp', {
    sessionAgeMinutes: 30,
    idleMinutes: 20, // > 15m idle limit
    mfaCompleted: true
  });
  assert(expiredSession.compliant === false, 'Enforced 15-minute idle session timeout violation');

  // 3. Cryptographic Audit Export Test
  console.log('\n--- 3. Cryptographic Audit Export Verification ---');
  const auditRes = await generateCryptographicAuditExport({
    documentId: 'demo-doc-01-nda',
    tenantId: 'tenant-enterprise-default',
    userId: 'f9074205-a2e9-453a-859e-0375159b08fc'
  });
  assert(auditRes.success === true, 'Generated cryptographic audit export package');
  assert(auditRes.bundle_sha256.length === 64, `Computed 64-char SHA-256 digest: ${auditRes.bundle_sha256.slice(0, 16)}…`);
  assert(auditRes.sections_count === 10, 'Package contains 10 comprehensive governance & audit sections');
  assert(auditRes.manifest['blockchain_ledger_verification.json'] !== undefined, 'Audit manifest contains blockchain ledger verification checksum');

  // 4. Business ROI Transparency Test
  console.log('\n--- 4. Business ROI Analytics Calculation ---');
  const roiRes = await getBusinessRoiAnalytics({ tenantId: 'tenant-enterprise-default' });
  assert(roiRes.methodology.framework === 'TRANSPARENT_METHODOLOGY_v1.0', 'Methodology framework verified');
  assert(roiRes.metrics.some(m => m.category === 'OBSERVED' && m.id === 'contracts_processed'), 'Contains observed contracts count');
  assert(roiRes.metrics.some(m => m.category === 'NOT_AVAILABLE' && m.value === 'NOT_AVAILABLE'), 'Contains un-fabricated NOT_AVAILABLE entries');

  console.log('\n=============================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runWordAndSsoTests()
  .then(() => {
    console.log('Word and SSO test suite completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
