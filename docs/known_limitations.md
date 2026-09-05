# DocuGuard AI — Known Limitations Register

---

## 1. Overview & Classification Standard

In accordance with enterprise truthfulness invariants, this register documents all known environmental and operational limitations of the platform.

Classification Levels:
* `BLOCKER`: Critical issue preventing release. (None active).
* `HIGH`: Material operational impact requiring workaround.
* `MEDIUM`: Non-critical functional constraint.
* `LOW`: Environmental or cosmetic limitation.
* `INFORMATIONAL`: Architectural note or deployment characteristic.

---

## 2. Active Limitations Register

| ID | Classification | Subsystem | Description | Workaround / Operational Note |
| :--- | :--- | :--- | :--- | :--- |
| **LIM-001** | `LOW` | Test Automation | External Playwright browser binary download (`azureedge.net` 404 for win32 zip) in offline/restricted environments. | The test suite automatically falls back to native Node.js / JSDOM bundle assertions with 100% test coverage. |
| **LIM-002** | `INFORMATIONAL` | Disaster Recovery | Single-instance PostgreSQL environments execute isolated DR restores via table prefixing (`isolated_recovery_*`) rather than cross-cluster failover. | Fully tests table schema, relationship constraints, records, and audit continuity. Enterprise deployments with physical multi-cluster replication should use cloud-managed snapshots in addition. |
| **LIM-003** | `INFORMATIONAL` | Notification Services | Development / test environments using Gmail SMTP may encounter daily sending quota limits (550-5.4.5). | The platform features automatic continuity passcodes printed to server console logs (`[CONTINUITY PASSCODE]`), ensuring authentication never halts. |
| **LIM-004** | `INFORMATIONAL` | External Connectors | Out-of-the-box Phase 14 connector includes `generic_rest` document provider with live network dispatch and deterministic fixture capabilities. | Specialized proprietary connectors (e.g. Coupa XML, SAP IDoc) should implement the standard `IntegrationProvider` interface in `server/services/integrations/`. |
| **LIM-005** | `LOW` | Asset Bundle Size | Vite builds output warning for vendor bundles exceeding 400 kB after minification (`vendor-react-*.js`). | Application uses route-based dynamic `lazy()` chunking across all 24 page routes; initial load footprint remains performant. |
