# DocuGuard AI — Enterprise Integrations & Secure System Connectors

## 1. Overview & Architecture

Phase 14 equips DocuGuard AI with an enterprise-grade interoperability boundary, connecting internal contract governance to external document repositories, CRM/ERP systems, and webhook endpoints.

External systems connect via a **Canonical Normalization Boundary**:

```text
                    EXTERNAL ENTERPRISE SYSTEMS
                              │
                              ▼
                 ┌─────────────────────────┐
                 │   Integration Security  │
                 │   Auth / HMAC / RBAC    │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │  Canonical Integration  │
                 │   Normalization Layer   │
                 └────────────┬────────────┘
                              │
                         Idempotency
                              │
                              ▼
                 ┌─────────────────────────┐
                 │     DocuGuard Core      │
                 │                         │
                 │ Evidence                │
                 │ Decision Intelligence   │
                 │ Monitoring              │
                 │ Human Workflow          │
                 │ Governance              │
                 │ Action Center           │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Outbox / Event Gateway  │
                 │   Retry / DLQ / Audit   │
                 └────────────┬────────────┘
                              │
                              ▼
                    EXTERNAL SYSTEMS
```

---

## 2. Security & Zero-Trust Boundary

1. **Zero Secret Leakage:**
   - Secrets and API tokens are encrypted in PostgreSQL using **AES-256-GCM**.
   - Plaintext credentials are never exposed via GET/PATCH APIs or application logs.
   - References are masked as `sec_••••••••_{fingerprint}`.

2. **Webhook Verification (HMAC-SHA256):**
   - Webhooks must provide header `X-Hub-Signature-256` or `X-Signature`.
   - Expected signature: `HMAC_SHA256(secret, timestamp + "." + rawBody)`.
   - Verified using `crypto.timingSafeEqual` to eliminate timing attacks.

3. **Replay Defense Window:**
   - Timestamp must be within $\pm 300$ seconds (5 minutes) of server time.
   - Replayed `event_id` is matched against `integration_webhook_events` and returned idempotently without re-execution.

4. **Preservation of Legal Evidence:**
   - Structure validation protects against prototype pollution or JSON injection.
   - Contract text (`content_text`) is preserved **100% verbatim** without stripping punctuation or wording.

---

## 3. Canonical Schemas

### Canonical Document Schema
```json
{
  "source_system": "salesforce_crm",
  "external_object_id": "opp-contract-8491",
  "external_version": "2",
  "document_name": "Master Professional Services Agreement",
  "document_type": "contract",
  "content_text": "This Agreement is entered into...",
  "effective_date": "2026-01-01T00:00:00Z",
  "expiration_date": "2027-01-01T00:00:00Z",
  "metadata": {
    "account_id": "acc-9921",
    "annual_contract_value": 1500000
  }
}
```

### Canonical Event Schema
```json
{
  "event_id": "evt-77192",
  "event_type": "DOCUMENT_UPDATED",
  "source_system": "sharepoint",
  "external_object_id": "sp-file-330",
  "external_version": "3",
  "occurred_at": "2026-09-05T00:15:00Z",
  "metadata": {}
}
```

---

## 4. Idempotency & Version Conflict Protection

1. **Request Idempotency:**
   - Table `integration_idempotency_keys` enforces uniqueness on `(tenant_id, integration_id, idempotency_key)`.
2. **Object Identity Mapping:**
   - Table `integration_object_mappings` enforces uniqueness on `(tenant_id, integration_id, external_object_type, external_object_id)`.
3. **Version Handling:**
   - If $\text{external\_version} \le \text{known\_version}$: Skip without mutation (idempotent ignore).
   - If $\text{external\_version} > \text{known\_version}$: Controlled document update, triggers Phase 11 Continuous Monitoring and updates risk score.

---

## 5. Transactional Outbox Pattern

Outbound events are inserted transactionally into `integration_event_outbox`:
* **Statuses:** `PENDING` $\to$ `PROCESSING` $\to$ `DELIVERED` | `DEAD_LETTER`.
* **Retries:** Bounded exponential backoff ($5\text{s}, 15\text{s}, 45\text{s}, 135\text{s}, 300\text{s}$).
* **Max Attempts:** 5 attempts before routing to Dead-Letter Queue (DLQ).
* **DLQ Replay:** Administrators can replay dead-letter events through the UI or `POST /api/integrations/:id/events/retry`.

---

## 6. Supported Outbound Event Types

* `DOCUMENT_IMPORTED`
* `DOCUMENT_UPDATED`
* `RISK_CHANGED`
* `COMPLIANCE_STATUS_CHANGED`
* `POLICY_VIOLATION_DETECTED`
* `WORKFLOW_SUBMITTED`
* `WORKFLOW_APPROVED`
* `WORKFLOW_REJECTED`
* `ACTION_CREATED`
* `ACTION_COMPLETED`
* `EXCEPTION_REQUESTED`
* `EXCEPTION_APPROVED`
* `EXCEPTION_REJECTED`
* `EXCEPTION_EXPIRED`
