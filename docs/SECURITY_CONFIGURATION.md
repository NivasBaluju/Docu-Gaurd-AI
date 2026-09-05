# Deciva — Security Configuration & Credential Protection

---

## 1. Credential Vault & Cryptographic Encryption

All enterprise external integration credentials (Salesforce, DocuSign, SAP, Jira, Webhooks) and internal secrets are secured via the Credential Vault (`server/services/credentialVaultService.js`).

* **Algorithm:** AES-256-GCM (Authenticated Encryption with Associated Data).
* **Initialization Vector:** 12-byte cryptographically secure random IV generated per encryption event.
* **Authentication Tag:** 16-byte GCM tag verifying ciphertext integrity before decryption.
* **Master Key:** Derived from `ENCRYPTION_KEY` environment variable (32-byte 256-bit key).
* **Zero Plaintext Invariant:** Plaintext credentials are never written to database columns, query logs, application traces, error payloads, or export archives.

---

## 2. Authentication & Authorization Controls

* **Session Security:** Signed JSON Web Tokens (JWT) using `HS256` with strict expiration windows.
* **Role-Based Access Control (RBAC):**
  * `admin`: Platform administration, disaster recovery, tenant lifecycle, retention policies, break-glass.
  * `compliance_officer`: Governance policies, compliance evaluations, audit reviews.
  * `legal_counsel`: Contract review, approval gates, legal hold management.
  * `viewer`: Read-only access to authorized tenant documents.
* **Insecure Direct Object Reference (IDOR) Defense:** All document, workflow, and finding endpoints enforce tenant boundary validation (`WHERE tenant_id = $1`).

---

## 3. Break-Glass Emergency Administrative Access

For operational emergencies or disaster recovery scenarios requiring escalated privileges:
1. Administrator requests break-glass session via `POST /api/admin/break-glass`.
2. Must provide explicit justification, scope, and correlation ID.
3. System creates a short-lived, high-audit session in `admin_break_glass_logs`.
4. High-priority security alert is dispatched and immutable block appended to `blockchain_audit`.
5. Automatic expiration or explicit operator revocation terminates the emergency session immediately.

---

## 4. Cryptographic Blockchain Audit Ledger

* **Ledger Table:** `blockchain_audit`
* **Structure:** Each block stores `index`, `timestamp`, `action`, `user_id`, `details`, `previous_hash`, and `hash`.
* **Hashing:** SHA-256 over canonical stringification of block attributes.
* **Verification:** Continuous and on-demand verification via `verifyChain()`. Any alteration breaks the cryptographic hash chain and triggers immediate system alerts.
