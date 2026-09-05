# Deciva — Enterprise Operations Runbook

---

## 1. System Health Monitoring

Operators must monitor the three standard health probes:

| Probe | Endpoint | Expected Status | Action if Failing |
| :--- | :--- | :--- | :--- |
| **Process Liveness** | `GET /api/health/live` | `live` (HTTP 200) | Restart Node process (`pm2 restart` / container restart) |
| **Deep Readiness** | `GET /api/health/ready` | `ready` (HTTP 200) | Check PostgreSQL network connectivity and pool limits |
| **Dependency Health** | `GET /api/health/dependencies` | `READY` (HTTP 200) | Inspect specific degraded dependency in response |

---

## 2. Background Job Management

Tracked in [`server/services/jobExecutionService.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/services/jobExecutionService.js):
* **Status Inspection:** `GET /api/admin/jobs?status=FAILED`
* **Retrying Failed Jobs:** `POST /api/admin/jobs/:id/retry`
* **Idempotency Guarantee:** Jobs enforce `idempotency_key`. Concurrent invocations will safely skip rather than duplicate records.

---

## 3. Integration Outbox & Dead-Letter Queue (DLQ)

When outbound webhooks fail after 5 exponential backoff retries:
1. The outbox record transitions to `DEAD_LETTER`.
2. Inspect DLQ events via `GET /api/integrations/events?status=DEAD_LETTER`.
3. To replay after resolving external connectivity:
   ```bash
   POST /api/integrations/events/:id/retry
   ```

---

## 4. Routine Maintenance Tasks

### Daily:
- Check `GET /api/admin/backups/metrics` to verify `rpo_status = "MET"`.
- Verify cryptographic audit continuity: `GET /api/admin/audit/integrity`.

### Weekly:
- Execute a dry-run or isolated restore test: `POST /api/admin/backups/:id/restore` with `{"dry_run": true}`.
- Inspect database schema integrity: `GET /api/admin/database/integrity`.

### Monthly:
- Preview retention candidates: `POST /api/admin/retention/preview`.
- Execute approved retention purges: `POST /api/admin/retention/apply`.
