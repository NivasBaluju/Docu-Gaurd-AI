# Deciva — Production Deployment Guide

---

## 1. Environment Configuration

The following variables must be configured in production:

| Variable | Classification | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **REQUIRED** | PostgreSQL connection URI (TLS enforced by default) |
| `JWT_SECRET` | **REQUIRED** | 256-bit cryptographically secure secret for JWT issuance |
| `ENCRYPTION_KEY` | **REQUIRED** | 256-bit hex/base64 key for AES-256-GCM credential vault |
| `PORT` | OPTIONAL | Port for Node Express gateway (Default: `5000`) |
| `NODE_ENV` | OPTIONAL | Set to `production` |
| `RPO_TARGET_MINUTES`| OPTIONAL | Recovery point operational target in minutes (Default: `60`) |
| `RTO_TARGET_MINUTES`| OPTIONAL | Recovery time operational target in minutes (Default: `30`) |
| `BACKUP_RETENTION_DAYS` | OPTIONAL | Retention schedule for backups (Default: `30`) |

---

## 2. Pre-Deployment Checklist

- [ ] All 13 schema migrations verified against staging database.
- [ ] Strong, non-default `JWT_SECRET` and `ENCRYPTION_KEY` generated via CSPRNG.
- [ ] Database TLS active with valid certificates.
- [ ] Python Flask AI microservice active on port 5001 or reachable internal network.
- [ ] Storage volume provisioned at `storage/backups` with write permissions.
- [ ] Production frontend bundle built via `npm run build` with zero syntax errors.

---

## 3. Database Migration Sequence

Migrations are automated via `server/db.js` on startup or can be executed explicitly:

```bash
# Verify connection and apply pending migrations sequentially
node -e "const db = require('./server/db'); db.initDb().then(() => process.exit(0));"
```

Migration Ledger:
1. `20260901_001_core_schema` (Core users, sessions, documents)
2. `20260901_002_blockchain_audit` (SHA-256 blockchain ledger)
3. `20260901_003_secure_share_tokens` (Time-bound share links)
4. `20260902_004_document_analysis_details` (Risk factors, metadata)
5. `20260902_005_action_center` (Contract remediation actions)
6. `20260902_006_ai_telemetry_logs` (AI operational telemetry)
7. `20260903_007_decision_intelligence` (Phase 10 decision model)
8. `20260903_008_contract_monitoring` (Phase 11 continuous monitoring)
9. `20260904_009_contract_decision_workflows` (Phase 12 human approvals)
10. `20260904_010_workflow_comments_timeline` (Phase 12 threaded comments)
11. `20260904_011_policy_compliance_governance` (Phase 13 governance controls)
12. `20260904_012_enterprise_integrations` (Phase 14 integration connectors)
13. `20260905_013_enterprise_operations` (Phase 15 DR, lifecycle, legal holds, jobs)

---

## 4. Health & Verification Probes

Verify deployment health using the three operational probes:

1. **Process Liveness:**
   ```bash
   curl http://localhost:5000/api/health/live
   # HTTP 200: { "status": "live", "uptime": 120 }
   ```

2. **Readiness Probe:**
   ```bash
   curl http://localhost:5000/api/health/ready
   # HTTP 200: { "status": "ready", "dependencies": { "database": { "status": "healthy" } } }
   ```

3. **Enterprise Deep Dependency Health:**
   ```bash
   curl http://localhost:5000/api/health/dependencies
   # HTTP 200: { "status": "READY", "dependencies": { "postgresql": "READY", "ai_microservice": "READY", "credential_vault": "READY", ... } }
   ```

---

## 5. Post-Deployment Checklist

- [ ] Probe `/api/health/dependencies` returns HTTP 200 with status `READY`.
- [ ] Verify audit blockchain integrity: `GET /api/admin/audit/integrity` returns `VALID`.
- [ ] Verify database schema integrity: `GET /api/admin/database/integrity` returns `HEALTHY`.
- [ ] Create initial baseline backup: `POST /api/admin/backups`.
- [ ] Verify backup hash: `POST /api/admin/backups/:id/verify`.
- [ ] Perform dry-run restore test: `POST /api/admin/backups/:id/restore` with `{ "dry_run": true }`.

---

## 6. Rollback Checklist

In the event of an unrecoverable operational regression:
1. Revert application code / container image to previous release tag.
2. Verify database schema compatibility with the previous release.
3. If database state was corrupted, restore from latest verified backup:
   ```bash
   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5000/api/admin/backups/$BACKUP_ID/restore
   ```
4. Verify `/api/health/ready` returns HTTP 200.
