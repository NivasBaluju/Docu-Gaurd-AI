# Deciva — Security Architecture & Threat Model

---

## 1. Security Principles

Deciva operates under strict enterprise defense-in-depth principles:
1. **Zero Plaintext Secrets:** Webhook secrets, database passwords, and external API tokens are encrypted with AES-256-GCM.
2. **Timing-Safe Cryptography:** HMAC signatures are compared using constant-time algorithms (`crypto.timingSafeEqual`).
3. **Strict Tenancy Isolation:** All business entities (documents, workflows, policies, integrations) are isolated by `tenant_id`. Cross-tenant queries return HTTP 403.
4. **Separation of Duties (SoD):** High-exposure decisions require independent approver authorization (`creator !== approver`).
5. **Immutable Cryptographic Audit:** Material security, business, and operational actions are appended to a SHA-256 blockchain ledger.

---

## 2. Cryptographic Credential Vault

Implemented in [`server/services/credentialVaultService.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/services/credentialVaultService.js):
* **Algorithm:** Authenticated AES-256-GCM with randomized 16-byte initialization vectors (IVs) and authentication tags.
* **Key Derivation:** Master key derived via SHA-256 from `ENCRYPTION_KEY`.
* **Zero Leakage:** Passwords and keys are never printed in console logs or error messages.
* **Fingerprint Masking:** All UI and API references are masked: `sec_••••••••_{fp}`.

---

## 3. Webhook Replay & Injection Defense

Implemented in [`server/services/integrationSecurityService.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/services/integrationSecurityService.js):
* **HMAC-SHA256 Signature:** Computed over raw request body buffers (`req.rawBody`) to prevent whitespace manipulation.
* **Replay Protection Window:** Mandates `X-Deciva-Timestamp` within $\pm 300\text{s}$ tolerance of server time.
* **Non-Destructive Validation:** Rejects dangerous structure (prototype pollution, illegal characters) without altering legal contract evidence.

---

## 4. Emergency Break-Glass Model

Implemented for catastrophic disaster recovery or court-ordered emergency audits:
* **Endpoint:** `POST /api/admin/break-glass`
* **Prerequisites:**
  * Must be an authenticated administrator with valid session.
  * Must supply an explicit justification reason and target `tenant_id`.
* **Auditability:**
  * Records the administrator identity, IP address, timestamp, and justification.
  * Appends an immutable block `ADMIN_BREAK_GLASS_INVOKED` to `blockchain_audit`.
  * Break-glass privileges are scoped to the specific emergency correlation ID.

---

## 5. Threat Model Matrix (STRIDE)

| Threat | Subsystem | Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Authentication / Webhooks | CSPRNG OTP tokens, timing-safe HMAC-SHA256, reverse proxy IP trust |
| **Tampering** | Evidence / Audit Ledger | SHA-256 document hashing, hash-chained blockchain, read-only backups |
| **Repudiation** | Decision Approvals | Separation of duties, mandatory justification, blockchain audit trail |
| **Information Disclosure** | Credential Vault / Logs | AES-256-GCM vault, sensitive key log redaction, display masking |
| **Denial of Service** | API Gateway / Jobs | Sliding-window rate limiters, 1MB JSON limits, bounded exponential retries |
| **Elevation of Privilege** | Administrative Endpoints | `requireAdmin` middleware, strict zero-trust session checks, break-glass audit |
