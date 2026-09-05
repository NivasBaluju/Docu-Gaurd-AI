# Deciva — Disaster Recovery & Business Continuity Runbook

---

## 1. Objectives & Operational SLA Metrics

* **Recovery Point Objective (RPO):** <= 60 minutes (`RPO_TARGET_MINUTES=60`).
* **Recovery Time Objective (RTO):** <= 30 minutes (`RTO_TARGET_MINUTES=30`).
* **Backup Retention Window:** 30 days (`BACKUP_RETENTION_DAYS=30`).
* **Target Recovery Invariant:** Backups are certified only when restored into an isolated environment and checked for referential integrity.

---

## 2. Backup Strategy & Cryptographic Hashing

Every snapshot package created via `backupService.createBackup()`:
1. Gathers all 17 critical relational tables (Documents, Workflows, Monitoring Events, Policies, Controls, Compliance Findings, Exceptions, Integrations, Outbox, Mappings, etc.).
2. Emits a deterministic JSON snapshot archive.
3. Calculates an immutable SHA-256 cryptographic digest.
4. Stores the backup record in `enterprise_backups` with metadata, size in bytes, and schema version.
5. Appends a `BACKUP_CREATED` event to `blockchain_audit`.

---

## 3. Tamper Detection & Corruption Defense

Before any restore occurs, `verifyBackup(backupId)` reads the backup file from storage and computes the SHA-256 hash.
* If any byte was modified, truncated, or injected:
  * Status is marked `CORRUPTED`.
  * Audit event `BACKUP_CORRUPTION_DETECTED` is recorded.
  * Restore execution fails closed with `EnterpriseError(ERROR_CODES.RECOVERY_ERROR)`.

---

## 4. Isolated Disaster Recovery Verification Procedure

To verify recovery without altering live production data:

```bash
POST /api/admin/backups/:id/restore
Content-Type: application/json
Authorization: Bearer <ADMIN_JWT>

{
  "dry_run": false,
  "isolation_prefix": "ent_qa_iso_"
}
```

The restore service executes:
1. Hash recomputation and integrity confirmation.
2. Creates isolated schema tables: `ent_qa_iso_documents`, `ent_qa_iso_contract_decision_workflows`, etc.
3. Inserts all records inside an atomic PostgreSQL transaction.
4. Validates counts, foreign key associations, and schema constraints.
5. Emits `RESTORE_COMPLETED` to `blockchain_audit` with duration in milliseconds.

---

## 5. Automated Recovery Runbook Steps

1. **Identify Backup:** Query `GET /api/admin/backups` and select the latest verified backup ID.
2. **Execute Validation:** Run isolated test restore (`isolation_prefix = "ent_recovery_test_"`).
3. **Switch Traffic:** Point database connection or swap production schema after validation succeeds.
4. **Log Audit Trail:** Confirm audit ledger block height and chain continuity via `verifyChain()`.
