# Phase 8.0: Controlled Portfolio Operations & Bulk Triage Engine — Implementation Plan

## Background & Architectural Context

Phase 8.0 is a major architectural transition. All previous phases (7.1–7.9) were strictly **read-only observers**. Phase 8.0 introduces the first **write operations originating from the Portfolio layer**, turning DocuGuard AI from an observer into a controlled operator.

### Existing Infrastructure Inspected

Before planning, the following files were inspected:

| File | Key Finding |
|---|---|
| [`server/services/actionWorkflowService.js`](file:///c:/Users/DELL/Downloads/Docu-Gaurd%20AI/Docu-Gaurd%20AI/server/services/actionWorkflowService.js) | Contains **exact transition engine, authorization pattern, and audit emission** to reuse |
| [`server/db.js`](file:///c:/Users/DELL/Downloads/Docu-Gaurd%20AI/Docu-Gaurd%20AI/server/db.js) | Full schema: `contract_actions`, `contract_action_decisions`, `contract_action_activity` |
| [`server/routes/contractActions.js`](file:///c:/Users/DELL/Downloads/Docu-Gaurd%20AI/Docu-Gaurd%20AI/server/routes/contractActions.js) | `authorizeDocument()` and `authorizeAction()` helpers; per-action auth pattern |
| [`server/middleware/auth.js`](file:///c:/Users/DELL/Downloads/Docu-Gaurd%20AI/Docu-Gaurd%20AI/server/middleware/auth.js) | `requireAuth` → JWT verify → session check → zero-trust score → `req.user` |
| [`server/routes/portfolioAnalytics.js`](file:///c:/Users/DELL/Downloads/Docu-Gaurd%20AI/Docu-Gaurd%20AI/server/routes/portfolioAnalytics.js) | Existing portfolio GET-only endpoints; operations route goes here |

---

## Confirmed Existing Workflow States & Transitions

```
WORKFLOW_STATES = { OPEN, IN_REVIEW, RESOLVED, DISMISSED }

ALLOWED_TRANSITIONS = {
  OPEN        → [IN_REVIEW, DISMISSED]
  IN_REVIEW   → [OPEN, RESOLVED, DISMISSED]
  RESOLVED    → [IN_REVIEW]
  DISMISSED   → [IN_REVIEW]
}
```

> [!IMPORTANT]
> Phase 8.0 must call `isValidTransition()` from `actionWorkflowService.js` directly. No second transition engine will be created.

---

## Confirmed Authorization Model

Per-action authorization is verified via `JOIN documents d ON d.id = a.document_id WHERE d.user_id = req.user.id`. This pattern must be replicated inside every bulk operation validation loop. The frontend filter result **is never trusted as authorization**.

---

## Confirmed Audit Tables

| Table | Role in Phase 8.0 |
|---|---|
| `contract_actions` | Target of bulk mutations (owner_id, due_date, status, decision) |
| `contract_action_decisions` | Append-only ledger; one entry per affected action per decision |
| `contract_action_activity` | Append-only audit trail; one BULK_* event per affected action |
| `portfolio_operation_batches` | **NEW** — batch-level metadata, idempotency key, status, counts |

---

## Architectural Invariant

> **Portfolio bulk operations may modify workflow state only through server-side authorization, deterministic pre-flight validation, transactional execution, idempotency protection, and complete audit emission.**

---

## 1. New Database Table

### `portfolio_operation_batches`

```sql
CREATE TABLE IF NOT EXISTS portfolio_operation_batches (
  id               VARCHAR(36)   PRIMARY KEY,
  batch_id         VARCHAR(36)   NOT NULL UNIQUE,
  user_id          VARCHAR(36)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_type   VARCHAR(30)   NOT NULL,
  status           VARCHAR(20)   NOT NULL DEFAULT 'PREVIEWED',
  mode             VARCHAR(20)   NOT NULL DEFAULT 'STRICT',
  requested_count  INTEGER       NOT NULL DEFAULT 0,
  eligible_count   INTEGER       NOT NULL DEFAULT 0,
  executed_count   INTEGER       NOT NULL DEFAULT 0,
  blocked_count    INTEGER       NOT NULL DEFAULT 0,
  idempotency_key  VARCHAR(255),
  payload_json     JSONB         NOT NULL DEFAULT '{}'::jsonb,
  blocked_json     JSONB         NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at     TIMESTAMP WITH TIME ZONE,
  CONSTRAINT portfolio_operation_batches_idempotency_unique
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_batches_user_id
  ON portfolio_operation_batches(user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_batches_status
  ON portfolio_operation_batches(status);
```

**Batch statuses:**

| Status | Meaning |
|---|---|
| `PREVIEWED` | Pre-flight completed, awaiting user confirmation |
| `EXECUTING` | Transaction started, mutations in flight |
| `COMPLETED` | All eligible mutations committed, audit records written |
| `FAILED` | Transaction rolled back, zero mutations persisted |
| `ROLLED_BACK` | Explicit rollback after partial failure in strict mode |

**Supported operation types:**

| Operation | `operation_type` Value |
|---|---|
| Bulk Assignment | `BULK_ASSIGN` |
| Bulk Deadline Update | `BULK_DEADLINE` |
| Bulk Status Transition | `BULK_TRANSITION` |

---

## 2. Pre-flight Validation Rules (Per Action)

For each action ID in the batch, the pre-flight validator must check:

| Condition | Block Reason Code |
|---|---|
| Action ID does not exist | `ACTION_NOT_FOUND` |
| Action belongs to another user's document | `UNAUTHORIZED` |
| Duplicate action ID in same batch | `DUPLICATE_ID` |
| Action status is RESOLVED or DISMISSED (for assignment/deadline) | `ACTION_NOT_ACTIVE` |
| Transition is not in `ALLOWED_TRANSITIONS` | `INVALID_TRANSITION` |
| Target owner user ID does not exist (BULK_ASSIGN) | `INVALID_OWNER` |
| Invalid ISO timestamp (BULK_DEADLINE) | `INVALID_DATE` |
| Empty action IDs array | `EMPTY_BATCH` |
| Batch exceeds maximum size (e.g., 100 actions) | `BATCH_TOO_LARGE` |

> [!IMPORTANT]
> The server independently resolves and re-validates all action IDs during execution. A preview result is **not** a persistent authorization grant.

---

## 3. Atomicity Modes

### Strict Mode (`mode: "STRICT"`)
- If **any** action fails pre-flight validation, the entire batch is rejected with zero mutations.
- Used for: `BULK_TRANSITION`, `BULK_DECISION`.
- Guarantees: `requestedCount == eligibleCount` or the batch never executes.

### Validated-Subset Mode (`mode: "SUBSET"`)
- Pre-flight identifies blocked actions.
- The user explicitly confirms: *"18 eligible, 2 blocked — proceed with eligible only."*
- Backend only mutates the pre-validated eligible subset.
- All blocked actions and reasons are returned in the response.
- The backend **never silently skips blocked actions**.

---

## 4. Idempotency Design

### Request Header
```
Idempotency-Key: <UUID v4>
```

### Server Logic
1. On `POST /execute`, check `portfolio_operation_batches` for `(user_id, idempotency_key)`.
2. If found with `status = COMPLETED` → return the original result immediately without re-executing.
3. If found with `status = EXECUTING` → return `409 Conflict` (operation in progress).
4. If found with `status = FAILED/ROLLED_BACK` → allow re-submission (treat as new attempt).
5. Store idempotency key on the batch record at the start of execution.

---

## 5. Transaction Model (Execute)

```
BEGIN TRANSACTION

  FOR each eligible action:
    SELECT ... FOR UPDATE OF a  (row-level lock)
    Re-validate authorization       (user_id check)
    Re-validate current state       (re-read status from DB)
    Re-validate transition/payload  (isValidTransition or date format)
    Apply mutation to contract_actions
    INSERT contract_action_activity  (BULK_ASSIGN / BULK_DEADLINE / BULK_TRANSITION event)
    INSERT contract_action_decisions (if status/decision change)

  UPDATE portfolio_operation_batches SET status='COMPLETED', executed_count=N
  
COMMIT

ON EXCEPTION:
  ROLLBACK
  UPDATE portfolio_operation_batches SET status='FAILED'
  RETURN { success: false, rolledBack: true }
```

> [!IMPORTANT]
> The re-validation inside the transaction is non-negotiable. The pre-flight preview is advisory only. The transaction re-reads state under a row-level lock.

---

## 6. Audit Record Design

### Per-Action Activity Events

| Operation | `event_type` | Metadata Fields |
|---|---|---|
| `BULK_ASSIGN` | `BULK_ACTION_ASSIGNED` | `batchId`, `previousOwnerId`, `newOwnerId`, `performedBy` |
| `BULK_DEADLINE` | `BULK_DUE_DATE_UPDATED` | `batchId`, `previousDueDate`, `newDueDate`, `performedBy` |
| `BULK_TRANSITION` | `BULK_STATUS_TRANSITIONED` | `batchId`, `previousStatus`, `newStatus`, `performedBy` |

### Batch-Level Metadata (in `portfolio_operation_batches`)
- `batch_id`, `operation_type`, `user_id` (actor)
- `requested_count`, `eligible_count`, `executed_count`, `blocked_count`
- `payload_json` (operation payload without sensitive fields)
- `blocked_json` (array of `{ actionId, reason }`)
- `status`, `created_at`, `completed_at`

---

## 7. API Architecture

### Pre-flight Preview
```
POST /api/portfolio/operations/preview
```
Request:
```json
{
  "operation": "BULK_ASSIGN",
  "mode": "STRICT",
  "actionIds": ["a1", "a2", "a3"],
  "payload": { "ownerId": "user123" }
}
```
Response:
```json
{
  "previewId": "batch_...",
  "operation": "BULK_ASSIGN",
  "mode": "STRICT",
  "requested": 3,
  "eligible": 2,
  "blocked": 1,
  "blockedReasons": [{ "actionId": "a3", "reason": "ACTION_NOT_ACTIVE" }],
  "expectedChanges": [...]
}
```

### Execute
```
POST /api/portfolio/operations/execute
```
Request:
```json
{
  "previewId": "batch_...",
  "operation": "BULK_ASSIGN",
  "mode": "STRICT",
  "actionIds": ["a1", "a2"],
  "payload": { "ownerId": "user123" },
  "idempotencyKey": "<UUID>"
}
```
Response:
```json
{
  "batchId": "batch_...",
  "operation": "BULK_ASSIGN",
  "status": "COMPLETED",
  "requested": 2,
  "executed": 2,
  "blocked": 0,
  "blockedReasons": [],
  "completedAt": "..."
}
```

### Batch History
```
GET /api/portfolio/operations/history
```
Returns paginated list of past batch operations for the authenticated user.

---

## 8. Files to Create / Modify

---

### New Schema Migration
#### [MODIFY] [`server/db.js`](file:///c:/Users/DELL/Downloads/Docu-Gaurd%20AI/Docu-Gaurd%20AI/server/db.js)
- Add `CREATE TABLE IF NOT EXISTS portfolio_operation_batches` and its indexes inside `initDb()`.

---

### New Service
#### [NEW] `server/services/bulkOperationsService.js`
- `previewBulkOperation(user, operation, mode, actionIds, payload)`:
  - Validates input, iterates action IDs, classifies each as eligible or blocked.
  - Creates a `portfolio_operation_batches` record with status `PREVIEWED`.
  - Returns `{ previewId, eligible, blocked, blockedReasons }`.
- `executeBulkOperation(user, previewId, operation, mode, actionIds, payload, idempotencyKey)`:
  - Checks idempotency key.
  - Opens a single `pg.client` transaction.
  - Re-validates each eligible action under `SELECT FOR UPDATE`.
  - Calls `isValidTransition()` from `actionWorkflowService.js` for status transitions.
  - Calls existing `assignActionOwner` / `updateActionDueDate` / `transitionActionStatus` logic (or re-implements in-transaction to avoid double-commit).
  - Inserts one `contract_action_activity` record per affected action.
  - Updates `portfolio_operation_batches` record to `COMPLETED`.
  - Returns complete batch result.
- `getBatchHistory(user, query)`:
  - Paginated read of `portfolio_operation_batches` for the user.

> [!IMPORTANT]
> The service must import `{ isValidTransition, WORKFLOW_STATES, ALLOWED_TRANSITIONS }` from `actionWorkflowService.js`. The transition matrix is the single source of truth.

---

### New Route
#### [NEW] `server/routes/portfolioOperations.js`
- `POST /preview` → `previewBulkOperation`
- `POST /execute` → `executeBulkOperation`
- `GET /history` → `getBatchHistory`
- All three protected by `requireAuth`.

---

### Mount Route
#### [MODIFY] [`server/index.js`](file:///c:/Users/DELL/Downloads/Docu-Gaurd%20AI/Docu-Gaurd%20AI/server/index.js)
- Mount `portfolioOperations` router at `/api/portfolio/operations`.

---

### Frontend Components

#### [NEW] `src/components/portfolio/BulkOperationToolbar.jsx`
- Multi-select checkbox controller for the Attention Queue.
- Shows count of selected actions.
- Dropdown for operation type (`Assign`, `Update Deadline`, `Transition Status`).
- Opens `BulkOperationModal`.

#### [NEW] `src/components/portfolio/BulkOperationModal.jsx`
- Step-by-step controlled flow:
  1. **Select Operation**: Choose `BULK_ASSIGN` / `BULK_DEADLINE` / `BULK_TRANSITION` + mode.
  2. **Pre-flight Preview**: Calls `/preview`, renders eligible vs blocked breakdown.
  3. **Confirm**: User explicitly acknowledges the impact.
  4. **Execute**: Calls `/execute`, shows progress spinner.
  5. **Receipt**: Displays immutable-style operation receipt with `batchId`, counts, timestamp.

#### [NEW] `src/services/portfolioOperationsApi.js`
- `previewBulkOperation(params)`, `executeBulkOperation(params)`, `getBatchHistory(query)`.

#### [MODIFY] `src/components/portfolio/PortfolioAttentionQueue.jsx`
- Add multi-select checkboxes to each row.
- Add select-all/clear controls.
- Wire selected action IDs to `BulkOperationToolbar`.

#### [MODIFY] `src/components/portfolio/PortfolioDashboard.jsx`
- Add `⚡ Bulk Operations` tab showing `BulkOperationToolbar` + history of past batches.

---

## 9. Verification Suite

**Target: 50 dedicated tests** covering:

| Category | Tests | Description |
|---|---|---|
| **Authentication & Gateway** | 1–4 | Unauthenticated, invalid JWT, authenticated preview, authenticated execute |
| **Input Validation** | 5–10 | Empty batch, batch > max size, invalid operation, invalid payload, invalid date, invalid target status |
| **Authorization** | 11–17 | Cross-user action IDs, mixed ownership batch (strict), pure cross-user batch (subset), invalid owner ID for BULK_ASSIGN |
| **Pre-flight Preview** | 18–24 | Correct eligible count, correct blocked count, correct reason codes, RESOLVED action blocked, DISMISSED action blocked, preview response shape |
| **Strict Mode Atomicity** | 25–28 | Mixed batch → 0 mutations in strict mode, DB state snapshot before/after confirms zero changes |
| **Validated-Subset Mode** | 29–33 | Mixed batch → only eligible mutated, blocked reported explicitly, DB state confirms only eligible rows changed |
| **Idempotency** | 34–38 | Same key submitted twice → second call returns original result, conflicting payload with same key rejected, FAILED batch allows retry |
| **State Transition Rules** | 39–42 | Valid transitions succeed, invalid transitions blocked with `INVALID_TRANSITION`, re-validation inside execute detects state change between preview and execute |
| **Audit Trail Correctness** | 43–47 | Per-action activity event generated, batch record created with correct counts, actor is correct user, previous/new state correct, `contract_action_decisions` entry correct |
| **Batch History** | 48–49 | GET /history returns user's batches, no cross-user leakage in history |
| **Security** | 50 | Static audit: no SQL write in portfolioAnalyticsService (read-only layer untouched) |

---

## 10. Open Questions for Review

> [!IMPORTANT]
> **Q1: Maximum batch size.** What is the maximum number of action IDs per batch? Recommended default: **100**. Reject with `BATCH_TOO_LARGE` if exceeded.

> [!IMPORTANT]
> **Q2: Pre-flight preview expiry.** Should a `previewId` expire (e.g., 10 minutes) to prevent stale executions? Or is re-validation on execute sufficient without a TTL? The recommended approach is **re-validation on execute is sufficient** since the server always re-reads state under a row lock.

> [!IMPORTANT]
> **Q3: Status transition payload requirements.** `RESOLVED` transitions require `resolutionNotes`. `DISMISSED` transitions require a `reason`. Should bulk `BULK_TRANSITION` to `RESOLVED` require a single shared `resolutionNotes` string for all affected actions, or per-action notes? **Recommended: single shared string**, since bulk resolution is an executive sweep operation. Individual notes can be added later through the single-action detail panel.

> [!IMPORTANT]
> **Q4: Notification dispatch on bulk operations.** The existing `actionWorkflowService.js` dispatches assignment and status-change notifications within single-action transactions. Should bulk operations dispatch individual notifications for each affected action, or emit a single batch-level notification summary? **Recommended: single batch-level notification** to avoid notification flooding.

> [!CAUTION]
> **Q5: Re-use of existing single-action service functions vs. inline implementation.** The single-action functions (`transitionActionStatus`, `assignActionOwner`, `updateActionDueDate`) each independently `BEGIN` and `COMMIT` their own transactions. They **cannot** be called from inside an outer bulk transaction. The bulk service must re-implement the mutation logic inline within a single shared transaction, importing only the validation primitives (`isValidTransition`, `WORKFLOW_STATES`).

---

## 11. What Phase 8.0 Explicitly Does NOT Include

To keep scope clean:
- No bulk decision (`BULK_DECISION`) in this phase. Decision-recording requires per-action reason text; bulk support will be considered in a future phase.
- No UI for per-action inline editing during bulk review.
- No cross-user delegation or team-based assignment beyond the current `owner_id` field.
- No external notification webhooks.
- No changes to the read-only portfolio analytics endpoints (7.8) or the compliance audit system (7.9).

---

## Verification Plan

### Automated Tests
```bash
python backend/tests/verify_phase8_0_bulk_operations.py
```
- 50 dedicated tests across 11 categories.
- Regression battery: all 244 prior tests must remain passing.

### Manual Verification
- Open Portfolio → Attention Queue → select multiple actions → open Bulk Ops modal.
- Perform preview and confirm that eligible/blocked breakdown renders correctly.
- Execute an assignment → confirm activity records appear in the action detail panel.
- Submit the same `Idempotency-Key` twice → confirm second response returns cached result.
- Open Portfolio → Bulk Operations tab → confirm batch history displays.
