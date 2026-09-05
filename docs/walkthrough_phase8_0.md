# Phase 8.0: Controlled Portfolio Operations & Bulk Triage Engine — Walkthrough

## Executive Summary
Phase 8.0 transitions **Deciva** from observational portfolio oversight (**See → Understand → Export**) into governed, atomic execution (**See → Validate → Preview → Execute → Audit**).

It introduces a zero-data-loss bulk triage architecture where **no bulk operation mutates data until authorization, validation, and execution rules have all passed**. The execution pipeline enforces strict preview binding, canonical SHA-256 preview hashing, idempotency enforcement, and auditable execution receipts.

---

## Architectural Principles & Core Guarantees

### 1. Preview Binding & Anti-Tampering
- **No Client Payload at Execute Time**: The client cannot alter action IDs, operation parameters, or mode between preview and execute. `/api/portfolio/operations/:previewId/execute` accepts only the `previewId` in the route parameter and the `Idempotency-Key` HTTP header.
- **Preview Hash Integrity**: During preview, a deterministic canonical SHA-256 hash is computed over `(operation | mode | sorted_action_ids | sorted_payload)` and recorded on the batch record.
- **Re-validation Under Row-Level Lock**: During execution within a database transaction, actions are locked using `SELECT ... FOR UPDATE OF a`. If an action state changed between preview and execute, STRICT mode rolls back atomically, whereas SUBSET mode skips the blocked item.

### 2. Idempotency & Conflict Handling
- **Idempotency Keys**: Required for execution requests. Requests missing the `Idempotency-Key` header receive HTTP 400.
- **Request Hash Binding**: The server computes a SHA-256 hash binding `(user_id | preview_id | idempotency_key)`:
  - **Identical Repeated Request**: Returns HTTP 200 with `{ idempotent: true }` and cached execution receipt.
  - **Reused Key for Different Request**: Returns HTTP 409 `IDEMPOTENCY_KEY_REUSED`.
  - **Re-executing an Already Consumed Preview**: Returns HTTP 409 `PREVIEW_ALREADY_CONSUMED`.

### 3. Execution Atomicity & Failure Modes
- **STRICT Mode**: If any action fails re-validation or mutation, the transaction executes a complete `ROLLBACK` (zero partial mutations). The batch record transitions to `FAILED`.
- **SUBSET Mode**: Only eligible actions mutate. Blocked or non-matching actions are skipped and recorded in `blocked_json`. The batch transitions to `COMPLETED` with partial execution statistics.

### 4. Auditable Execution Receipts
- Each executed action logs an append-only audit entry in `contract_action_activity` and updates `contract_action_decisions` when status transitions occur.
- The batch execution record persists counts, timing, and an auditable receipt in `portfolio_operation_batches`.

---

## Key Capabilities Delivered

### 1. Supported Bulk Operations
- **`BULK_ASSIGN`**: Atomically assign or unassign selected actions to an authorized owner.
- **`BULK_DEADLINE`**: Batch-update or clear due dates across selected active actions.
- **`BULK_TRANSITION`**: Governed status transitions (e.g., `IN_REVIEW -> RESOLVED`, `OPEN -> DISMISSED`) using `isValidTransition()` as single source of truth.

### 2. Database Schema Migrations ([`server/db.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/db.js))
- Added `portfolio_operation_batches` table with:
  - `id`, `user_id`, `operation_type`, `status`, `mode`
  - `requested_count`, `eligible_count`, `executed_count`, `blocked_count`
  - `preview_hash`, `idempotency_key`, `request_hash`
  - `payload_json`, `blocked_json`, `result_json`
  - `created_at`, `completed_at`
- Indexes on `(user_id, status)`, `(user_id, created_at DESC)`, and `(preview_hash)`.
- Unique constraint on `(user_id, idempotency_key)`.

### 3. Service Layer ([`server/services/bulkOperationsService.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/services/bulkOperationsService.js))
- `previewBulkOperation(user, { operation, mode, actionIds, payload })`: Input validation, per-action eligibility check, preview record creation, canonical hashing.
- `executeBulkOperation(user, previewId, idempotencyKey)`: Row-level locking (`SELECT ... FOR UPDATE`), transaction isolation, per-action mutation and audit logging.
- `getBatchHistory(user, { page, limit })`: User-scoped paginated history.

### 4. REST Endpoints ([`server/routes/portfolioOperations.js`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/server/routes/portfolioOperations.js))
- `POST /api/portfolio/operations/preview` — Generates preview with eligible/blocked classifications.
- `POST /api/portfolio/operations/:previewId/execute` — Atomically executes pre-validated batch.
- `GET /api/portfolio/operations/history` — Retrieves past batch operations for user.

### 5. Frontend User Interface
- **`BulkOperationModal.jsx`**: 5-step guided wizard (Configure → Preview → Confirm → Execute → Auditable Receipt).
- **`BulkOperationHistoryPanel.jsx`**: Audit log and batch history viewer with collapsible receipts.
- **`PortfolioAttentionQueue.jsx`**: Multi-select row selection, select-all toggle, selection counters, and bulk triage action bar.
- **`PortfolioDashboard.jsx`**: "⚡ Bulk Operations" tab with live queue integration.

---

## Verification & Test Results

### 1. Dedicated Phase 8.0 Verification Suite ([`backend/tests/verify_phase8_0_bulk_operations.py`](file:///c:/Users/DELL/Downloads/Deciva%20AI/Deciva%20AI/backend/tests/verify_phase8_0_bulk_operations.py))
- **50 / 50 Tests Passed (100%)**

| Section | Description | Tests | Result |
|---|---|---|---|
| **Section 1** | Schema Integrity | 01–05 | **PASS** |
| **Section 2** | Input Validation | 06–13 | **PASS** |
| **Section 3** | Preview Eligibility Classification | 14–23 | **PASS** |
| **Section 4** | Canonical Hash Determinism | 24–26 | **PASS** |
| **Section 5** | User Isolation | 27–29 | **PASS** |
| **Section 6** | Execute: BULK_ASSIGN | 30–34 | **PASS** |
| **Section 7** | Idempotency Enforcement | 35–38 | **PASS** |
| **Section 8** | Execute: BULK_DEADLINE | 39–41 | **PASS** |
| **Section 9** | Execute: BULK_TRANSITION | 42–46 | **PASS** |
| **Section 10** | SUBSET Mode Partial Execution | 47–48 | **PASS** |
| **Section 11** | Batch History & User Scoping | 49–50 | **PASS** |

### 2. Regression Battery Pass Summary

| Suite | Component | Tests | Result |
|---|---|---|---|
| **Phase 8.0** | Controlled Portfolio Operations & Bulk Triage | 50 / 50 | **PASS (100%)** |
| **Phase 7.9** | Enterprise Compliance Audit & Evidence Export | 40 / 40 | **PASS (100%)** |
| **Phase 7.8** | Contract Portfolio Intelligence | 37 / 37 | **PASS (100%)** |
| **Phase 7.7** | Workflow Analytics & Escalation | 32 / 32 | **PASS (100%)** |
| **Phase 7.6** | Notifications & Deadline Intelligence | 24 / 24 | **PASS (100%)** |
| **Phase 7.5** | Collaboration & Discussion | 23 / 23 | **PASS (100%)** |
| **Phase 7.4** | Action Center & Decision UI | 20 / 20 | **PASS (100%)** |
| **Phase 7.3** | Workflow State Engine | 20 / 20 | **PASS (100%)** |
| **Phase 7.2.2** | Contract Intelligence Synchronization | 15 / 15 | **PASS (100%)** |
| **Phase 7.2.1** | Workflow Route Handlers | 10 / 10 | **PASS (100%)** |
| **Phase 7.1** | Database Schema & Migrations | 5 / 5 | **PASS (100%)** |
| **Phase 6.4** | Executive Intelligence Engine | 9 / 9 | **PASS (100%)** |
| **Phase 6.3** | Simulation & Cross-Document Risk Engine | 9 / 9 | **PASS (100%)** |
| **TOTAL** | **Full System Regression Battery** | **294 / 294** | **PASS (100%)** |

---

## Conclusion
Phase 8.0 has been completed and verified with preview binding, anti-tampering canonical SHA-256 hashes, idempotency caching, atomic database transactions with row-level locks, per-action audit activity trails, multi-user isolation, and zero regressions across the portfolio and compliance engine.
