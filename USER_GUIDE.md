# Deciva — Comprehensive Platform User Guide & Operational Manual

> **Version:** 1.0.0 Enterprise Production  
> **Classification:** Operational Manual & User Reference  
> **Target Audience:** Legal Counsel, Compliance Officers, Procurement Teams, Contract Administrators, Business Executives, and System Auditors

---

## Table of Contents

1. [Executive Overview & Platform Purpose](#1-executive-overview--platform-purpose)
2. [Quickstart: Up & Running in 60 Seconds](#2-quickstart-up--running-in-60-seconds)
3. [Authentication, Identity & Multi-Factor Access](#3-authentication-identity--multi-factor-access)
4. [The Executive Command Bridge (Dashboard)](#4-the-executive-command-bridge-dashboard)
   - [Metrics & Indicators Explained](#dashboard-metrics--indicators)
   - [Buttons & Navigation Links](#dashboard-buttons--links)
5. [The Document Intake Chamber (Upload & Ingestion)](#5-the-document-intake-chamber-upload--ingestion)
   - [Step-by-Step Upload Instructions](#step-by-step-upload-instructions)
   - [Ingestion Lifecycle & Progress Milestones](#ingestion-lifecycle--milestones)
   - [Post-Upload Confirmation Screen](#post-upload-confirmation-screen)
6. [The Document Workspace: Pin-to-Pin Breakdown of Every Tab](#6-the-document-workspace-pin-to-pin-breakdown-of-every-tab)
   - [Top Action Bar & Status Badges](#workspace-top-bar)
   - [Tab 01: Overview](#tab-01-overview)
   - [Tab 02: Clauses (Structural Decomposition)](#tab-02-clauses)
   - [Tab 03: Risk Radar (9-Dimensional Scoring)](#tab-03-risk-radar)
   - [Tab 04: Compliance (Statutory Precedents)](#tab-04-compliance)
   - [Tab 05: Deadlines & Milestone Calendar](#tab-05-deadlines)
   - [Tab 06: AI Legal Chat (RAG Assistant)](#tab-06-chat)
   - [Tab 07: Negotiation & Bilateral Redlining](#tab-07-negotiation)
   - [Tab 08: Simulation (What-If Scenario Engine)](#tab-08-simulation)
   - [Tab 09: Decision Intelligence (🧠 Exposure Matrix)](#tab-09-decision-intelligence)
   - [Tab 10: Approvals & Human Workflows (🤝)](#tab-10-approvals)
   - [Tab 11: Policy Governance (📜 Exceptions & Controls)](#tab-11-policy-governance)
   - [Tab 12: Action Center (⚡ Remediation Queue)](#tab-12-action-center)
   - [Tab 13: Audit & Certified Evidence Export (🛡️)](#tab-13-audit-export)
   - [Tab 14: PII Scanner & Automated Redactor](#tab-14-pii-redactor)
   - [Tab 15: Expirable Share Links](#tab-15-share-links)
7. [The Contract Generator (Drafting & Cryptographic Signing)](#7-the-contract-generator-drafting--cryptographic-signing)
8. [The Portfolio Management Hub (Surveillance & Bulk Operations)](#8-the-portfolio-management-hub)
   - [Continuous Monitoring Stream](#monitoring-stream)
   - [Contract Health & Risk Rankings](#health-risk-rankings)
   - [Attention & Deadlines Queue](#attention-queue)
   - [Governed Approvals & Controlled Bulk Operations](#governed-bulk-operations)
   - [Compliance & Business ROI Analytics](#compliance-roi)
9. [The Zero-Trust Security Center & Observatory](#9-the-zero-trust-security-center--observatory)
   - [Radial Observatory Instrument](#radial-observatory)
   - [Cryptographic Merkle Ledger Explorer](#merkle-ledger-explorer)
   - [Session Management & Remote Revocation](#session-management)
   - [Threat Breakdown & Geographical Telemetry](#threat-breakdown)
10. [Enterprise Integrations Console](#10-enterprise-integrations-console)
11. [Enterprise Operations & Disaster Recovery (Admin Console)](#11-enterprise-operations--disaster-recovery)
12. [Master Metrics, Badges, and Status Glossary](#12-master-metrics-badges-and-status-glossary)
13. [Button, Icon & Action Quick Reference Sheet](#13-button-icon--action-quick-reference-sheet)

---

## 1. Executive Overview & Platform Purpose

**Deciva** is an enterprise-grade AI legal copilot, contract lifecycle governance system, and zero-trust security observatory. It is designed to solve the critical challenges that organizations face when handling commercial contracts, NDAs, Master Service Agreements (MSAs), indentures, and vendor agreements:

- **Unquantified Risk:** Uncapped indemnities, ambiguous termination windows, and lopsided liabilities buried deep inside 100-page agreements.
- **Surprise Auto-Renewals:** Missing statutory opt-out deadlines (e.g. 60-day written notice before annual rollover) that lock companies into unwanted multimillion-dollar commitments.
- **LLM Data Bleed:** Generic chatbot tools leaking proprietary client legal agreements into public AI training sets. Deciva uses hardware-isolated ephemeral memory chambers with strict zero-retention guarantees.
- **Tampering & Repudiation:** Disputed changes or unauthorized contract modifications. Deciva anchors every document, redline, and administrative decision to an immutable, chained SHA-256 cryptographic audit ledger.

---

## 2. Quickstart: Up & Running in 60 Seconds

Follow this operational flow to test and master the platform immediately:

```text
[1. Sign In] ──► [2. Deposit Contract] ──► [3. Automated Analysis] ──► [4. Redline & Negotiate] ──► [5. Governed Signoff]
    │                     │                          │                          │                          │
  Login / MFA       Upload PDF / DOCX           9-D Risk Radar            Side-by-Side Diff         Dual Administrative
 Authenticator      Compute SHA-256            Clause Checklist            BATNA Modeling              Audit Anchoring
```

1. **Navigate to the Application:** Open your browser to `http://localhost:5000` (or your deployed URL e.g., `https://deciva-ai.vercel.app`).
2. **Access Your Account:** Click **Login** in the top navigation bar. If testing locally, sign in with your enterprise credentials, or register a new user via **Register**.
3. **Go to Ingestion Chamber:** Click **Intake Chamber** or **Upload** in the navigation header.
4. **Deposit a Document:** Drag-and-drop a sample contract (PDF, DOCX, or TXT) into the intake surface. The system will automatically compute the SHA-256 cryptographic hash, extract clauses, and index risks.
5. **Open Document Workspace:** Once processing completes, click **Open Document Workspace** to inspect all 15 analytical tabs.
6. **Simulate or Redline:** Navigate to the **Negotiation** tab to view AI-generated compromise language, or the **Simulation** tab to test what happens if a party defaults.

---

## 3. Authentication, Identity & Multi-Factor Access

Deciva enforces strict, identity-grounded zero-trust access controls.

### 3.1 Registering an Account (`/register`)
- **Fields:**
  - `Full Name`: Your display identity across all decision and approval timelines.
  - `Work Email Address`: Serves as your unique tenant identifier.
  - `Password`: Minimum 8 characters. Hashed using salt-hardened cryptographic algorithms (`bcrypt`/`argon2`).
- **Button: "Create Enterprise Account"**
  - Submits the form, provisions your user row in the database, establishes an initial zero-trust trust score of 100, and immediately redirects you to the login chamber.

### 3.2 Logging In (`/login`)
- **Fields:** Email and Password.
- **Button: "Authorize Session"**
  - Authenticates credentials against the PostgreSQL store.
  - Issues a cryptographically signed JSON Web Token (`JWT`) delivered via `httpOnly` secure cookies or bearer authorization headers.
  - If Multi-Factor Authentication (`MFA`) is enabled on your account, you will be redirected to the MFA verification chamber (`/mfa`).

### 3.3 Multi-Factor Authentication Setup (`/security/mfa-setup`)
- **How to activate:** Go to **Security Center** (`/security`) and click **Configure Hardware MFA** or navigate directly to `/security/mfa-setup`.
- **The QR Code:** Scan the rendered QR code with any RFC 6238 compliant authenticator (Google Authenticator, Microsoft Authenticator, Authy, 1Password).
- **Manual Secret Key:** If camera scanning is unavailable, copy the 32-character base32 secret displayed below the QR code into your authenticator app.
- **Verification Input:** Enter the 6-digit time-based one-time passcode (`TOTP`) generated by your app.
- **Button: "Verify & Lock Enclave"**
  - Validates the code against the server's time window.
  - Activates `mfa_enabled = true` on your account profile.
  - Boosts your session's zero-trust trust score to 100%.

---

## 4. The Executive Command Bridge (Dashboard)

The **Dashboard** (`/dashboard`) serves as the chief legal and operational command center. It gives legal counsel and executives an immediate, birds-eye view of portfolio exposure, pending signoffs, and audit ledger integrity.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   EXECUTIVE COMMAND BRIDGE (/dashboard)                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ALERT] Governed Operations: 2 Batches Awaiting Dual Signoff ──► [Review & Sign Batches Button]         │
├───────────────────────────────┬────────────────────────────────────────┬────────────────────────────────┤
│   PORTFOLIO HEALTH INDEX      │      RECENT CONTRACT EXAMINATIONS      │  CRYPTOGRAPHIC NON-REPUDIATION │
│                               │                                        │                                │
│           88.4 / 100          │ • Enterprise MSA v3 (Analyzed)         │ • Ledger Blocks: 42 Verified   │
│                               │ • Cloud Provider SLA (Analyzed)        │ • Chain Integrity: UNBROKEN    │
│  - Critical Risks:     -4.2   │ • Vendor NDA Mutual (Processing)       │ • Session Key: USR-9a1b2c...   │
│  - SLA Breaches:       -3.4   │                                        │                                │
│  - Contracts Audited:  14 Docs│ [View All Contracts (14) →]            │ [Verify Audit Ledger Blocks →] │
└───────────────────────────────┴────────────────────────────────────────┴────────────────────────────────┘
```

<a id="dashboard-metrics--indicators"></a>
### 4.1 Metrics & Indicators Explained

| Metric / Widget | Location | What It Means | Ideal Value | How It Is Calculated |
| :--- | :--- | :--- | :--- | :--- |
| **Portfolio Health Index** | Top Left Card | Overall composite health of all contracts across your organization. | `90.0 - 100.0` | Starts at `100.0`. Decrements dynamically: `-2.1` for each critical risk exposure; `-1.7` for each overdue deadline/SLA breach. |
| **Critical Risk Exposures** | Health Card Provenance | Number of unresolved high-severity vulnerabilities across active contracts. | `0` | Sum of all actions with `priority_score >= 80` or clauses with uncapped liabilities. |
| **Imminent SLA Breaches** | Health Card Provenance | Active contracts with opt-out or notice windows expiring in $< 30$ days. | `0` | Calculated from `contract_lifecycle_states` where `notice_deadline <= NOW() + 30 days`. |
| **Governed Operations Banner** | Full-width Alert | High-value batch operations queued up that require a secondary admin signature. | `0 Pending` | Queries `portfolio_operation_batches` where `requires_approval = true` and `approved_by IS NULL`. |
| **Ledger Blocks Verified** | Security Card | Total number of cryptographic blocks currently chained in the audit trail. | Incrementing integer | Count of rows in `blockchain_audit`. Every upload, edit, redline, or signoff adds 1 block. |
| **Chain Integrity Status** | Security Card | Whether the SHA-256 hash pointer chain has been tampered with. | `UNBROKEN (100%)` | Live verification of every block's `prev_hash` against the prior block's `hash`. |

<a id="dashboard-buttons--links"></a>
### 4.2 Buttons & Navigation Links

- **Button: "Review & Sign Batches"**  
  *Triggers:* Navigates directly to `/portfolio?tab=operations` to inspect queued bulk actions (e.g. bulk-archiving or mass risk-reclassification) and provide secondary administrative approval.
- **Link: "Inspect health decomposition →"**  
  *Triggers:* Jumps to the **Portfolio Dashboard** (`/portfolio`), opening the detailed contract risk matrix.
- **Link: "View all contracts (N) →"**  
  *Triggers:* Opens the **Document Repository** (`/documents`), allowing you to filter, sort, and search all uploaded agreements.
- **Link: "Verify audit ledger blocks →"**  
  *Triggers:* Opens the **Security Observatory** (`/security`), initiating a cryptographic traversal of the blockchain audit ledger.

---

## 5. The Document Intake Chamber (Upload & Ingestion)

The **Intake Chamber** (`/upload`) is the front door for bringing contracts into the Deciva intelligence and compliance engine.

<a id="step-by-step-upload-instructions"></a>
### 5.1 Step-by-Step Upload Instructions

1. **Navigate to the Upload Page:** Click **Intake Chamber** in the top navigation or go to `#/upload`.
2. **Select Your Document:**
   - **Method A (Drag & Drop):** Drag a supported document file from your computer's file explorer and drop it into the large dashed rectangular chamber. The border will illuminate to confirm drag detection.
   - **Method B (File Browser):** Click anywhere inside the deposit zone to open your operating system's native file picker. Select the file and click **Open**.
3. **Supported Formats:**
   - `.pdf` (Portable Document Format — searchable digital text and scanned exhibits)
   - `.docx` (Microsoft Word 2007+ document structure)
   - `.txt` (Plain UTF-8 text documents)
   - *Size Boundary:* Maximum file size is **25 Megabytes (MB)** per upload.

<a id="ingestion-lifecycle--milestones"></a>
### 5.2 Ingestion Lifecycle & Progress Milestones

While uploading, the animated **ThinkingLoader** displays real-time execution phases:

```text
[Phase 1: 0ms] ──► Computing SHA-256 digest & securing memory chamber...
                   (Generates cryptographic fingerprint; encrypts file buffer with AES-256-GCM)
                         ↓
[Phase 2: 600ms] ──► Extracting structural clauses & legal covenants...
                   (PyMuPDF vector extraction; mammoth DOCX parsing; token boundary segmentation)
                         ↓
[Phase 3: 1200ms] ──► Evaluating liability deviation & corporate risk baselines...
                   (9-dimension risk scoring; statutory rule cross-referencing; audit block anchoring)
```

<a id="post-upload-confirmation-screen"></a>
### 5.3 Post-Upload Confirmation Screen

Once examination completes, the screen transforms into an **Examination Receipt**:

- **Document Title:** The original filename as registered.
- **SHA-256 Digest Badge:** A 64-character hexadecimal string representing the cryptographic hash of the raw bytes (e.g., `8f4b23c9...`). This proves the exact state of the document at intake.
- **Clauses Extracted:** Number of core clauses discovered (e.g., `12 Clauses Indexed`).
- **Primary Button: "Open Document Workspace"**  
  *Triggers:* Immediately navigates you into the 15-tab analytical command center for this specific document (`/document/:id`).
- **Secondary Button: "Deposit Another Document"**  
  *Triggers:* Resets the intake chamber so you can upload additional exhibits or contracts.

---

## 6. The Document Workspace: Pin-to-Pin Breakdown of Every Tab

The **Document Workspace** (`/document/:id`) is the core operational cockpit for deep legal analysis.

<a id="workspace-top-bar"></a>
### 6.1 Top Action Bar & Status Badges

At the top of the workspace, you will find document metadata and global actions:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Master Cloud Services Agreement.pdf   [✓ Analyzed]                                                      │
│ SHA-256: 3a9f8e4b... • Size: 245 KB • OCR Confidence: 99.4% • Risk: 42/100 (MEDIUM)                    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Re-run Analysis Button]  [Verify Integrity Button]  [Export Redline Dropdown]  [Delete Document]     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Badges:**
  - `✓ Analyzed` (Green): Full structural and risk intelligence analysis has completed.
  - `Processing…` (Amber Pulsing Dot): Engine is actively parsing text, extracting embeddings, or executing RAG indexing.
  - `⚠ Analysis Failed` (Red): Document could not be processed (e.g. password-protected PDF or corrupted stream).
- **Global Buttons:**
  - **Button: "Re-run Analysis"** — Clears stale cached analysis and re-executes the 9-dimensional scoring and statutory check.
  - **Button: "Verify Integrity"** — Recalculates the SHA-256 hash of the on-disk encrypted file and validates it against the initial intake ledger. Displays a toast notification: `✓ Cryptographic match — SHA-256 integrity verified`.
  - **Button: "Export Redline"** — Generates a downloadable Microsoft Word `.docx` file complete with track-changes redlines reflecting negotiated clause revisions.
  - **Button: "Delete / Purge"** — Prompts for confirmation and permanently removes the document, its vector indexes, and file payloads, while appending an immutable deletion tombstone to the cryptographic audit ledger.

---

### Tab 01: Overview

**Purpose:** Executive summary and contract vital signs.

- **What You See:**
  - **Executive Summary Box:** A concise, plain-English summary of what the agreement governs, the contracting parties, effective date, and primary operational obligations.
  - **Vital Statistics Grid:**
    - `Document ID`: Unique UUIDv4 assigned during intake.
    - `File Size`: Formatted in KB or MB.
    - `OCR Confidence Score`: Percentage (e.g. `99.4%`). Indicates text extraction quality. Values below `80%` indicate low-resolution scanned imagery.
    - `Risk Posture`: Composite score out of 100 and risk category (`LOW`, `MEDIUM`, `HIGH`).
- **Interactive Buttons:**
  - **"Jump to High-Risk Items"** — Switches active tab directly to Tab 03 (Risk Radar).
  - **"View Milestone Calendar"** — Switches active tab directly to Tab 05 (Deadlines).

---

<a id="tab-02-clauses"></a>
### Tab 02: Clauses (Structural Decomposition)

**Purpose:** Indexes, classifies, and checks every individual legal covenant against standard corporate governance baselines.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  CLAUSE TYPE          STATUS         CONFIDENCE    EXTRACTED SNIPPET                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Confidentiality      [CONFIRMED]      98%         "Receiving Party shall hold..."     │
│  Termination          [CONFIRMED]      94%         "Either party may terminate upon..."│
│  Indemnity Caps       [UNRESOLVED]     89%         "Supplier shall indemnify without..."│
│  Governing Law        [CONFIRMED]      99%         "Governed by the laws of Delaware"  │
│  Non-Solicitation     [MISSING]        0%          [Statutory baseline missing]        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Metrics & Elements:**
  - **Checklist Score (e.g., `85%`):** The percentage of standard commercial covenants detected in this contract. If a standard contract type is missing a critical clause (such as a Dispute Resolution or Limitation of Liability clause), the checklist score drops.
  - **Clause Type Labels:** Confidentiality, Termination, Payment Terms, Intellectual Property, Liability & Indemnification, Governing Law, Jurisdiction, Parties, Key Dates.
  - **Status Badges:**
    - `[CONFIRMED]` (Green): Clause is explicitly present and conforms to standard legal phrasing.
    - `[UNRESOLVED]` (Amber): Clause was identified but contains language that deviates from safe corporate baselines.
    - `[MISSING]` (Red): Standard required covenant was not found anywhere in the text.
  - **Confidence Bar (e.g., `94%`):** Statistical probability from the NLP model that the identified block correctly matches the designated clause archetype.
- **Interactive Controls:**
  - **Search / Filter Input:** Type keywords (e.g., `indemnity`, `cure`, `arbitration`) to immediately filter the clause table.
  - **Button: "Copy Clause Snippet"** (Clipboard icon): Copies the verbatim contract excerpt to your clipboard.
  - **Button: "Send to Negotiation"** — Transfers the selected clause text into the redline editor in Tab 07.

---

<a id="tab-03-risk-radar"></a>
### Tab 03: Risk Radar (9-Dimensional Scoring)

**Purpose:** Quantifies legal, financial, and operational exposure across 9 deterministic dimensions.

- **The 9 Evaluation Dimensions:**
  1. `Financial Exposure`: Uncapped liabilities, liquidated damages, aggressive penalty clauses.
  2. `Indemnity & Defense`: Broad third-party defense obligations without reciprocal protection.
  3. `Termination & Lock-in`: Asymmetric exit rights, auto-renewal traps, absence of termination for convenience.
  4. `Intellectual Property (IP)`: Inadvertent assignment of background IP or proprietary work product.
  5. `Data Protection & GDPR`: Sub-processor liabilities, mandatory notification windows ($< 72$ hours), cross-border transfers.
  6. `Non-Solicit & Restrictive Covenants`: Overly broad employee or customer non-compete periods ($> 24$ months).
  7. `Governing Law & Forum`: Foreign jurisdictions, unpredictable courts, or disadvantageous arbitration rules.
  8. `Warranty & Disclaimer`: Disclaimers of standard fitness for purpose or UCC implied warranties.
  9. `Operational Milestones & SLAs`: Strict performance metrics tied to onerous financial penalties.
- **Risk Score Breakdown:**
  - `0 - 29 (LOW / Green)`: Standard commercial agreement with reciprocal terms and reasonable caps.
  - `30 - 59 (MEDIUM / Amber)`: Contains one or more unbalanced clauses that warrant redlining.
  - `60 - 100 (HIGH / Red)`: Serious contractual peril. Includes uncapped indemnity, unilateral termination, or severe liability shifts.
- **Risk Factor Cards:**
  - Each card details:
    - `Risk Type`: The offending legal category.
    - `Severity Badge`: `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
    - `Risk Points Added`: How many points this specific flaw contributed to the composite score (e.g. `+25 pts`).
    - `Reasoning`: Plain-English explanation of why this provision is hazardous.
    - `Source Quote`: Verbatim sentence from the contract triggering the flag.

---

<a id="tab-04-compliance"></a>
### Tab 04: Compliance (Statutory Precedents)

**Purpose:** Cross-checks contractual terms against active statutory frameworks and judicial precedents.

- **Statutory Frameworks Audited:**
  - **Delaware Chancery Court Precedents:** Evaluates whether limitation of liability provisions, waiver of consequential damages, and corporate merger covenants adhere to Delaware commercial law standards.
  - **UCC Article 2 (Uniform Commercial Code):** Tests warranties of merchantability, disclaimers, and express delivery remedy provisions.
  - **EU GDPR Article 28:** Verifies mandatory data processor terms: sub-processor authorization, data subject rights assistance, security audits, and deletion upon contract conclusion.
  - **English Common Law Standards:** Scrutinizes penalty clauses vs legitimate liquidated damages tests (the *Cavendish / Makdessi* precedent).
- **Controls & Output:**
  - **Compliance Badge:** `PASS`, `PARTIAL_COMPLIANCE`, or `NON_COMPLIANT`.
  - **Statutory Guidance Drawer:** Click any statutory card to view legal citations and recommended standard amendment language.

---

<a id="tab-05-deadlines"></a>
### Tab 05: Deadlines & Milestone Calendar

**Purpose:** Prevents surprise renewals, SLA penalties, and missed notice windows.

- **Milestone Types Extracted:**
  - `Renewal Opt-Out Notice`: The mandatory window to notify the counterparty that you do not intend to auto-renew.
  - `Cure Period`: Days permitted to remedy an alleged breach (e.g., 30 days written notice) before termination can be effected.
  - `Payment Due Date`: Net 30, Net 60, or Milestone-linked payment disbursements.
  - `Deliverable Milestones`: Agreed project completion dates.
- **Key Indicators:**
  - **Deadline Date:** Specific calendar date (e.g., `2026-11-15`) or Relative Trigger (e.g., `60 days prior to anniversary`).
  - **Countdown Timer:** Number of days remaining (e.g., `Expires in 42 days`). Highlights in red if $< 30$ days remain.
- **Buttons:**
  - **"Add to Executive Attention Queue"** — Escalates this milestone into the portfolio-level triage queue.

---

<a id="tab-06-chat"></a>
### Tab 06: AI Legal Chat (RAG Assistant)

**Purpose:** Allows you to interrogate the agreement using plain English questions, backed by a strict Retrieval-Augmented Generation (`RAG`) engine.

- **How to Use:**
  1. Click the text box at the bottom: *"Ask anything about this agreement (e.g., What are our termination notice requirements?)"*.
  2. Type your question and click the **Send Button** (or press Enter).
- **The Grounding Verification Guarantee:**
  - The model **only** answers using facts contained within the uploaded contract.
  - **Citation Chips:** Below every AI answer, the system displays grounded source badges (e.g., `Page 4, Clause 8.2`).
  - **Confidence Metric:** Displays an answer reliability score (e.g., `Grounded: 98% Confidence`).
  - **Zero Hallucination Mode:** If the contract does not mention the topic (e.g., "Does this contract allow hiring subcontractors?"), the engine will explicitly respond: *"This document contains no provisions regarding subcontracting rights"* rather than making up an answer.

---

<a id="tab-07-negotiation"></a>
### Tab 07: Negotiation & Bilateral Redlining

**Purpose:** Calculates counterparty concession probabilities and generates surgical, compromise redlines.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  NEGOTIATION STRATEGY: [Balanced Compromise]                                           │
│  Counterparty Concession Probability: 78% (BATNA Leverage: HIGH)                       │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│  ORIGINAL CONTRACT TEXT                   │  SUGGESTED REVISION (REDLINE)              │
│                                           │                                            │
│  "Supplier's aggregate liability shall be │  "Supplier's aggregate liability shall be  │
│  limited to $1,000."                      │  limited to [- $1,000 -] {+ the total fees │
│                                           │  paid in the preceding 12 months. +}"      │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│  [Adopt Revision]   [Export DOCX Redline]   [Mode: Protective / Aggressive / Balanced]  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **The 4 Negotiation Modes:**
  1. `Balanced (Default)`: Fair, bilateral compromise language likely to be accepted without executive escalation.
  2. `Protective`: Heavily favors your organization; inserts strict liability ceilings, mandatory notice cure periods, and broad indemnification in your favor.
  3. `Aggressive`: Maximizes commercial leverage; removes counterparty remedy rights and demands immediate termination-at-will provisions.
  4. `Collaborative`: Soft, commercial phrasing designed to preserve vendor relationships while closing statutory legal loopholes.
- **BATNA & Concession Metrics:**
  - `Concession Probability (e.g. 78%)`: Statistical estimate of whether an average commercial legal department will accept the proposed redline without pushing back.
  - `BATNA Leverage`: Best Alternative to a Negotiated Agreement rating (`HIGH`, `MEDIUM`, `LOW`).
- **Interactive Controls:**
  - **Button: "Adopt Revision"** — Replaces the clause text in the working memory session.
  - **Button: "Export DOCX Redline"** — Downloads a formatted Microsoft Word document with track-changes enabled.

---

<a id="tab-08-simulation"></a>
### Tab 08: Simulation (What-If Scenario Engine)

**Purpose:** Runs predictive stress-tests on your contract against hypothetical real-world crises.

- **Pre-set Scenario Quick-Buttons:**
  - *"Counterparty delays delivery by 45 days due to supply chain disruption."*
  - *"Customer terminates agreement early for convenience without cause."*
  - *"Sub-processor suffers an unencrypted ransomware data breach."*
  - *"Force majeure declared due to regional power grid failure."*
- **Custom Scenario Bar:** Type any custom scenario into the input field and click **"Run Simulation"**.
- **What the Engine Outputs:**
  - `Risk Level Assessment`: `HIGH`, `MEDIUM`, or `LOW`.
  - `Potential Commercial Impact`: Detailed assessment of financial exposure and breach liabilities.
  - `Consequence Pathways`: Step-by-step chain reaction of what clauses trigger first (e.g. Notice of Default $\rightarrow$ 30-Day Cure Period $\rightarrow$ Liquidated Damages Assessment).
  - `Recommended Action Steps`: Clear procedural checklist for your legal and procurement team.

---

<a id="tab-09-decision-intelligence"></a>
### Tab 09: Decision Intelligence (🧠 Exposure Matrix)

**Purpose:** Provides deterministic executive decision trees and identifies multi-clause contractual conflicts.

- **Key Panels:**
  - **Primary Exposure Driver:** The single provision contributing the most risk to this contract (e.g., *"Uncapped consequential damages in Section 14.1"*).
  - **Internal Clause Conflict Detector:** Flags instances where two clauses in the same agreement contradict each other (e.g., Section 4 states payments are Net 30, but Section 12.2 states non-payment after 15 days constitutes material breach).
  - **Action Plan Recommendations:** Prioritized list of remediation steps generated specifically for contract signatories.

---

<a id="tab-10-approvals"></a>
### Tab 10: Approvals & Human Workflows (🤝)

**Purpose:** Orchestrates human-in-the-loop signoff, reviewer assignments, and dual-signatory approvals.

- **Workflow Statuses:**
  - `DRAFT`: Workflow created, awaiting review submission.
  - `PENDING_REVIEW`: Assigned to a legal or commercial peer for evaluation.
  - `APPROVED`: Authorized by designated approver.
  - `REJECTED`: Declined with mandatory feedback notes.
- **Dual-Signatory Signoff:**
  - For high-exposure contracts ($> \$100,000$ value or Risk Score $> 70$), the system automatically enforces **Separation of Duties**. The person who uploaded the agreement cannot be the sole approver. A second authorized administrator must sign off.
- **Buttons:**
  - **"Initiate Approval Workflow"** — Opens a modal to set workflow title, due date, and select reviewer/approver.
  - **"Approve Workflow"** / **"Reject Workflow"** — Action buttons for designated approvers. Appends an immutable block to the audit ledger.

---

<a id="tab-11-policy-governance"></a>
### Tab 11: Policy Governance (📜 Exceptions & Controls)

**Purpose:** Enforces mandatory corporate legal policies and manages formal deviation exceptions.

- **Active Governance Policies:**
  - Displays enterprise rules established by your legal leadership (e.g., *"All vendor contracts must include a mutual NDA and cap liability at 1x annual contract value"*).
- **Finding Statuses:**
  - `COMPLIANT`: Terms satisfy corporate policy.
  - `PARTIALLY_COMPLIANT`: Minor deviation detected.
  - `NON_COMPLIANT`: Violates a mandatory policy rule.
- **Requesting a Policy Exception:**
  - If commercial necessity requires signing a non-compliant contract, click **"Request Policy Exception"**.
  - Provide a business justification (e.g., *"Vendor is a sole-source provider with non-negotiable standard terms; risk approved by CFO"*).
  - An executive administrator can approve or reject the exception with an expiration date.

---

<a id="tab-12-action-center"></a>
### Tab 12: Action Center (⚡ Remediation Queue)

**Purpose:** Converts contract risks into trackable, actionable tasks.

- **Action Attributes:**
  - `Title`: Description of the action (e.g., *"Insert 30-day cure period into Termination clause"*).
  - `Priority Score (0 - 100)`: Calculated from clause risk severity.
  - `Category`: `GOVERNANCE`, `FINANCIAL`, `OPERATIONAL`, `LEGAL`.
  - `Status`: `OPEN`, `TRIAGED`, `IN_REVIEW`, `RESOLVED`, or `DISMISSED`.
  - `Owner`: Assigned team member.
  - `Due Date`: Deadline for remediation.
- **Buttons:**
  - **"Assign Owner"** — Opens dialog to delegate task to a team member.
  - **"Set Due Date"** — Schedules calendar target date.
  - **"Mark Resolved"** — Records resolution notes and marks task complete.
  - **"Escalate Action"** — Triggers immediate notification to department leads.

---

<a id="tab-13-audit-export"></a>
### Tab 13: Audit & Certified Evidence Export (🛡️)

**Purpose:** Provides non-repudiation cryptographic verification and certified evidence packages.

- **Cryptographic Merkle Proof:**
  - Displays the exact SHA-256 block hash, previous block hash, and transaction timestamp recorded when this contract was ingested or modified.
- **Export Formats Available:**
  1. **RFC-4180 Certified CSV:** Raw tabular export of all audit logs, timestamps, and user actions.
  2. **JSON-LD Compliance Manifest:** Machine-readable cryptographic certificate suitable for submission to regulatory bodies (SOC 2, ISO 27001, GDPR audits).
  3. **Microsoft Word Redline (.docx):** Formatted legal document ready for sending to counterparties.

---

<a id="tab-14-pii-redactor"></a>
### Tab 14: PII Scanner & Automated Redactor

**Purpose:** Detects and scrubs Personally Identifiable Information (`PII`) before sharing or archiving.

- **Entity Types Detected:**
  - Email addresses
  - Phone numbers
  - Social Security Numbers (`SSNs`) / Tax IDs
  - Credit card numbers
  - Physical street addresses
  - Individual person names
- **Interactive Controls:**
  - **Button: "Scan for PII"** — Runs regex and NER token classification. Displays a table of all detected entities with match confidence.
  - **Button: "Redact Selected Entities"** — Masks identified entities with cryptographic tokens (e.g., `[REDACTED_EMAIL_1]`).
  - **Button: "Download Redacted Text"** — Exports the scrubbed document payload.

---

<a id="tab-15-share-links"></a>
### Tab 15: Expirable Share Links

**Purpose:** Safely share access to contracts with external counsel, auditors, or counterparties without creating full platform accounts.

- **Configurable Parameters:**
  - `Expiration Window`: 1 Hour, 24 Hours, 7 Days, or 30 Days.
  - `Download Limits`: Single-use (1 download), 5 downloads, or Unlimited downloads within window.
  - `Password Protection (Optional)`: Requires recipient to enter a passphrase before unlocking the document.
- **Buttons:**
  - **"Generate Secure Share Link"** — Issues a unique cryptographic token URL (e.g., `https://deciva.ai/#/share/t-9a8b7c...`).
  - **"Revoke Link Immediately"** — Instantly invalidates the link, blocking any further external access.

---

## 7. The Contract Generator (Drafting & Cryptographic Signing)

The **Contracts Generator** (`/contracts`) allows you to draft standardized, pre-approved legal agreements and seal them with an RSA-2048 digital signature.

### 7.1 How to Draft a New Agreement

1. **Select Contract Type:** Choose from standard archetypes:
   - *Non-Disclosure Agreement (Mutual NDA)*
   - *Master Services Agreement (MSA)*
   - *Service Level Agreement (SLA)*
   - *Intellectual Property Assignment Agreement*
   - *Vendor Data Processing Addendum (DPA)*
   - *Independent Contractor Agreement*
2. **Fill in Dynamic Parameters:** The form will dynamically generate the required fields for that contract type:
   - `Company Name` (First Party)
   - `Counterparty Name` (Second Party)
   - `Effective Date`
   - `Governing Jurisdiction` (e.g., Delaware, California, England & Wales)
   - `Term Duration` (e.g., 12 Months, 24 Months, Perpetual)
   - `Payment Terms` (e.g., Net 30, Upon Delivery)
3. **Button: "Generate Contract & Sign"**
   - Synthesizes the legal prose using validated statutory templates.
   - Generates an RSA-2048 digital signature verifying document origin.
   - Computes the SHA-256 digest and records a `CONTRACT_GENERATED` block in the blockchain audit trail.
4. **Download & Archive:**
   - Click **"Download Signed Agreement"** to export the plain text or PDF version.
   - The contract is automatically stored in your **Documents** repository for ongoing surveillance.

---

## 8. The Portfolio Management Hub (Surveillance & Bulk Operations)

The **Portfolio Hub** (`/portfolio`) provides continuous oversight across your entire contractual estate.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  PORTFOLIO SURVEILLANCE & GOVERNANCE (/portfolio)                                                      │
│  [Rich Executive View]  |  [Dense Operational View]                                                    │
├───────────────┬─────────────────────────┬─────────────────────────┬───────────────┬────────────────────┤
│ [01] Monitor  │ [02] Contract Health    │ [03] Attention Queue    │ [04] Approvals│ [05] Compliance    │
│  Live Events  │  Risk Distribution      │  Deadlines & SLAs       │  Dual Signoff │  Statutory Audits  │
└───────────────┴─────────────────────────┴─────────────────────────┴───────────────┴────────────────────┘
```

### 8.1 Dual Mode Switcher
- **Rich Executive View:** Spacious card layouts with graphic gauges, trend explanations, and ROI metrics. Ideal for leadership meetings.
- **Dense Operational View:** Compact data grids maximizing visible rows on screen. Ideal for legal operations teams triaging dozens of contracts daily.

<a id="monitoring-stream"></a>
### 8.2 Tab 01: Continuous Monitoring Stream
- **Autonomous Obligation Surveillance:** Real-time event feed reporting contract lifecycle events:
  - `Risk Delta Alerts`: Triggered when an amended exhibit increases a contract's risk score.
  - `SLA Breach Warnings`: Alerts when delivery deadlines cross into the critical 15-day window.
  - `Notice Thresholds`: Alerts when 90/60/30-day opt-out windows open.
- **Button: "Acknowledge Event"** — Flags the monitoring alert as reviewed by operations.

<a id="health-risk-rankings"></a>
### 8.3 Tab 02: Contract Health & Risk Rankings
- **Portfolio Health Table:** Lists all active agreements sorted by risk score.
- **Columns:** Document Title, Contract Type, Counterparty, Effective Date, Renewal Date, Risk Score, Status.
- **Filters:** Filter by Risk Level (`HIGH`, `MEDIUM`, `LOW`), Contract Type, or Counterparty name.

<a id="attention-queue"></a>
### 8.4 Tab 03: Attention & Deadlines Queue
- **Executive Remediation Backlog:** Consolidates all open action items across all documents in a single prioritization queue.
- **Workload Balance Widget:** Visualizes which attorneys or team members have the most unaddressed critical tasks.

<a id="governed-bulk-operations"></a>
### 8.5 Tab 04: Governed Approvals & Controlled Bulk Operations
- **Bulk Action Capabilities:** Select multiple contracts to execute batch status changes, batch archiving, or mass risk reclassification.
- **Idempotency & Previews:**
  - Before any bulk action commits, the engine runs a **Preview Phase** generating a SHA-256 preview hash.
  - Assigns a unique `idempotency_key` ensuring that network hiccups or double-clicks can never execute the same batch twice.
- **Dual-Signatory Approval Protocol:**
  - High-impact operations (e.g. batch-deleting 10 contracts or overriding risk flags) generate a `PENDING_APPROVAL` batch.
  - A secondary administrator must log in, review the batch, and click **"Authorize Batch Execution"** before any database changes occur.

<a id="compliance-roi"></a>
### 8.6 Tab 05: Compliance & Business ROI Analytics
- **Business ROI Card:** Quantifies the financial value delivered by Deciva:
  - `Hours Saved`: Time saved across contract review (calculated at 4.2 hours per contract average).
  - `Cost Avoidance`: Financial loss prevented by flagging uncapped indemnities and auto-renewals.
  - `Statutory Compliance Average`: Aggregate compliance percentage across Delaware, UCC, and GDPR benchmarks.

---

## 9. The Zero-Trust Security Center & Observatory

The **Security Center** (`/security`) provides full transparency into the cryptographic foundations protecting your documents.

<a id="radial-observatory"></a>
### 9.1 Radial Observatory Instrument

The centerpiece of the Security Center is the interactive **Radial Observatory**:

- **The 5 Security Nodes:**
  1. `IDENTITY`: User authentication status, TOTP MFA validation, and session trust score.
  2. `LEDGER`: Blockchain audit chain status, unbroken block count, and SHA-256 continuity.
  3. `VAULT`: AES-256-GCM credential vault status, active secret count, and encryption key rotation.
  4. `NETWORK`: Zero-trust network gateway, IP access filters, and rate-limiting telemetry.
  5. `ENCLAVE`: Hardware-isolated memory chamber status and document ephemeral storage state.
- **Interactive Inspection:** Click on any of the 5 nodes in the circular instrument to open its contextual **Progressive Disclosure Detail Panel**.

<a id="merkle-ledger-explorer"></a>
### 9.2 Cryptographic Merkle Ledger Explorer
- **Block-by-Block Inspection:** Browse every block in the `blockchain_audit` table.
- **Block Fields:**
  - `Block Index`: Sequential block number (Genesis = Block #0).
  - `Action`: Event type (`SYSTEM_INITIALIZED`, `DOCUMENT_UPLOADED`, `ANALYSIS_COMPLETED`, `ACTION_RESOLVED`, `BATCH_EXECUTED`).
  - `User ID`: Actor who performed the action (or `SYSTEM`).
  - `Previous Hash`: SHA-256 hash of the preceding block.
  - `Block Hash`: SHA-256 digest of this block's contents + previous hash.
- **Button: "Verify Entire Audit Ledger"**
  - Iterates synchronously from Block #0 to the tip of the chain.
  - Verifies that every single block's `prev_hash` strictly equals the preceding block's `hash`.
  - Confirms non-repudiation: proves that no administrator or attacker has altered historical records.

<a id="session-management"></a>
### 9.3 Session Management & Remote Revocation
- **Active Enclave Sessions:** Lists all devices currently authenticated to your account.
- **Attributes:** IP Address, Device Fingerprint, Trust Score, Last Seen Timestamp.
- **Button: "Revoke Session"** (Trash icon): Instantly terminates that session's JWT token, forcing an immediate logout on that device.

<a id="threat-breakdown"></a>
### 9.4 Threat Breakdown & Geographical Telemetry
- **Threat Logs:** Real-time log of security events: brute-force login attempts, unauthorized API access, rate limit triggers, or anomalous IP shifts.
- **Severity Categories:** `CRITICAL`, `HIGH`, `MEDIUM`, `INFO`.

---

## 10. Enterprise Integrations Console

The **Integrations Console** (`/integrations`) allows Deciva to interoperate with external enterprise ecosystems while maintaining strict internal governance.

- **Available Connectors:**
  - `Salesforce CRM`: Sync contracts against Opportunity and Account records.
  - `HubSpot`: Ingest customer agreements and track renewal dates against CRM contacts.
  - `SAP Ariba`: Enterprise procurement and vendor contract synchronization.
  - `Slack`: Instant notification webhooks for critical risk alerts and approval requests.
  - `Custom Enterprise Webhooks`: Send real-time event payloads to internal data warehouses.
- **Configuring a Connection:**
  1. Click **"Configure Connector"** on the desired provider card.
  2. Enter the external API endpoint and Secret Key. All keys are encrypted with **AES-256-GCM** before writing to the database.
  3. Select **Sync Direction**: `INBOUND_ONLY`, `OUTBOUND_ONLY`, or `BIDIRECTIONAL`.
  4. Click **"Test Connection"** to verify handshake.
  5. Click **"Save & Enable Connector"**.
- **The Outbox & Dead-Letter Queue (DLQ):**
  - External event notifications use the transactional **Outbox Pattern**. If Salesforce or Slack is temporarily down, the event is saved to `integration_event_outbox` and retried with exponential backoff and jitter.

---

## 11. Enterprise Operations & Disaster Recovery (Admin Console)

The **Enterprise Operations Console** (`/operations`) is accessible exclusively to authorized system administrators (`role = 'admin'`).

### 11.1 Disaster Recovery & Backups
- **Creating a Point-in-Time Backup:**
  1. Click **"Create System Backup"**.
  2. Choose Backup Type: `FULL_DATABASE` or `TENANT_ARCHIVE`.
  3. Enter an administrative description.
  4. Click **"Execute Backup"**.
  5. The system dumps table states, computes an aggregate SHA-256 checksum, and encrypts the archive.
- **Executing a Sandboxed Dry-Run Restore Drill:**
  1. Select a completed backup from the list.
  2. Click **"Test Restore (Dry Run)"**.
  3. The system restores data into an isolated test schema with the prefix `isolated_recovery_*`, validates all foreign keys and checksums, and reports success without impacting active production data.

### 11.2 Data Portability (Export & Import)
- **Exporting Tenant Dossier:** Export all contracts, redlines, audit logs, and decisions belonging to a specific tenant into a portable, versioned JSON package.
- **Importing Tenant Dossier:** Upload a previously exported package. Run in `DRY_RUN` mode first to validate schema compatibility, then run in `COMMIT` mode to ingest.

### 11.3 Tenant Lifecycle & Deletion
- **State Flow:** `ACTIVE` $\rightarrow$ `SUSPENDED` $\rightarrow$ `ARCHIVING` $\rightarrow$ `ARCHIVED` $\rightarrow$ `DELETION_PENDING` $\rightarrow$ `DELETED`.
- **30-Day Deletion Grace Period:** Deletions are scheduled 30 days in advance. Can be cancelled at any time during the grace window.

### 11.4 Legal Holds (Evidentiary Preservation)
- **Purpose:** Freezes all automated data retention purges and tenant deletions during active litigation or regulatory inquiry.
- **Creating a Hold:**
  1. Click **"Create Legal Hold"**.
  2. Enter Matter Name, Matter ID (e.g. `LIT-2026-084`), and Scope (`ALL_DOCUMENTS` or specific Document ID).
  3. While a Legal Hold is active, the system will **block** any deletion attempts, even by system administrators.

### 11.5 Break-Glass Emergency Controls
- **Purpose:** Emergency administrator protocol to access restricted tenant enclaves during major production incidents.
- **How It Works:**
  - Administrator enters Tenant ID, emergency scope, and a mandatory detailed justification.
  - Access is granted under a dedicated correlation ID.
  - An indelible `ADMIN_BREAK_GLASS_INVOKED` event is stamped into the cryptographic audit blockchain.
  - Access can be revoked at any time.

---

## 12. Master Metrics, Badges, and Status Glossary

| Term / Metric | Typical Values | Meaning & Business Context |
| :--- | :--- | :--- |
| **Portfolio Health Index** | `0 - 100` | Composite health score of the entire contract estate. 100 = perfect, zero risk. |
| **Document Risk Score** | `0 - 100` | Individual contract risk. $0-29$: Low; $30-59$: Medium; $60-100$: High. |
| **OCR Confidence** | `0.0% - 100.0%` | Text extraction accuracy. $>95\%$ is digital grade; $<80\%$ is degraded scan. |
| **Checklist Score** | `0% - 100%` | Percentage of standard required corporate clauses present in the contract. |
| **BATNA Leverage** | `HIGH / MED / LOW` | Best Alternative to a Negotiated Agreement leverage when redlining. |
| **Concession Probability** | `0% - 100%` | Likelihood that counterparty legal counsel will accept the proposed redline. |
| **Zero-Trust Score** | `0 - 100` | Account security posture score. 100 = MFA enabled, valid session, no threat flags. |
| **SHA-256 Digest** | 64 Hex characters | Cryptographic fingerprint of file bytes or block data. Verifies non-tampering. |
| **Action Priority Score** | `0 - 100` | Triage priority score for contractual remediation items. |
| **Action Status** | `OPEN`, `TRIAGED`, `IN_REVIEW`, `RESOLVED`, `DISMISSED` | Lifecycle state of an action item in the Enterprise Action Center. |
| **Workflow Status** | `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED` | Human-in-the-loop decision approval status. |
| **Compliance Status** | `COMPLIANT`, `PARTIALLY_COMPLIANT`, `NON_COMPLIANT` | Adherence to corporate policies or statutory regulations. |
| **Separation of Duties** | Enforced boolean | Mandatory dual-signatory rule: author cannot approve their own high-value contract. |
| **Legal Hold** | `ACTIVE / RELEASED` | Preservation freeze overriding all retention purge and tenant deletion rules. |

---

## 13. Button, Icon & Action Quick Reference Sheet

| Button / UI Icon | Typical Location | Exact Action When Clicked |
| :--- | :--- | :--- |
| **Deposit Contract / Browse** | `/upload` | Opens file picker or triggers file ingestion pipeline. |
| **Open Document Workspace** | `/upload` | Navigates into the 15-tab workspace for the uploaded document (`/document/:id`). |
| **Re-run Analysis** | Document Workspace Header | Clears cached analysis and re-evaluates all 9 risk dimensions and statutory rules. |
| **Verify Integrity** | Document Workspace Header | Recomputes SHA-256 hash from disk and compares against audit ledger to confirm non-tampering. |
| **Export Redline** | Document Workspace Header | Downloads a track-changes Microsoft Word document (`.docx`). |
| **Send to Negotiation** | Tab 02 (Clauses) | Copies verbatim clause text into the redline editor in Tab 07. |
| **Adopt Revision** | Tab 07 (Negotiation) | Adopts the AI-generated compromise language into the active contract draft. |
| **Run Simulation** | Tab 08 (Simulation) | Executes a predictive scenario analysis against hypothetical default or breach conditions. |
| **Initiate Approval Workflow** | Tab 10 (Approvals) | Creates a formal multi-user review and approval workflow with assigned signers. |
| **Request Policy Exception** | Tab 11 (Governance) | Opens a modal to submit a business justification for signing a non-compliant clause. |
| **Escalate Action** | Tab 12 (Action Center) | Flags a remediation task as high-priority and notifies team leads. |
| **Scan for PII / Redact** | Tab 14 (PII) | Identifies personal data and replaces it with masked cryptographic tokens. |
| **Generate Share Link** | Tab 15 (Share) | Generates a time-limited, download-restricted external access URL. |
| **Generate Contract & Sign** | `/contracts` | Drafts a new contract from templates and stamps it with an RSA-2048 digital signature. |
| **Authorize Batch Execution** | `/portfolio` (Approvals) | Approves queued bulk operations requiring secondary administrative signoff. |
| **Verify Entire Audit Ledger** | `/security` | Runs a complete cryptographic traversal from Genesis Block to verify unbroken chain integrity. |
| **Revoke Session** | `/security` | Invalidates an active JWT session token on a remote device. |
| **Test Restore (Dry Run)** | `/operations` | Conducts an isolated test restore drill in a sandboxed schema (`isolated_recovery_*`). |
| **Create Legal Hold** | `/operations` | Places a statutory preservation freeze on document deletion. |
| **Invoke Break-Glass Access** | `/operations` | Grants emergency administrative access under an audited correlation ID. |

---

*Deciva — Enterprise Security, Grounded Intelligence, and Non-Repudiation Built In.*
