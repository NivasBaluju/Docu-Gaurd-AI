# Deciva — Enterprise Data Governance Specification

---

## 1. Tenant Lifecycle Management

Deciva implements a controlled, multi-stage tenant lifecycle to eliminate accidental data loss while supporting legal compliance and GDPR/CCPA requests:

```
ACTIVE  <──────>  SUSPENDED  ──────>  ARCHIVING  ──────>  ARCHIVED
                                                             │
                                                             ▼
                                                     DELETION_PENDING
                                                             │
                                                             ▼
                                                    DELETION_AUTHORIZED
                                                             │
                                                             ▼
                                                          DELETING
                                                             │
                                                             ▼
                                                          DELETED
```

### Deletion Safety Invariants:
1. **Multi-Stage Authorization:** A deletion request enters `DELETION_PENDING` with a default 30-day grace period. An authorized administrator must explicitly confirm to transition to `DELETION_AUTHORIZED`.
2. **Legal Hold Immunity:** Prior to executing deletion, the engine queries active legal holds. If an active hold exists, deletion is strictly aborted with `AUTHORIZATION_ERROR`.
3. **True Destruction:** In Deciva, `DELETED` means the tenant's operational data has actually been purged across documents, workflows, monitoring events, and integrations, and recorded with `deleted_at`.

---

## 2. Enterprise Legal Hold Protection

Implemented in [`server/services/legalHoldService.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/services/legalHoldService.js):
* **Purpose:** Shields documents, workflows, findings, and evidence involved in pending litigation, audits, or regulatory investigations.
* **Scope Flexibility:** Supports `ALL` (entire tenant archive) or granular asset targeting (`DOCUMENT`, `WORKFLOW`, `FINDING`).
* **Retention Immunity:** Any asset governed by an active legal hold is immune to automated retention purges and tenant deletion.

---

## 3. Retention Enforcement Engine

Implemented in [`server/services/retentionEnforcementService.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/services/retentionEnforcementService.js):
* **Deterministic Rules:** Configured by target asset (`DOCUMENTS`, `MONITORING_EVENTS`, `OUTBOX_EVENTS`) and `retention_days`.
* **Two-Phase Operation:**
  1. `previewRetention()`: Queries candidates, separates records into eligible vs. held, logs preview metrics, and **never mutates data**.
  2. `applyRetention()`: Safely purges eligible records while strictly preserving records under legal hold.
* **Audit Trail:** Every execution logs duration, purge counts, and held counts to `retention_execution_logs` and appends `RETENTION_EXECUTED` to `blockchain_audit`.

---

## 4. Secure Data Portability (Export / Import)

* **Format:** Versioned `DecivaExport` JSON package with per-dataset SHA-256 checksums and a manifest checksum.
* **Exclusion of Secrets:** Passwords, TOTP secrets, API credentials, and encryption keys are strictly excluded from export archives.
* **Import Modes:**
  * `DRY_RUN`: Validates counts and schemas without writing.
  * `VALIDATE`: Performs cryptographic checksum verification and referential integrity checks.
  * `IMPORT`: Executes transactional insertion with idempotency conflict handling.
