# DocuGuard AI — Enterprise Integration & Interoperability Guide

---

## 1. Overview & Integration Architecture

Phase 14 established the enterprise integration and interoperability layer. DocuGuard AI integrates with external systems via canonical adapters, durable transactional outbox delivery, and cryptographic webhook verification.

Supported Enterprise Connectors:
* **Salesforce:** Contract & Account synchronizer.
* **DocuSign:** E-signature status, envelope events, and completed document ingest.
* **SAP Ariba:** Procurement contract lifecycle and compliance alignment.
* **Jira:** Risk escalation tickets and compliance action tasks.
* **Custom Webhooks:** Generic HTTP push with HMAC-SHA256 signatures.

---

## 2. Transactional Outbox Pattern

To prevent loss of outbound notifications and avoid dual-write race conditions:
1. Business transactions write events to `integration_event_outbox` within the same PostgreSQL transaction that mutates application state.
2. Background dispatcher (`server/services/integrationOutboxWorker.js`) polls pending outbox entries.
3. Deliveries use bounded exponential backoff with jitter.
4. Exceeded attempts transition events to `DEAD_LETTER` status for operator inspection.

---

## 3. Inbound Webhook Idempotency & Verification

* Inbound webhooks must supply an `X-DocuGuard-Idempotency-Key` or provider event ID.
* Duplicate events are recognized by `integration_idempotency_keys` and returned HTTP 200 without reprocessing.
* External payload signatures are verified against HMAC keys stored in the Credential Vault.
