# DocuGuard AI — Incident Response Plan

---

## 1. Severity Classification

| Level | Definition | Response SLA | Examples |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core database unavailable, data corruption, or audit chain break | 15 minutes | PostgreSQL pool down, audit chain returns `INVALID` |
| **SEV-2 (Major)** | AI microservice down or external integration offline | 1 hour | Flask backend unreachable, outbox DLQ spike |
| **SEV-3 (Moderate)** | Background job failures or non-critical UI degradation | 4 hours | Retention preview job failing, metrics probe latency |
| **SEV-4 (Minor)** | Cosmetic defect or minor telemetry logging gap | 24 hours | Non-blocking UI alignment, slow audit explorer search |

---

## 2. Specific Incident Playbooks

### Incident A: Cryptographic Audit Chain Failure (`AUDIT_INTEGRITY_FAILURE`)
* **Trigger:** `GET /api/admin/audit/integrity` returns `INVALID`.
* **Action:**
  1. Freeze administrative write actions immediately.
  2. Do **not** attempt automated or silent chain rewriting.
  3. Query `blockchain_audit` to identify the first broken block hash:
     ```sql
     SELECT id, block_index, previous_hash, hash, timestamp FROM blockchain_audit ORDER BY block_index;
     ```
  4. Compare with verified disaster recovery backup snapshot to determine whether tampering or filesystem corruption occurred.
  5. Convene security audit committee before authorizing break-glass state reconciliation.

### Incident B: Corrupted Disaster Recovery Backup
* **Trigger:** `verifyBackup` returns `CHECKSUM_MISMATCH` with status `CORRUPTED`.
* **Action:**
  1. Isolate the corrupted `.dgbackup` file for forensic inspection.
  2. The system automatically halts any restore attempt with `RECOVERY_ERROR`.
  3. Trigger an immediate new database backup: `POST /api/admin/backups`.
  4. Verify the newly generated backup: `POST /api/admin/backups/:id/verify`.

### Incident C: Database Connection Exhaustion / Outage
* **Trigger:** `/api/health/ready` returns HTTP 503 (`database: unhealthy`).
* **Action:**
  1. Inspect connection pool saturation via PostgreSQL:
     ```sql
     SELECT count(*), state FROM pg_stat_activity GROUP BY state;
     ```
  2. Adjust `DB_POOL_MAX` in `.env` if serverless concurrency exceeded threshold.
  3. Restart application gateway process.
