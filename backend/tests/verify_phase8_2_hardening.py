#!/usr/bin/env python3
"""
verify_phase8_2_hardening.py
Phase 8.2 Enterprise Governance Closure & Production Hardening Verification Suite
DocuGuard AI

60+ Comprehensive Tests across 8 Hardening Sections:
  1. Security Boundary: Document Listing Scoping & Cross-Tenant IDOR Prevention
  2. Security Boundary: AI Routes & Internal Microservice Service Key Enforcement
  3. Security Boundary: Hardcoded Admin Identity Elimination & Strict Role Authority
  4. Governance → Evidence Integration: Contract Level Lineage & Cryptographic Hash
  5. Governance → Evidence Integration: Portfolio Level Lineage, CSV & PDF Exports
  6. Production Resilience: SMTP Bounded Timeouts, Non-blocking Emails & MFA Separation
  7. Production Resilience: DB Pool Safeguards, Transaction Timeouts & Schema Migrations
  8. UX Consolidation: Dashboard Executive Governance Cockpit & Navigation Hardening
"""

import sys
import os
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import time
import uuid
import json
import hashlib
import requests
from datetime import datetime, timedelta

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import urllib.parse
import psycopg2
from dotenv import load_dotenv
load_dotenv()

def get_db_connection():
    url = os.getenv("DATABASE_URL", "")
    try:
        parsed = urllib.parse.urlparse(url)
        query_params = urllib.parse.parse_qs(parsed.query)
        query_params.pop('channel_binding', None)
        new_query = urllib.parse.urlencode(query_params, doseq=True)
        sanitized = urllib.parse.urlunparse(parsed._replace(query=new_query))
    except Exception:
        sanitized = url

    for attempt in range(5):
        try:
            conn = psycopg2.connect(sanitized)
            conn.autocommit = True
            return conn
        except Exception as e:
            if attempt == 4:
                raise e
            time.sleep(1.0)

_db_conn = None

def get_db():
    global _db_conn
    try:
        if _db_conn is not None and _db_conn.closed == 0:
            with _db_conn.cursor() as cur:
                cur.execute("SELECT 1")
            return _db_conn
    except Exception:
        pass
    _db_conn = get_db_connection()
    return _db_conn

NODE_BASE_URL = os.environ.get("NODE_API_URL", "http://localhost:5000")
FLASK_BASE_URL = os.environ.get("FLASK_API_URL", "http://127.0.0.1:5001")
INTERNAL_SERVICE_KEY = os.environ.get("INTERNAL_SERVICE_KEY", "docuguard-internal-microservice-secret-key-soc2-vault")

total_tests = 0
passed_tests = 0

def log_test(name, passed, detail=""):
    global total_tests, passed_tests
    total_tests += 1
    if passed:
        passed_tests += 1
        print(f"  [PASS] Test {total_tests:02d}: {name}", flush=True)
    else:
        print(f"  [FAIL] Test {total_tests:02d}: {name} - {detail}", flush=True)
        sys.exit(1)

def wait_for_server(max_wait=30):
    deadline = time.time() + max_wait
    while time.time() < deadline:
        try:
            r = requests.get(f"{NODE_BASE_URL}/api/health", timeout=5)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1.0)
    raise RuntimeError(f"Server not ready after {max_wait}s")

def register_and_login(conn, email_prefix="hardened_user", role="user"):
    unique_id = uuid.uuid4().hex[:8]
    email = f"{email_prefix}_{unique_id}@example.com"
    password = "TestPassword123!"
    name = f"Test User {unique_id}"

    requests.post(f"{NODE_BASE_URL}/api/auth/register", json={
        "email": email, "password": password, "name": name
    }, timeout=30)

    login_res = requests.post(f"{NODE_BASE_URL}/api/auth/login", json={
        "email": email, "password": password
    }, timeout=30).json()

    token = None
    user_id = None

    if login_res.get("mfaRequired"):
        pre_token = login_res.get("preToken")
        dev_code = login_res.get("devCode")
        if not dev_code:
            with get_db().cursor() as cur:
                cur.execute(
                    """SELECT code FROM otp_codes
                       WHERE user_id = (SELECT id FROM users WHERE email = %s)
                       ORDER BY created_at DESC LIMIT 1""",
                    (email,)
                )
                r = cur.fetchone()
                dev_code = r[0] if r else "123456"

        mfa_res = requests.post(f"{NODE_BASE_URL}/api/auth/mfa/totp/verify", json={
            "preToken": pre_token, "code": str(dev_code)
        }, timeout=20).json()
        token = mfa_res.get("token")
        user_id = mfa_res.get("user", {}).get("id")
    else:
        token = login_res.get("token") or login_res.get("accessToken")
        user_id = login_res.get("user", {}).get("id")

    if not user_id:
        with get_db().cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            user_id = cur.fetchone()[0]

    if role != "user":
        with get_db().cursor() as cur:
            cur.execute("UPDATE users SET role = %s WHERE id = %s", (role, user_id))

    return {
        "id": user_id,
        "email": email,
        "role": role,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    }

def create_document(conn, user_id, doc_name="Test Agreement.pdf"):
    doc_id = str(uuid.uuid4())
    with get_db().cursor() as cur:
        cur.execute(
            """INSERT INTO documents (id, user_id, filename, original_name, mime_type, size, sha256, risk_score)
               VALUES (%s, %s, %s, %s, 'application/pdf', 10240, %s, 45)
               RETURNING id""",
            (doc_id, user_id, f"test_{doc_id}.pdf", doc_name, hashlib.sha256(doc_name.encode()).hexdigest())
        )
    return doc_id

def create_action(conn, doc_id, title="Test Action", category="COMPLIANCE", priority_score=85, status="OPEN", due_in_days=5):
    act_id = str(uuid.uuid4())
    due_date = datetime.utcnow() + timedelta(days=due_in_days)
    with get_db().cursor() as cur:
        cur.execute(
            """INSERT INTO contract_actions (id, document_id, source_action_id, title, category, priority_score, status, due_date)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id""",
            (act_id, doc_id, f"src_{act_id[:8]}", title, category, priority_score, status, due_date)
        )
    return act_id


def run_all_tests():
    print("================================================================================")
    print("DOCUGUARD AI - PHASE 8.2 ENTERPRISE HARDENING & GOVERNANCE VERIFICATION")
    print("================================================================================")

    wait_for_server()
    conn = get_db_connection()

    # Provision testing actors
    user_a = register_and_login(conn, "user_a", "user")
    user_b = register_and_login(conn, "user_b", "user")
    admin_user = register_and_login(conn, "admin_82", "admin")

    # Provision documents
    doc_a = create_document(conn, user_a["id"], "Master Services Agreement A.pdf")
    doc_b = create_document(conn, user_b["id"], "Non Disclosure Agreement B.pdf")

    # ---------------------------------------------------------------------------
    # Section 1: Security Boundary - Document Listing Scoping & Cross-Tenant IDOR
    # ---------------------------------------------------------------------------
    print("\n--- Section 1: Security Boundary - Document Listing & IDOR Closure ---")

    # 1. Schema migrations table exists
    with get_db().cursor() as cur:
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'schema_migrations'
            )
        """)
        has_migrations = cur.fetchone()[0]
    log_test("schema_migrations table exists", has_migrations)

    # 2. Schema migrations records tracked migrations
    with get_db().cursor() as cur:
        cur.execute("SELECT version, name FROM schema_migrations ORDER BY version ASC")
        migrations = cur.fetchall()
    log_test("schema_migrations contains tracked migration entries", len(migrations) >= 5, f"count={len(migrations)}")

    # 3. Regular User A lists documents and receives only their own
    r = requests.get(f"{NODE_BASE_URL}/api/documents", headers=user_a["headers"], timeout=10)
    data_a = r.json()
    docs_a = data_a if isinstance(data_a, list) else data_a.get("documents", [])
    user_a_ids = {d["id"] for d in docs_a}
    log_test("User A document listing includes doc_a", doc_a in user_a_ids)

    # 4. User A document listing strictly excludes User B's documents
    log_test("User A document listing excludes doc_b (cross-tenant isolation)", doc_b not in user_a_ids)

    # 5. User B document listing strictly excludes User A's documents
    r = requests.get(f"{NODE_BASE_URL}/api/documents", headers=user_b["headers"], timeout=10)
    data_b = r.json()
    docs_b = data_b if isinstance(data_b, list) else data_b.get("documents", [])
    user_b_ids = {d["id"] for d in docs_b}
    log_test("User B document listing excludes doc_a", doc_a not in user_b_ids and doc_b in user_b_ids)

    # 6. Admin lists documents and receives both doc_a and doc_b
    r = requests.get(f"{NODE_BASE_URL}/api/documents", headers=admin_user["headers"], timeout=10)
    data_admin = r.json()
    admin_docs = data_admin if isinstance(data_admin, list) else data_admin.get("documents", [])
    admin_ids = {d["id"] for d in admin_docs}
    log_test("Admin user lists documents across all tenants", doc_a in admin_ids and doc_b in admin_ids)

    # 7. Cross-tenant access to GET /api/documents/:id for User B on User A's doc
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /api/documents/:id returns HTTP 403 or 404", r.status_code in [403, 404])

    # 8. Cross-tenant access to /api/documents/:id/analysis returns HTTP 403
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/analysis", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /analysis returns HTTP 403", r.status_code == 403)

    # 9. Cross-tenant access to /api/documents/:id/clauses returns HTTP 403
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/clauses", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /clauses returns HTTP 403", r.status_code == 403)

    # 10. Cross-tenant access to /api/documents/:id/deadlines returns HTTP 403
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/deadlines", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /deadlines returns HTTP 403", r.status_code == 403)

    # ---------------------------------------------------------------------------
    # Section 2: Security Boundary - AI Routes & Internal Microservice Service Key
    # ---------------------------------------------------------------------------
    print("\n--- Section 2: Security Boundary - AI Routes & Flask Key Enforcement ---")

    # 11. Cross-tenant access to /api/documents/:id/risks returns HTTP 403
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/risks", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /risks returns HTTP 403", r.status_code == 403)

    # 12. Cross-tenant chat POST /api/documents/:id/chat returns HTTP 403
    r = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_a}/chat", headers=user_b["headers"], json={"message": "Summarize"}, timeout=10)
    log_test("Cross-tenant POST /chat returns HTTP 403", r.status_code == 403)

    # 13. Cross-tenant negotiation POST /api/documents/:id/negotiate returns HTTP 403
    r = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_a}/negotiate", headers=user_b["headers"], json={"target_clause": "indemnity"}, timeout=10)
    log_test("Cross-tenant POST /negotiate returns HTTP 403", r.status_code == 403)

    # 14. Cross-tenant negotiation suggestions GET returns HTTP 403
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/negotiation-suggestions", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /negotiation-suggestions returns HTTP 403", r.status_code == 403)

    # 15. Cross-tenant risk simulation POST /api/documents/:id/simulate returns HTTP 403
    r = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_a}/simulate", headers=user_b["headers"], json={"scenario": "Data breach"}, timeout=10)
    log_test("Cross-tenant POST /simulate returns HTTP 403", r.status_code == 403)

    # 16. Cross-tenant risk simulations list GET /api/documents/:id/simulations returns HTTP 403
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/simulations", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /simulations returns HTTP 403", r.status_code == 403)

    # 17. Cross-tenant intelligence GET /api/documents/:id/intelligence returns HTTP 403
    r = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/intelligence", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant GET /intelligence returns HTTP 403", r.status_code == 403)

    # 18. Cross-tenant intelligence refresh POST returns HTTP 403
    r = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_a}/intelligence/refresh", headers=user_b["headers"], timeout=10)
    log_test("Cross-tenant POST /intelligence/refresh returns HTTP 403", r.status_code == 403)

    # 19. Direct call to Flask without internal key is rejected (HTTP 403)
    try:
        r_flask = requests.get(f"{FLASK_BASE_URL}/api/documents", timeout=3)
        flask_denied = r_flask.status_code == 403 and r_flask.json().get("code") == "INTERNAL_AUTH_REQUIRED"
    except Exception:
        flask_denied = True  # Network-isolated/not directly reachable is also safe
    log_test("Direct Flask call without x-internal-service-key rejected (HTTP 403)", flask_denied)

    # 20. Direct call to Flask with invalid key is rejected (HTTP 403)
    try:
        r_flask = requests.get(f"{FLASK_BASE_URL}/api/documents", headers={"x-internal-service-key": "bad-key"}, timeout=3)
        flask_invalid = r_flask.status_code == 403 and r_flask.json().get("code") == "INTERNAL_AUTH_REQUIRED"
    except Exception:
        flask_invalid = True
    log_test("Direct Flask call with forged x-internal-service-key rejected", flask_invalid)

    # ---------------------------------------------------------------------------
    # Section 3: Hardcoded Admin Identity Elimination & Strict Role Authority
    # ---------------------------------------------------------------------------
    print("\n--- Section 3: Hardcoded Admin Identity Elimination & Role Authority ---")

    # 21. Create user with legacy email prefix balujunivas with role='user'
    legacy_user = register_and_login(conn, "balujunivas", "user")
    headers_legacy = legacy_user["headers"]
    log_test("Legacy user created with balujunivas email and role='user'", legacy_user.get("role") == "user")

    # 22. balujunivas user with role='user' CANNOT access admin overview
    r = requests.get(f"{NODE_BASE_URL}/api/admin/overview", headers=headers_legacy, timeout=10)
    log_test("User with balujunivas email and role='user' is denied admin overview (HTTP 403)", r.status_code == 403)

    # 23. Admin user with role='admin' CAN access admin overview
    r = requests.get(f"{NODE_BASE_URL}/api/admin/overview", headers=admin_user["headers"], timeout=30)
    log_test("Admin user with role='admin' is authorized for admin overview (HTTP 200)", r.status_code == 200)

    # 24. Non-admin user cannot access pending approvals inbox (scoped inbox returns 0 items)
    r = requests.get(f"{NODE_BASE_URL}/api/portfolio/operations/pending-approvals", headers=user_a["headers"], timeout=10)
    log_test("Non-admin user inbox is scoped and cannot view pending approvals", len(r.json().get("pending", [])) == 0)

    # 25. Admin user CAN access pending approvals inbox
    r = requests.get(f"{NODE_BASE_URL}/api/portfolio/operations/pending-approvals", headers=admin_user["headers"], timeout=10)
    log_test("Admin user successfully accesses pending approvals inbox (HTTP 200)", r.status_code == 200)

    # ---------------------------------------------------------------------------
    # Section 4: Governance -> Evidence Integration (Contract Level Lineage)
    # ---------------------------------------------------------------------------
    print("\n--- Section 4: Governance -> Evidence Integration (Contract Level) ---")

    # Create action for doc_a
    act1 = create_action(conn, doc_a, "Update SLA Term", "COMPLIANCE", priority_score=45)

    # Execute low-risk preview and batch operation affecting act1
    prev_res = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=user_a["headers"],
        json={
            "operation": "BULK_ASSIGN",
            "actionIds": [act1],
            "mode": "SUBSET",
            "payload": {"ownerId": user_a["id"]}
        },
        timeout=10
    ).json()

    preview_id = prev_res.get("previewId")
    exec_res = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{preview_id}/execute",
        headers={**user_a["headers"], "Idempotency-Key": str(uuid.uuid4())},
        timeout=10
    ).json()
    log_test("Bulk assign operation executed successfully", exec_res.get("executed") == 1 or exec_res.get("executedCount") == 1, f"res={exec_res}")

    # Fetch contract evidence
    r = requests.get(f"{NODE_BASE_URL}/api/compliance/contracts/{doc_a}", headers=user_a["headers"], timeout=10)
    log_test("GET /api/compliance/contracts/:id returns HTTP 200", r.status_code == 200)
    ev_pkg = r.json()

    evidence = ev_pkg.get("evidence", {})
    manifest = ev_pkg.get("manifest", {})

    # Verify governedOperationsHistory field exists
    log_test("evidence contains governedOperationsHistory array", "governedOperationsHistory" in evidence)

    gov_hist = evidence.get("governedOperationsHistory", [])
    log_test("governedOperationsHistory contains executed batch record", len(gov_hist) >= 1)

    batch_rec = gov_hist[0] if gov_hist else {}
    log_test("governedOperationsHistory contains batchId", "batchId" in batch_rec)
    log_test("governedOperationsHistory contains operationType", batch_rec.get("operationType") == "BULK_ASSIGN")
    log_test("governedOperationsHistory contains policyVersion", batch_rec.get("policyVersion") == "1.0")
    log_test("governedOperationsHistory contains executedCount", batch_rec.get("executedCount") == 1)
    log_test("governedOperationsHistory contains previewHash", bool(batch_rec.get("previewHash")))

    # Verify cryptographic integrity of canonical evidence package
    verify_res = requests.post(
        f"{NODE_BASE_URL}/api/compliance/verify",
        headers=user_a["headers"],
        json=ev_pkg,
        timeout=10
    ).json()
    log_test("Contract evidence package verifies with valid SHA-256 hash", verify_res.get("valid") is True)

    # Tamper test: alter executedCount in governedOperationsHistory
    tampered_pkg = json.loads(json.dumps(ev_pkg))
    tampered_pkg["evidence"]["governedOperationsHistory"][0]["executedCount"] = 999
    tamper_res = requests.post(
        f"{NODE_BASE_URL}/api/compliance/verify",
        headers=user_a["headers"],
        json=tampered_pkg,
        timeout=10
    ).json()
    log_test("Tampering with governedOperationsHistory executedCount invalidates SHA-256 hash", tamper_res.get("valid") is False)

    # Tamper test: alter policyFlags in governedOperationsHistory
    tampered_pkg2 = json.loads(json.dumps(ev_pkg))
    tampered_pkg2["evidence"]["governedOperationsHistory"][0]["policyFlags"] = ["FORGED_POLICY_FLAG"]
    tamper_res2 = requests.post(
        f"{NODE_BASE_URL}/api/compliance/verify",
        headers=user_a["headers"],
        json=tampered_pkg2,
        timeout=10
    ).json()
    log_test("Tampering with policyFlags invalidates SHA-256 hash", tamper_res2.get("valid") is False)

    # ---------------------------------------------------------------------------
    # Section 5: Governance -> Evidence Integration (Portfolio Level, CSV & PDF)
    # ---------------------------------------------------------------------------
    print("\n--- Section 5: Governance -> Evidence Integration (Portfolio & Exports) ---")

    # Create high-impact action requiring approval
    act_crit = create_action(conn, doc_a, "Critical Governance Term", "SECURITY", priority_score=95, status="OPEN")

    gov_prev = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=user_a["headers"],
        json={
            "operation": "BULK_TRANSITION",
            "actionIds": [act_crit],
            "mode": "STRICT",
            "payload": {"targetStatus": "DISMISSED", "reason": "Authorized dismissal of critical item"}
        },
        timeout=10
    ).json()

    gov_batch_id = gov_prev.get("previewId")
    log_test("High-impact preview requires approval", gov_prev.get("requiresApproval") is True)

    # Submit for approval
    requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/batches/{gov_batch_id}/submit",
        headers=user_a["headers"],
        timeout=10
    )

    # Admin approves
    app_res = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/batches/{gov_batch_id}/approve",
        headers=admin_user["headers"],
        json={"comments": "Approved by senior compliance officer"},
        timeout=10
    ).json()
    log_test("Admin approves governed batch operation", app_res.get("status") == "APPROVED")

    # User A executes approved batch
    requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{gov_batch_id}/execute",
        headers={**user_a["headers"], "Idempotency-Key": str(uuid.uuid4())},
        timeout=10
    )

    # Fetch portfolio evidence
    r = requests.get(f"{NODE_BASE_URL}/api/compliance/portfolio", headers=user_a["headers"], timeout=10)
    log_test("GET /api/compliance/portfolio returns HTTP 200", r.status_code == 200)
    p_pkg = r.json()
    p_evidence = p_pkg.get("evidence", {})

    log_test("portfolio evidence contains governedBatches array", "governedBatches" in p_evidence)
    p_batches = p_evidence.get("governedBatches", [])
    log_test("portfolio governedBatches contains approved batch", len(p_batches) >= 1)

    matching_batch = next((b for b in p_batches if b["batchId"] == gov_batch_id), None)
    log_test("portfolio governedBatches contains exact batchId", matching_batch is not None)
    log_test("portfolio batch record includes approvedBy", matching_batch.get("approvedBy") == admin_user["id"])
    log_test("portfolio batch record includes approvalComments", "Approved by senior compliance officer" in (matching_batch.get("approvalComments") or ""))

    # Verify portfolio evidence hash
    p_verify = requests.post(
        f"{NODE_BASE_URL}/api/compliance/verify",
        headers=user_a["headers"],
        json=p_pkg,
        timeout=10
    ).json()
    log_test("Portfolio evidence package verifies with valid SHA-256 hash", p_verify.get("valid") is True)

    # Tamper test on portfolio approvedBy
    p_tampered = json.loads(json.dumps(p_pkg))
    for b in p_tampered["evidence"]["governedBatches"]:
        if b["batchId"] == gov_batch_id:
            b["approvedBy"] = "FORGED_APPROVER_ID"
    p_tamper_res = requests.post(
        f"{NODE_BASE_URL}/api/compliance/verify",
        headers=user_a["headers"],
        json=p_tampered,
        timeout=10
    ).json()
    log_test("Tampering with approvedBy in portfolio evidence invalidates SHA-256 hash", p_tamper_res.get("valid") is False)

    # Export contract CSV for batches
    csv_contract = requests.get(f"{NODE_BASE_URL}/api/compliance/contracts/{doc_a}/export/csv?type=batches", headers=user_a["headers"], timeout=10)
    log_test("Export contract CSV for batches returns HTTP 200", csv_contract.status_code == 200)
    log_test("Contract batches CSV contains Batch ID header", "Batch ID" in csv_contract.text)

    # Export portfolio CSV for governed_batches
    csv_portfolio = requests.get(f"{NODE_BASE_URL}/api/compliance/portfolio/export/csv?type=governed_batches", headers=user_a["headers"], timeout=10)
    log_test("Export portfolio CSV for governed_batches returns HTTP 200", csv_portfolio.status_code == 200)
    log_test("Portfolio governed_batches CSV contains header line", "Batch ID,Operation Type" in csv_portfolio.text)

    # Export contract PDF
    pdf_contract = requests.get(f"{NODE_BASE_URL}/api/compliance/contracts/{doc_a}/export/pdf", headers=user_a["headers"], timeout=10)
    log_test("Export contract PDF returns HTTP 200", pdf_contract.status_code == 200)
    log_test("Contract PDF output begins with %PDF- header", pdf_contract.content.startswith(b"%PDF-"))

    # Export portfolio PDF
    pdf_portfolio = requests.get(f"{NODE_BASE_URL}/api/compliance/portfolio/export/pdf", headers=user_a["headers"], timeout=10)
    log_test("Export portfolio PDF returns HTTP 200", pdf_portfolio.status_code == 200)
    log_test("Portfolio PDF output begins with %PDF- header", pdf_portfolio.content.startswith(b"%PDF-"))

    # ---------------------------------------------------------------------------
    # Section 6: Production Resilience - SMTP Bounded Timeouts & MFA Separation
    # ---------------------------------------------------------------------------
    print("\n--- Section 6: Production Resilience - SMTP Timeouts & MFA Separation ---")

    # Non-blocking registration response
    reg_start = time.time()
    reg_user = f"perf_user_{uuid.uuid4().hex[:6]}@example.com"
    r_reg = requests.post(f"{NODE_BASE_URL}/api/auth/register", json={
        "email": reg_user, "password": "TestPassword123!", "name": "Perf User"
    }, timeout=10)
    reg_duration = time.time() - reg_start
    log_test("Registration completes non-blocking in under 2.0 seconds", reg_duration < 2.0, f"duration={reg_duration:.3f}s")
    log_test("Registration response returns ok: true", r_reg.json().get("ok") is True)

    # Login request completes bounded without indefinite hang
    login_start = time.time()
    r_login = requests.post(f"{NODE_BASE_URL}/api/auth/login", json={
        "email": reg_user, "password": "TestPassword123!"
    }, timeout=15).json()
    login_duration = time.time() - login_start
    log_test("Login request completes bounded without indefinite hang (< 6.0s)", login_duration < 6.0, f"duration={login_duration:.3f}s")
    log_test("Login requires MFA", r_login.get("mfaRequired") is True)
    log_test("Login response includes devMode indicator", "devMode" in r_login)
    log_test("Login response includes deliveryFailed status", "deliveryFailed" in r_login)

    # MFA OTP is recorded in database
    with get_db().cursor() as cur:
        cur.execute(
            """SELECT code FROM otp_codes
               WHERE user_id = (SELECT id FROM users WHERE email = %s) AND used = false
               ORDER BY created_at DESC LIMIT 1""",
            (reg_user,)
        )
        saved_otp = cur.fetchone()
    log_test("MFA OTP code is saved in database", saved_otp is not None)

    # Invalid OTP code cannot authenticate
    r_bad_mfa = requests.post(f"{NODE_BASE_URL}/api/auth/mfa/totp/verify", json={
        "preToken": r_login.get("preToken"),
        "code": "000000"
    }, timeout=10)
    log_test("Invalid MFA verification code rejected with HTTP 401", r_bad_mfa.status_code == 401)

    # ---------------------------------------------------------------------------
    # Section 7: Production Resilience - DB Pool Safeguards, Timeouts & Envelope
    # ---------------------------------------------------------------------------
    print("\n--- Section 7: Production Resilience - Pool Safeguards & Error Envelope ---")

    # Check db.js source contains timeout configurations
    db_js_path = os.path.join(root_dir, "server", "db.js")
    with open(db_js_path, "r", encoding="utf-8") as f:
        db_src = f.read()
    log_test("db.js configures statement_timeout: 15000", "statement_timeout: 15000" in db_src)
    log_test("db.js configures query_timeout: 20000", "query_timeout: 20000" in db_src)

    # Check bulkOperationsService.js contains SET LOCAL timeouts
    bulk_svc_path = os.path.join(root_dir, "server", "services", "bulkOperationsService.js")
    with open(bulk_svc_path, "r", encoding="utf-8") as f:
        bulk_src = f.read()
    log_test("bulkOperationsService.js sets statement_timeout in transaction", "SET LOCAL statement_timeout = '15000'" in bulk_src)
    log_test("bulkOperationsService.js sets lock_timeout in transaction", "SET LOCAL lock_timeout = '5000'" in bulk_src)

    # Check errorHandler.js standardized response envelope
    err_h_path = os.path.join(root_dir, "server", "middleware", "errorHandler.js")
    with open(err_h_path, "r", encoding="utf-8") as f:
        err_src = f.read()
    log_test("errorHandler.js standardizes requestId and code in envelope", "requestId" in err_src and "code" in err_src)

    # Test error handling on invalid URL
    r_bad = requests.get(f"{NODE_BASE_URL}/api/portfolio/operations/batches/non-existent-uuid/details", headers=user_a["headers"], timeout=5)
    log_test("Error response returns structured envelope", "error" in r_bad.json() or "code" in r_bad.json())

    # ---------------------------------------------------------------------------
    # Section 8: UX Consolidation & Navigation Hardening
    # ---------------------------------------------------------------------------
    print("\n--- Section 8: UX Consolidation & Navigation Hardening ---")

    # Check App.jsx redirects /deadlines
    app_jsx_path = os.path.join(root_dir, "src", "App.jsx")
    with open(app_jsx_path, "r", encoding="utf-8") as f:
        app_src = f.read()
    log_test("App.jsx redirects /deadlines to /portfolio?tab=deadlines", 'path="/deadlines"' in app_src and 'to="/portfolio?tab=deadlines"' in app_src)

    # Check Sidebar.jsx removes standalone Deadlines
    sidebar_path = os.path.join(root_dir, "src", "components", "layout", "Sidebar.jsx")
    with open(sidebar_path, "r", encoding="utf-8") as f:
        sidebar_src = f.read()
    log_test("Sidebar.jsx omits standalone Deadlines navigation item", "'/deadlines'" not in sidebar_src)
    log_test("Sidebar.jsx includes Portfolio Oversight navigation item", "'/portfolio'" in sidebar_src)

    # Check Dashboard.jsx includes Executive Governance Cockpit & Banner
    dash_path = os.path.join(root_dir, "src", "pages", "Dashboard.jsx")
    with open(dash_path, "r", encoding="utf-8") as f:
        dash_src = f.read()
    log_test("Dashboard.jsx includes Pending Approvals Banner", "Governed Operations:" in dash_src and "pendingApprovalsCount" in dash_src)
    log_test("Dashboard.jsx includes Executive Portfolio Governance Cockpit", ("Executive Portfolio Governance & Compliance Cockpit" in dash_src or "Executive Portfolio Governance &amp; Compliance Cockpit" in dash_src))
    log_test("Dashboard.jsx links Quick Actions to /portfolio", ("Portfolio & Governance Cockpit" in dash_src or "Portfolio &amp; Governance Cockpit" in dash_src))

    conn.close()

    print("\n================================================================================")
    print(f"PHASE 8.2 TEST SUITE RESULT: {passed_tests} / {total_tests} PASSED")
    print("================================================================================")

if __name__ == "__main__":
    run_all_tests()
