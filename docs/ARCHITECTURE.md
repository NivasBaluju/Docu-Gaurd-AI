# Deciva — Enterprise System Architecture Specification

---

## 1. Executive Summary & Architectural Hierarchy

Deciva is a production-grade contract intelligence, governance, and operational resilience platform. Following the successful completion of Phases 10 through 15, the platform operates on a strictly layered, unidirectional pipeline:

```text
                  ┌─────────────────────────────┐
                  │   Enterprise Data Sources   │
                  │ Integrations / Uploads / API│
                  └──────────────┬──────────────┘
                                 ↓
                       ┌───────────────────┐
                       │  Evidence Layer   │
                       └─────────┬─────────┘
                                 ↓
                       ┌───────────────────┐
                       │ Decision Intel    │ (Phase 10)
                       └─────────┬─────────┘
                                 ↓
                       ┌───────────────────┐
                       │ Monitoring Engine │ (Phase 11)
                       └─────────┬─────────┘
                                 ↓
                       ┌───────────────────┐
                       │ Human Workflow    │ (Phase 12)
                       └─────────┬─────────┘
                                 ↓
                       ┌───────────────────┐
                       │ Governance Layer  │ (Phase 13)
                       └─────────┬─────────┘
                                 ↓
                       ┌───────────────────┐
                       │ Integrations & Bus│ (Phase 14)
                       └─────────┬─────────┘
                                 ↓
              ┌─────────────────────────────────────┐
              │ Phase 15: Enterprise Ops & Hardening│
              │                                     │
              │ Reliability & Disaster Recovery     │
              │ Data Export & Import Portability    │
              │ Tenant Lifecycle & Legal Hold       │
              │ Retention Enforcement Pipeline      │
              │ Background Job Reliability & DLQ    │
              │ Dependency Probes & Degraded Mode   │
              │ Break-Glass Controls & Audit Chain  │
              │ Paper & Ink Operations Console      │
              │ Configuration & Database Integrity  │
              │ Release Gate & Architectural Freeze │
              └─────────────────────────────────────┘
```

---

## 2. Core Architectural Invariants

1. **Architectural Freeze Invariant:**
   * Phase 15 is the terminal engineering and release-hardening phase.
   * No Phase 16 or parallel/competing AI risk models, scores, or intelligence engines are permitted.
   * Phases 10 through 14 remain the sole authoritative engines for contract analysis, decisioning, and external sync.

2. **Zero Mocked Production Checks:**
   * Health probes execute live queries against PostgreSQL (`SELECT 1`), Flask microservice (`/api/health`), AES-256-GCM credential vault, and cryptographic audit blockchain.
   * Disaster recovery restores execute into isolated schemas (`ent_qa_iso_*`), recomputing cryptographic digests and verifying foreign keys.

3. **Cryptographic Immutability:**
   * All administrative actions, tenant lifecycle state transitions, legal holds, and disaster recovery events append cryptographically sealed blocks (`blockchain_audit`) with SHA-256 hashes linking each block to its predecessor.

4. **Fail-Closed Security & Credential Vault:**
   * Sensitive integration keys and system secrets are encrypted with AES-256-GCM. Plaintext secrets are never stored in databases, logs, or exports.

---

## 3. Component Subsystems

| Subsystem | Service / Module | Storage Table | Description |
| :--- | :--- | :--- | :--- |
| **Disaster Recovery** | `backupService.js` | `enterprise_backups` | Point-in-time snapshots, SHA-256 hashing, isolated restore validation |
| **Data Portability** | `dataExportService.js`, `dataImportService.js` | Filesystem / DB | Versioned JSON archive export/import with dry-run and secret exclusion |
| **Tenant Lifecycle** | `tenantLifecycleService.js` | `tenant_lifecycle_records` | State machine: ACTIVE → SUSPENDED → ARCHIVING → ARCHIVED → DELETION_PENDING → DELETED |
| **Legal Hold** | `legalHoldService.js` | `legal_holds` | Immutable evidence preservation overriding tenant deletion and retention purge |
| **Retention Enforcement** | `retentionEnforcementService.js` | `retention_policies`, `retention_execution_logs` | Automated policy-based document lifecycle management (preview & apply modes) |
| **Job Execution** | `jobExecutionService.js` | `background_job_runs` | Exponential backoff, jitter, idempotent execution, and dead-letter handling |
| **Health Monitoring** | `operationalMetricsService.js` | Dynamic Probes | Deep dependency health probes reporting READY, DEGRADED, or FAILED |
| **Break-Glass Access** | `admin_break_glass_logs` | Privileged emergency administrative sessions with correlation IDs |
| **Audit Ledger** | `audit.js` | `blockchain_audit` | Immutable chained cryptographic ledger with tamper detection |
