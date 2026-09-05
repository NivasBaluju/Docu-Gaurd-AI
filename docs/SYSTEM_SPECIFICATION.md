# DocuGuard AI — Complete Enterprise System Specification

---

## 1. System Inventory

* **Total Database Tables:** 50 relational base tables (28 primary domain orchestrators + 22 granular relational subsystem tables)
* **Database Migrations:** 13 applied migrations (tracked in `schema_migrations`)
* **API Endpoints:** 70+ authenticated REST endpoints across 15 router modules
* **Background Workers:** Outbox dispatcher, job runner, retention evaluator, monitoring scanner
* **Cryptographic Block Height:** 2,000+ cryptographically chained blocks in `blockchain_audit`

---

## 2. Complete Relational Database Schema Inventory (50 Tables)

The production PostgreSQL database contains **50 relational base tables** organized into 7 functional architectural tiers. Earlier summaries cataloged the **28 primary domain orchestrators**, while the remaining **22 tables** provide granular relational persistence for clauses, reviewers, threat telemetry, and subsystem details.

### Tier 1: Core Identity, Access & Threat Defense (6 tables)
| Table | Phase Introduced | Purpose |
| :--- | :--- | :--- |
| `users` | Phase 1 | Enterprise user accounts, hashed passwords, RBAC roles (Primary Domain Table) |
| `sessions` | Phase 1 | Active authenticated user sessions (Primary Domain Table) |
| `otp_codes` | Phase 8 | Multi-factor authentication (MFA) one-time passwords |
| `threat_logs` | Phase 8 | Automated security rate-limiting and brute-force detection |
| `activity_logs` | Phase 2 | User and administrator access telemetry |
| `share_links` | Phase 4 | Cryptographically signed, time-bounded document sharing links |

### Tier 2: Core Document Knowledge & Clause Granularity (8 tables)
| Table | Phase Introduced | Purpose |
| :--- | :--- | :--- |
| `documents` | Phase 1 | Base contract documents, file metadata, text (Primary Domain Table) |
| `document_segments` | Phase 3 | Chunked text segments for vector search / NLP extraction |
| `document_clauses` | Phase 3 | Extracted legal clauses, classifications, and benchmarks |
| `document_risk_factors` | Phase 3 | Granular breakdown of 9-dimension risk scoring vectors |
| `document_deadlines` | Phase 3 | Extracted critical renewal, expiration, and notice dates |
| `contract_intelligence` | Phase 10 | Authoritative contract intelligence synthesis |
| `generated_contracts` | Phase 5 | Generated contract drafts, templates, and addenda |
| `chat_messages` | Phase 6 | In-context contract assistant message history |

### Tier 3: Decision Intelligence, Simulation & Action Workflow (10 tables)
| Table | Phase Introduced | Purpose |
| :--- | :--- | :--- |
| `contract_decision_workflows` | Phase 10 | Decision intelligence, routing, escalation (Primary Domain Table) |
| `contract_decision_reviewers` | Phase 10 | Multi-reviewer assignments and required approver thresholds |
| `contract_decision_events` | Phase 10 | Historical timeline of workflow state transitions |
| `contract_decision_comments` | Phase 10 | Threaded collaborative review notes (Primary Domain Table) |
| `contract_actions` | Phase 2 | Human & automated contract workflow actions (Primary Domain Table) |
| `contract_action_decisions` | Phase 12 | Signoff / rejection decisions on individual actions |
| `contract_action_comments` | Phase 12 | Discussion threads on remediation actions |
| `contract_action_activity` | Phase 12 | Audit log of status changes on remediation actions |
| `contract_simulations` | Phase 10 | What-if counterfactual scenario analysis results |
| `contract_lifecycle_states` | Phase 10 | Stage mapping (Draft, Review, Executed, Active, Expired) |

### Tier 4: Continuous Monitoring, Telemetry & Alerts (3 tables)
| Table | Phase Introduced | Purpose |
| :--- | :--- | :--- |
| `contract_monitoring_events` | Phase 11 | Continuous obligations, renewals, deadlines (Primary Domain Table) |
| `contract_notifications` | Phase 11 | Priority notification delivery feed for operators |
| `ai_telemetry_logs` | Phase 9 | Token usage, inference latency, and microservice health metrics |

### Tier 5: Policy Compliance & Governance (5 tables)
| Table | Phase Introduced | Purpose |
| :--- | :--- | :--- |
| `contract_governance_policies` | Phase 13 | Organizational policy frameworks (Primary Domain Table) |
| `contract_governance_controls` | Phase 13 | Specific rules and clauses mapped to policies (Primary Domain Table) |
| `contract_compliance_evaluations` | Phase 13 | Audit runs assessing document conformance (Primary Domain Table) |
| `contract_compliance_findings` | Phase 13 | Specific violations, warnings, or passes (Primary Domain Table) |
| `contract_governance_exceptions` | Phase 13 | Time-bounded, authorized waivers (Primary Domain Table) |

### Tier 6: Enterprise Interoperability, Sync & Outbox (7 tables)
| Table | Phase Introduced | Purpose |
| :--- | :--- | :--- |
| `enterprise_integrations` | Phase 14 | External provider connection configs (Primary Domain Table) |
| `integration_config_versions` | Phase 14 | Versioned connector credentials and endpoint settings |
| `integration_sync_runs` | Phase 14 | Batch & real-time sync execution history (Primary Domain Table) |
| `integration_idempotency_keys` | Phase 14 | Inbound and outbound deduplication keys (Primary Domain Table) |
| `integration_object_mappings` | Phase 14 | DocuGuard ID to Salesforce/SAP/Jira ID mappings (Primary Domain Table) |
| `integration_webhook_events` | Phase 14 | Raw incoming webhook payloads and states (Primary Domain Table) |
| `integration_event_outbox` | Phase 14 | Durable transactional outbox for outbound calls (Primary Domain Table) |

### Tier 7: Enterprise Reliability, DR, Lifecycle & Schema (11 tables)
| Table | Phase Introduced | Purpose |
| :--- | :--- | :--- |
| `enterprise_backups` | Phase 15 | Backup catalog, checksums, restore history (Primary Domain Table) |
| `tenant_lifecycle_records` | Phase 15 | Tenant state machine history and transitions (Primary Domain Table) |
| `legal_holds` | Phase 15 | Legal hold matters, scopes, release timestamps (Primary Domain Table) |
| `retention_policies` | Phase 15 | Policy definitions for data retention schedules (Primary Domain Table) |
| `retention_execution_logs` | Phase 15 | Audit logs of retention previews and applies (Primary Domain Table) |
| `background_job_runs` | Phase 15 | Generic background job execution and retries (Primary Domain Table) |
| `admin_break_glass_logs` | Phase 15 | Emergency access authorization and audit trail (Primary Domain Table) |
| `enterprise_feature_flags` | Phase 15 | Tenant-scoped feature flags with overrides (Primary Domain Table) |
| `portfolio_operation_batches` | Phase 11 | Bulk portfolio action processing and migration tracking |
| `blockchain_audit` | Phase 2 | Immutable SHA-256 chained audit ledger (Primary Domain Table) |
| `schema_migrations` | Baseline | Versioned migration execution ledger (Primary Domain Table) |

