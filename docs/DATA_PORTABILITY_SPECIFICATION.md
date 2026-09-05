# DocuGuard AI — Enterprise Data Portability Specification

---

## 1. Specification Overview

This document specifies the format, integrity rules, secret-scrubbing standards, and referential-integrity guarantees for tenant data export and import within DocuGuard AI (`server/services/dataExportService.js`, `server/services/dataImportService.js`).

---

## 2. Export Package Format

Tenant exports are emitted as standalone, self-describing JSON packages:

```json
{
  "version": "1.0.0-phase15.enterprise",
  "exported_at": "2026-09-05T01:15:00.000Z",
  "tenant_id": "uuid-here",
  "metadata": {
    "total_records": 154,
    "included_entities": [
      "documents",
      "contract_decision_workflows",
      "contract_monitoring_events",
      "contract_governance_policies",
      "contract_compliance_findings"
    ]
  },
  "data": {
    "documents": [...],
    "workflows": [...],
    "events": [...],
    "policies": [...],
    "findings": [...]
  },
  "checksum": "sha256-hex-digest"
}
```

---

## 3. Secret Exclusion & Scrubbing Rules

To prevent credential leakage during portability operations:
* The Credential Vault and export serializer explicitly exclude:
  * Passwords and password hashes (`password_hash`, `salt`)
  * Integration client secrets and API keys (`client_secret`, `api_key`, `token`)
  * Master encryption keys (`ENCRYPTION_KEY`, `JWT_SECRET`)
* Non-sensitive integration configurations (provider names, endpoints, sync cadences) are exported with sanitized credentials.

---

## 4. Import Workflow & Referential Validation

The import process enforces a strict multi-step safety pipeline:

1. **Format & Checksum Validation:** Recomputes SHA-256 hash over payload and validates schema compatibility.
2. **Dry-Run Inspection:** Evaluates incoming entities against existing tenant records to detect ID collisions and duplicate documents.
3. **Legal Hold Check:** If the target tenant or documents are under active legal hold, conflicting overwrite imports are rejected.
4. **Referential Integrity Enforcement:** Foreign keys (e.g. `workflow.document_id`, `finding.evaluation_id`) must resolve to valid parent objects within the export bundle or existing database.
5. **Atomic Commit:** Live imports execute within an atomic PostgreSQL transaction. If any entity fails validation, the entire transaction rolls back cleanly.
6. **Audit Registration:** Emits `DATA_IMPORTED` event to `blockchain_audit`.
