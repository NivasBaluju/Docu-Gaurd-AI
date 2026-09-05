# DocuGuard AI — Release Checklists

---

## 1. Pre-Deployment Verification Checklist

- [ ] Execute baseline audit: `node scratch/phase15_baseline.cjs`.
- [ ] Run isolated recovery test: `node scratch/qa_phase15_recovery.cjs`.
- [ ] Run full enterprise QA: `node scratch/qa_phase15_enterprise.cjs` (Target: 45/45 PASS).
- [ ] Run historical regression test suite (Phase 14, Phase 13, Phase 12, Phase 11, Phase 10, Phase 9, Security, Full System).
- [ ] Execute clean production build: `npm run build` (0 syntax errors).
- [ ] Run release gate verification: `node scratch/phase15_release_gate.cjs` (Result: `RELEASE_READY`).
- [ ] Verify `DATABASE_URL`, `JWT_SECRET`, and `ENCRYPTION_KEY` are configured in production environment.

---

## 2. Post-Deployment Verification Checklist

- [ ] Process Liveness check: `GET /api/health/live` returns HTTP 200.
- [ ] Deep Readiness check: `GET /api/health/ready` returns HTTP 200.
- [ ] Dependency probe: `GET /api/health/dependencies` returns status `READY`.
- [ ] Database Schema check: `GET /api/admin/database/integrity` returns `HEALTHY`.
- [ ] Audit Ledger verification: `GET /api/admin/audit/integrity` returns `VALID`.
- [ ] Create initial baseline backup: `POST /api/admin/backups`.
- [ ] Verify backup hash integrity: `POST /api/admin/backups/:id/verify`.
- [ ] Verify Operations console loads at `#/operations` for authenticated administrators.

---

## 3. Rollback Checklist

- [ ] Notify incident commander and operational team.
- [ ] Revert container image or Git branch to previous release tag.
- [ ] If database rollback is needed, restore latest verified backup:
  ```bash
  POST /api/admin/backups/:id/restore
  ```
- [ ] Re-run health probes to confirm system stability.

---

## 4. Disaster Recovery Checklist

- [ ] Confirm alert notification received.
- [ ] Identify last verified backup using `GET /api/admin/backups`.
- [ ] Recompute checksum to ensure archive has not been corrupted.
- [ ] Execute restore into designated isolation target or live database schema.
- [ ] Verify record count fidelity, relationships, and cryptographic chain continuity.
- [ ] Audit event `RESTORE_COMPLETED` logged and verified.
