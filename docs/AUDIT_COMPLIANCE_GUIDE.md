# Deciva — Audit & Regulatory Compliance Guide

---

## 1. Compliance Architecture & Framework Alignment

Deciva provides enterprise contract compliance alignment across major regulatory frameworks:
* **GDPR (General Data Protection Regulation):** Right to be forgotten, data portability, data minimization, consent tracking.
* **SOC 2 Type II:** Security, availability, processing integrity, confidentiality, and privacy trust principles.
* **ISO 27001:** Information security management and cryptographic controls.
* **HIPAA:** Business Associate Agreement (BAA) contract clause validation and access logging.

---

## 2. Cryptographic Audit Trail Architecture

Every critical business event is logged to the immutable `blockchain_audit` ledger:
* **Contract Actions:** Upload, classification, risk scoring, clause approval, redlining, signature.
* **Governance Actions:** Policy creation, control evaluation, exception granting, violation escalation.
* **Integration Actions:** Synchronizations, external webhook ingest, outbox delivery, DLQ transitions.
* **Administrative Actions:** Backup creation, test restore, tenant state changes, retention runs, break-glass sessions.

### Continuous Verification
The integrity of the ledger is mathematically verifiable:
```javascript
const { verifyChain } = require('./server/utils/audit');
const result = await verifyChain();
// returns { valid: true, totalBlocks: 1888+, problems: [] }
```

---

## 3. Legal Hold Invariant

* A legal hold created under `legal_holds` immediately locks the target documents, workflows, evaluations, and audit logs.
* Tenant deletion requests and automated retention purges are blocked from modifying or purging any asset subject to an active legal hold.
