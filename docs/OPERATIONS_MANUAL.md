# Deciva — Enterprise Operations Manual

---

## 1. Enterprise Operations Console Overview

The Enterprise Operations Console (`/operations`) is the central command surface for Deciva site reliability engineers and enterprise administrators.

Built strictly under the **Paper and Ink** design philosophy:
* Tactile, high-density data tables with monospace metric fonts.
* Direct status badges: `READY`, `DEGRADED`, `FAILED`, `HEALTHY`.
* Fully responsive, WCAG 2.1 AA compliant keyboard navigation and semantic WAI-ARIA roles.

---

## 2. Operational Control Modules

### Module 1: Subsystem Health & Deep Probes
* Displays live health status across all 6 core subsystems:
  1. PostgreSQL Relational Engine
  2. Flask AI Microservice
  3. Credential Vault (AES-256-GCM)
  4. Integration Outbox Ledger & DLQ
  5. Background Job Scheduler
  6. Cryptographic Audit Blockchain
* Real-time refresh every 15 seconds or manual trigger.

### Module 2: Disaster Recovery & Snapshot Orchestrator
* View completed backups, file sizes, and cryptographic SHA-256 digests.
* Trigger manual point-in-time full or tenant snapshot.
* Execute isolated test restore into `ent_qa_iso_` schema.

### Module 3: Data Portability (Export / Import)
* Generate encrypted, secret-scrubbed JSON tenant archives.
* Upload and execute dry-run schema validation and duplicate conflict analysis before live import.

### Module 4: Tenant Lifecycle State Machine
* Transition tenants between `ACTIVE`, `SUSPENDED`, `ARCHIVING`, `ARCHIVED`, `DELETION_PENDING`, and `DELETED`.
* Enforce legal hold protection overrides.

### Module 5: Retention Policies & Legal Holds
* Configure retention rules per document class.
* Execute retention rules in `PREVIEW` or `APPLY` modes.
* Create and manage active legal hold matters preventing document purging.

### Module 6: Background Jobs & Dead Letter Queue (DLQ)
* Monitor job executions, retries, and errors across the system.
* Re-queue dead-letter events.
