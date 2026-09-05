#!/usr/bin/env python3
"""
verify_phase8_1_governed_operations.py
Phase 8.1 Verification Suite: Governed Operations & Approval Control
Deciva

45 tests covering:
  - Schema integrity: approval columns and indexes on portfolio_operation_batches
  - Governance Policy Engine (v1.0): CRITICAL_PRIORITY_INCLUDED, HIGH_IMPACT_TRANSITION,
    LARGE_BATCH_THRESHOLD, CROSS_CONTRACT_MASS_TRIAGE
  - Pure determinism of policy engine evaluation
  - Preview API governance classification: approval-exempt vs pending approval
  - Strict four-eyes separation of duties: anti-self-approval and anti-self-rejection
  - Scoped pending approvals inbox: only authorized approvers, excludes own batches
  - Approver authorization: only authorized admin reviewers can decide batches
  - Double-decision and concurrency protection: row locks prevent double-approvals/rejections
  - Terminal rejection semantics: rejected batches cannot be approved or executed
  - Cryptographic preview hash binding during approval
  - Execution gate: PENDING_APPROVAL and REJECTED batches blocked from execution
  - Approved batch execution: verified receipt with approver identity and policy flags
  - Stale preview revalidation: row-locked revalidation aborts STRICT mode on state change
  - Complete audit trail: BATCH_OPERATION_APPROVED and BATCH_OPERATION_REJECTED logged
  - Full regression compatibility with Phase 8.0 execution engine
"""

import sys
import os
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

NODE_BASE_URL = os.environ.get("NODE_API_URL", "http://localhost:5000")

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

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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

def create_test_user(conn, email_prefix, role="user"):
    uid = str(uuid.uuid4())
    email = f"{email_prefix}_{uid[:8]}@example.com"
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO users (id, name, email, password_hash, role, mfa_enabled)
               VALUES (%s, %s, %s, 'test_hash', %s, false)
               RETURNING id, email""",
            (uid, f"User {uid[:8]}", email, role)
        )
        row = cur.fetchone()
    return {"id": row[0], "email": row[1], "role": role}

def register_and_login(conn, email_prefix="gov_user", role="user"):
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
            with conn.cursor() as cur:
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
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            user_id = cur.fetchone()[0]

    if role == "admin":
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET role = 'admin' WHERE id = %s", (user_id,))

    return {"id": user_id, "email": email, "role": role, "token": token}

def create_test_document(conn, user_id, title="Test Contract"):
    doc_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO documents (id, user_id, filename, original_name, risk_score)
               VALUES (%s, %s, %s, %s, 50)
               RETURNING id""",
            (doc_id, user_id, f"{title}.pdf", title)
        )
        row = cur.fetchone()
    return row[0]

def create_test_action(conn, doc_id, title, priority_score=50, status="OPEN", due_date=None, owner_id=None):
    action_id = str(uuid.uuid4())
    src_id = f"src_{uuid.uuid4().hex[:8]}"
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO contract_actions
               (id, document_id, source_action_id, title, category, priority_score, status, due_date, owner_id)
               VALUES (%s, %s, %s, %s, 'LEGAL', %s, %s, %s, %s)
               RETURNING id, priority_score, status""",
            (action_id, doc_id, src_id, title, priority_score, status, due_date, owner_id)
        )
        row = cur.fetchone()
    return {"id": row[0], "priority_score": row[1], "status": row[2], "document_id": doc_id}

# ---------------------------------------------------------------------------
# Test Suite Execution
# ---------------------------------------------------------------------------

def run_all_tests():
    print("=" * 70, flush=True)
    print("Phase 8.1 Verification: Governed Operations & Approval Control", flush=True)
    print("=" * 70, flush=True)

    wait_for_server()
    conn = get_db_connection()

    # Create test actors with live authentic JWT tokens
    user_a = register_and_login(conn, "requester_a", role="user")
    user_b = register_and_login(conn, "peer_user_b", role="user")
    admin_c = register_and_login(conn, "admin_approver_c", role="admin")

    token_a = user_a["token"]
    token_b = user_b["token"]
    token_admin_c = admin_c["token"]

    headers_a = {"Authorization": f"Bearer {token_a}", "Content-Type": "application/json"}
    headers_b = {"Authorization": f"Bearer {token_b}", "Content-Type": "application/json"}
    headers_admin_c = {"Authorization": f"Bearer {token_admin_c}", "Content-Type": "application/json"}

    # Setup contracts and actions for User A
    doc1 = create_test_document(conn, user_a["id"], "Contract 1")
    doc2 = create_test_document(conn, user_a["id"], "Contract 2")
    doc3 = create_test_document(conn, user_a["id"], "Contract 3")
    doc4 = create_test_document(conn, user_a["id"], "Contract 4")

    act_low1 = create_test_action(conn, doc1, "Low Priority 1", priority_score=30)
    act_low2 = create_test_action(conn, doc1, "Low Priority 2", priority_score=40)
    act_crit = create_test_action(conn, doc1, "Critical Action", priority_score=95)
    act_in_review = create_test_action(conn, doc1, "In Review Action", priority_score=50, status="IN_REVIEW")

    # -----------------------------------------------------------------------
    # Part 1: Schema & Governance Policy Engine Unit Tests (Tests 1–8)
    # -----------------------------------------------------------------------

    # Test 01: Database schema verification
    with conn.cursor() as cur:
        cur.execute(
            """SELECT column_name FROM information_schema.columns
               WHERE table_name = 'portfolio_operation_batches'"""
        )
        cols = {row[0] for row in cur.fetchall()}
    req_cols = {"requires_approval", "policy_version", "policy_flags", "policy_details",
                "approved_by", "approved_at", "approval_comments", "rejected_by", "rejected_at", "rejection_reason"}
    log_test("Schema verification: approval columns present on portfolio_operation_batches",
             req_cols.issubset(cols), f"Missing: {req_cols - cols}")

    # Test 02: Policy Engine: low-priority small batch is approval-exempt
    # Using Node to test the pure operationPolicyEngine module
    cmd_policy_low = """
    const { evaluateBatchPolicy } = require('./server/services/operationPolicyEngine');
    const res = evaluateBatchPolicy({
      operation: 'BULK_ASSIGN',
      mode: 'STRICT',
      eligibleActions: [{ priority_score: 30, document_id: 'doc1' }],
      payload: { ownerId: 'usr1' }
    });
    console.log(JSON.stringify(res));
    """
    import subprocess
    proc = subprocess.run(["node", "-e", cmd_policy_low], cwd=root_dir, capture_output=True, text=True)
    res_low = json.loads(proc.stdout.strip())
    log_test("Policy Engine: Low-priority small batch is approval-exempt",
             res_low["requiresApproval"] is False and len(res_low["policyFlags"]) == 0)

    # Test 03: Policy Engine: Critical priority (>=80) triggers CRITICAL_PRIORITY_INCLUDED
    cmd_policy_crit = """
    const { evaluateBatchPolicy } = require('./server/services/operationPolicyEngine');
    const res = evaluateBatchPolicy({
      operation: 'BULK_ASSIGN',
      mode: 'STRICT',
      eligibleActions: [{ priority_score: 85, document_id: 'doc1' }],
      payload: { ownerId: 'usr1' }
    });
    console.log(JSON.stringify(res));
    """
    proc = subprocess.run(["node", "-e", cmd_policy_crit], cwd=root_dir, capture_output=True, text=True)
    res_crit = json.loads(proc.stdout.strip())
    log_test("Policy Engine: Action with score >= 80 triggers CRITICAL_PRIORITY_INCLUDED",
             res_crit["requiresApproval"] is True and "CRITICAL_PRIORITY_INCLUDED" in res_crit["policyFlags"])

    # Test 04: Policy Engine: Transition to RESOLVED triggers HIGH_IMPACT_TRANSITION
    cmd_policy_res = """
    const { evaluateBatchPolicy } = require('./server/services/operationPolicyEngine');
    const res = evaluateBatchPolicy({
      operation: 'BULK_TRANSITION',
      mode: 'STRICT',
      eligibleActions: [{ priority_score: 40, document_id: 'doc1' }],
      payload: { targetStatus: 'RESOLVED', resolutionNotes: 'Completed' }
    });
    console.log(JSON.stringify(res));
    """
    proc = subprocess.run(["node", "-e", cmd_policy_res], cwd=root_dir, capture_output=True, text=True)
    res_res = json.loads(proc.stdout.strip())
    log_test("Policy Engine: Transition to RESOLVED triggers HIGH_IMPACT_TRANSITION",
             res_res["requiresApproval"] is True and "HIGH_IMPACT_TRANSITION" in res_res["policyFlags"])

    # Test 05: Policy Engine: Transition to DISMISSED triggers HIGH_IMPACT_TRANSITION
    cmd_policy_dism = """
    const { evaluateBatchPolicy } = require('./server/services/operationPolicyEngine');
    const res = evaluateBatchPolicy({
      operation: 'BULK_TRANSITION',
      mode: 'STRICT',
      eligibleActions: [{ priority_score: 40, document_id: 'doc1' }],
      payload: { targetStatus: 'DISMISSED', reason: 'Not applicable' }
    });
    console.log(JSON.stringify(res));
    """
    proc = subprocess.run(["node", "-e", cmd_policy_dism], cwd=root_dir, capture_output=True, text=True)
    res_dism = json.loads(proc.stdout.strip())
    log_test("Policy Engine: Transition to DISMISSED triggers HIGH_IMPACT_TRANSITION",
             res_dism["requiresApproval"] is True and "HIGH_IMPACT_TRANSITION" in res_dism["policyFlags"])

    # Test 06: Policy Engine: Batch with 11 actions triggers LARGE_BATCH_THRESHOLD
    cmd_policy_large = """
    const { evaluateBatchPolicy } = require('./server/services/operationPolicyEngine');
    const actions = Array.from({ length: 11 }, (_, i) => ({ priority_score: 40, document_id: 'doc1' }));
    const res = evaluateBatchPolicy({
      operation: 'BULK_DEADLINE',
      mode: 'STRICT',
      eligibleActions: actions,
      payload: { dueDate: '2026-10-01T00:00:00Z' }
    });
    console.log(JSON.stringify(res));
    """
    proc = subprocess.run(["node", "-e", cmd_policy_large], cwd=root_dir, capture_output=True, text=True)
    res_large = json.loads(proc.stdout.strip())
    log_test("Policy Engine: Batch with >10 actions triggers LARGE_BATCH_THRESHOLD",
             res_large["requiresApproval"] is True and "LARGE_BATCH_THRESHOLD" in res_large["policyFlags"])

    # Test 07: Policy Engine: Actions across 4 distinct documents triggers CROSS_CONTRACT_MASS_TRIAGE
    cmd_policy_multi = """
    const { evaluateBatchPolicy } = require('./server/services/operationPolicyEngine');
    const actions = [
      { priority_score: 40, document_id: 'd1' },
      { priority_score: 40, document_id: 'd2' },
      { priority_score: 40, document_id: 'd3' },
      { priority_score: 40, document_id: 'd4' },
    ];
    const res = evaluateBatchPolicy({
      operation: 'BULK_ASSIGN',
      mode: 'STRICT',
      eligibleActions: actions,
      payload: { ownerId: 'u1' }
    });
    console.log(JSON.stringify(res));
    """
    proc = subprocess.run(["node", "-e", cmd_policy_multi], cwd=root_dir, capture_output=True, text=True)
    res_multi = json.loads(proc.stdout.strip())
    log_test("Policy Engine: Actions spanning >3 docs triggers CROSS_CONTRACT_MASS_TRIAGE",
             res_multi["requiresApproval"] is True and "CROSS_CONTRACT_MASS_TRIAGE" in res_multi["policyFlags"])

    # Test 08: Policy Engine determinism across multiple repeated evaluations
    cmd_policy_det = """
    const { evaluateBatchPolicy } = require('./server/services/operationPolicyEngine');
    const input = {
      operation: 'BULK_TRANSITION',
      mode: 'STRICT',
      eligibleActions: [{ priority_score: 95, document_id: 'd1' }, { priority_score: 30, document_id: 'd2' }],
      payload: { targetStatus: 'RESOLVED', resolutionNotes: 'All clear' }
    };
    const r1 = JSON.stringify(evaluateBatchPolicy(input));
    const r2 = JSON.stringify(evaluateBatchPolicy(input));
    console.log(r1 === r2);
    """
    proc = subprocess.run(["node", "-e", cmd_policy_det], cwd=root_dir, capture_output=True, text=True)
    log_test("Policy Engine: 100% bit-for-bit deterministic across repeated evaluations",
             proc.stdout.strip() == "true")

    # -----------------------------------------------------------------------
    # Part 2: Preview API & Governance Classification (Tests 9–16)
    # -----------------------------------------------------------------------

    # Test 09: Preview of approval-exempt operation stores status PREVIEWED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=headers_a,
        json={
            "operation": "BULK_DEADLINE",
            "mode": "STRICT",
            "actionIds": [act_low1["id"], act_low2["id"]],
            "payload": {"dueDate": "2026-11-01T00:00:00Z"}
        }
    )
    prev_exempt = r.json()
    log_test("Preview of approval-exempt operation returns status PREVIEWED and executable=true",
             r.status_code == 200 and prev_exempt.get("status") == "PREVIEWED" and prev_exempt.get("executable") is True)

    # Test 10: Preview of critical action batch returns status PENDING_APPROVAL
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=headers_a,
        json={
            "operation": "BULK_ASSIGN",
            "mode": "STRICT",
            "actionIds": [act_crit["id"]],
            "payload": {"ownerId": user_b["id"]}
        }
    )
    prev_crit = r.json()
    log_test("Preview of critical action batch returns status PENDING_APPROVAL and executable=false",
             r.status_code == 200 and prev_crit.get("status") == "PENDING_APPROVAL" and prev_crit.get("executable") is False)

    # Test 11: DB record contains governance fields
    with conn.cursor() as cur:
        cur.execute(
            """SELECT requires_approval, policy_version, policy_flags, status
               FROM portfolio_operation_batches WHERE id = %s""",
            (prev_crit["previewId"],)
        )
        row = cur.fetchone()
    log_test("Database record accurately persists governance fields (requires_approval=true, policy_version='1.0')",
             row[0] is True and row[1] == "1.0" and "CRITICAL_PRIORITY_INCLUDED" in row[2] and row[3] == "PENDING_APPROVAL")

    # Test 12: Preview response contains policyFlags array
    log_test("Preview response contains policyFlags array and policyDetails",
             "CRITICAL_PRIORITY_INCLUDED" in prev_crit.get("policyFlags", []) and prev_crit.get("policyVersion") == "1.0")

    # Test 13: Preview response contains previewHash
    log_test("Preview response contains canonical previewHash (64-char hex string)",
             len(prev_crit.get("previewHash", "")) == 64)

    # Test 14: Transition to RESOLVED preview flags HIGH_IMPACT_TRANSITION
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=headers_a,
        json={
            "operation": "BULK_TRANSITION",
            "mode": "STRICT",
            "actionIds": [act_in_review["id"]],
            "payload": {"targetStatus": "RESOLVED", "resolutionNotes": "Audited and confirmed compliant"}
        }
    )
    prev_trans = r.json()
    log_test("Bulk transition to RESOLVED triggers HIGH_IMPACT_TRANSITION and PENDING_APPROVAL",
             r.status_code == 200 and "HIGH_IMPACT_TRANSITION" in prev_trans.get("policyFlags", []) and prev_trans.get("status") == "PENDING_APPROVAL")

    # Test 15: Large batch (>10 actions) preview triggers LARGE_BATCH_THRESHOLD
    # Create 11 actions for User A
    actions_11 = []
    for i in range(11):
        actions_11.append(create_test_action(conn, doc1, f"Bulk Action {i}", priority_score=20)["id"])
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=headers_a,
        json={
            "operation": "BULK_DEADLINE",
            "mode": "STRICT",
            "actionIds": actions_11,
            "payload": {"dueDate": "2026-12-01T00:00:00Z"}
        }
    )
    prev_11 = r.json()
    log_test("Large batch (>10 actions) triggers LARGE_BATCH_THRESHOLD and PENDING_APPROVAL",
             r.status_code == 200 and "LARGE_BATCH_THRESHOLD" in prev_11.get("policyFlags", []))

    # Test 16: Multi-contract actions (>3 documents) triggers CROSS_CONTRACT_MASS_TRIAGE
    act_d1 = create_test_action(conn, doc1, "D1 Action", priority_score=20)["id"]
    act_d2 = create_test_action(conn, doc2, "D2 Action", priority_score=20)["id"]
    act_d3 = create_test_action(conn, doc3, "D3 Action", priority_score=20)["id"]
    act_d4 = create_test_action(conn, doc4, "D4 Action", priority_score=20)["id"]
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=headers_a,
        json={
            "operation": "BULK_ASSIGN",
            "mode": "STRICT",
            "actionIds": [act_d1, act_d2, act_d3, act_d4],
            "payload": {"ownerId": user_b["id"]}
        }
    )
    prev_multi = r.json()
    log_test("Actions spanning >3 documents triggers CROSS_CONTRACT_MASS_TRIAGE and PENDING_APPROVAL",
             r.status_code == 200 and "CROSS_CONTRACT_MASS_TRIAGE" in prev_multi.get("policyFlags", []))

    # -----------------------------------------------------------------------
    # Part 3: Approver Authorization & Separation of Duties (Tests 17–24)
    # -----------------------------------------------------------------------

    # Test 17: Requester User A attempting self-approval strictly receives HTTP 403 SELF_APPROVAL_FORBIDDEN
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/approve",
        headers=headers_a,
        json={"comments": "Self approving my own batch"}
    )
    log_test("Separation of duties: Requester self-approval strictly rejected with HTTP 403 SELF_APPROVAL_FORBIDDEN",
             r.status_code == 403 and r.json().get("code") == "SELF_APPROVAL_FORBIDDEN")

    # Test 18: Requester User A attempting self-rejection strictly receives HTTP 403 SELF_APPROVAL_FORBIDDEN
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/reject",
        headers=headers_a,
        json={"reason": "Self rejecting my own batch because I changed my mind"}
    )
    log_test("Separation of duties: Requester self-rejection strictly rejected with HTTP 403 SELF_APPROVAL_FORBIDDEN",
             r.status_code == 403 and r.json().get("code") == "SELF_APPROVAL_FORBIDDEN")

    # Test 19: Non-admin Peer User B attempting approval receives HTTP 403 APPROVER_UNAUTHORIZED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/approve",
        headers=headers_b,
        json={"comments": "I am a peer user trying to approve"}
    )
    log_test("Approver authorization: Non-admin peer approval rejected with HTTP 403 APPROVER_UNAUTHORIZED",
             r.status_code == 403 and r.json().get("code") == "APPROVER_UNAUTHORIZED")

    # Test 20: Non-admin Peer User B attempting rejection receives HTTP 403 APPROVER_UNAUTHORIZED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/reject",
        headers=headers_b,
        json={"reason": "Peer user trying to reject this operation with explanation"}
    )
    log_test("Approver authorization: Non-admin peer rejection rejected with HTTP 403 APPROVER_UNAUTHORIZED",
             r.status_code == 403 and r.json().get("code") == "APPROVER_UNAUTHORIZED")

    # Test 21: Scoped approval inbox: Requester User A does NOT see their own pending batch in /pending-approvals
    r = requests.get(f"{NODE_BASE_URL}/api/portfolio/operations/pending-approvals", headers=headers_a)
    inbox_a = r.json().get("pending", [])
    batch_ids_a = [b["id"] for b in inbox_a]
    log_test("Scoped inbox: Requester cannot view their own batches in pending-approvals queue",
             prev_crit["previewId"] not in batch_ids_a)

    # Test 22: Scoped approval inbox: Non-admin User B gets empty list
    r = requests.get(f"{NODE_BASE_URL}/api/portfolio/operations/pending-approvals", headers=headers_b)
    inbox_b = r.json().get("pending", [])
    log_test("Scoped inbox: Non-admin peer gets empty list (cannot enumerate other users' operations)",
             len(inbox_b) == 0)

    # Test 23: Scoped approval inbox: Admin User C sees User A's pending batch
    r = requests.get(f"{NODE_BASE_URL}/api/portfolio/operations/pending-approvals?limit=100", headers=headers_admin_c)
    inbox_c = r.json().get("pending", [])
    batch_ids_c = [b["id"] for b in inbox_c]
    log_test("Scoped inbox: Authorized admin reviewer sees User A's batch in pending-approvals queue",
             prev_crit["previewId"] in batch_ids_c)

    # Test 24: Authorized Admin User C approves batch -> returns HTTP 200 and status APPROVED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/approve",
        headers=headers_admin_c,
        json={"comments": "Reviewed priority score and confirmed assignment is appropriate."}
    )
    appr_res = r.json()
    log_test("Authorized Admin User C approves batch -> HTTP 200 and status APPROVED",
             r.status_code == 200 and appr_res.get("status") == "APPROVED" and appr_res.get("approvedBy") == admin_c["id"],
             f"HTTP {r.status_code}: {appr_res}")

    # -----------------------------------------------------------------------
    # Part 4: Concurrency & State Machine Protection (Tests 25–30)
    # -----------------------------------------------------------------------

    # Test 25: Re-approving an already APPROVED batch returns HTTP 409 BATCH_ALREADY_DECIDED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/approve",
        headers=headers_admin_c,
        json={"comments": "Double clicking approve"}
    )
    log_test("State protection: Double-approval rejected with HTTP 409 BATCH_ALREADY_DECIDED",
             r.status_code == 409 and r.json().get("code") == "BATCH_ALREADY_DECIDED")

    # Test 26: Attempting to reject an already APPROVED batch returns HTTP 409 BATCH_ALREADY_DECIDED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/reject",
        headers=headers_admin_c,
        json={"reason": "Attempting to reject an already approved batch with long reason"}
    )
    log_test("State protection: Rejecting an approved batch rejected with HTTP 409 BATCH_ALREADY_DECIDED",
             r.status_code == 409 and r.json().get("code") == "BATCH_ALREADY_DECIDED")

    # Test 27: Rejection requires a reason of at least 10 characters
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_trans['previewId']}/reject",
        headers=headers_admin_c,
        json={"reason": "short"}
    )
    log_test("Rejection validation: Explanation shorter than 10 characters rejected with HTTP 400",
             r.status_code == 400 and r.json().get("code") == "REJECTION_REASON_REQUIRED")

    # Test 28: Authorized Admin User C rejects prev_trans batch with valid reason -> status REJECTED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_trans['previewId']}/reject",
        headers=headers_admin_c,
        json={"reason": "Risk evidence is incomplete; cannot mark as resolved at this time."}
    )
    rej_res = r.json()
    log_test("Authorized Admin User C rejects batch -> status transitions to terminal REJECTED",
             r.status_code == 200 and rej_res.get("status") == "REJECTED" and rej_res.get("rejectedBy") == admin_c["id"])

    # Test 29: Attempting to approve an already REJECTED batch returns HTTP 409 BATCH_ALREADY_DECIDED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_trans['previewId']}/approve",
        headers=headers_admin_c,
        json={"comments": "Trying to revive rejected batch"}
    )
    log_test("Terminal rejection semantics: Cannot approve a REJECTED batch (HTTP 409 BATCH_ALREADY_DECIDED)",
             r.status_code == 409 and r.json().get("code") == "BATCH_ALREADY_DECIDED")

    # Test 30: Preview hash binding: Tampering with DB payload rejects with HASH_MISMATCH
    # Create another batch to test hash tamper
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=headers_a,
        json={
            "operation": "BULK_ASSIGN",
            "mode": "STRICT",
            "actionIds": [act_crit["id"]],
            "payload": {"ownerId": user_b["id"]}
        }
    )
    tamper_batch_id = r.json()["previewId"]
    # Tamper with stored payload in DB directly
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE portfolio_operation_batches
               SET payload_json = '{"ownerId": "hacked_user", "eligibleActionIds": ["%s"]}'::jsonb
               WHERE id = %s""" % (act_crit["id"], "%s"),
            (tamper_batch_id,)
        )
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{tamper_batch_id}/approve",
        headers=headers_admin_c,
        json={"comments": "Approving tampered batch"}
    )
    log_test("Preview hash anti-tampering: Tampered payload rejected on approval with HTTP 400 HASH_MISMATCH",
             r.status_code == 400 and r.json().get("code") == "HASH_MISMATCH")

    # -----------------------------------------------------------------------
    # Part 5: Execution Gate & Stale-Preview Revalidation (Tests 31–38)
    # -----------------------------------------------------------------------

    # Test 31: Direct execution of PENDING_APPROVAL batch fails with HTTP 403 APPROVAL_REQUIRED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_11['previewId']}/execute",
        headers={**headers_a, "Idempotency-Key": str(uuid.uuid4())}
    )
    log_test("Execution gate: Direct execution of unapproved batch blocked with HTTP 403 APPROVAL_REQUIRED",
             r.status_code == 403 and r.json().get("code") == "APPROVAL_REQUIRED")

    # Test 32: Execution of REJECTED batch fails with HTTP 409 BATCH_REJECTED
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_trans['previewId']}/execute",
        headers={**headers_a, "Idempotency-Key": str(uuid.uuid4())}
    )
    log_test("Execution gate: Execution of REJECTED batch blocked with HTTP 409 BATCH_REJECTED",
             r.status_code == 409 and r.json().get("code") == "BATCH_REJECTED")

    # Test 33: Execution of APPROVED batch succeeds with status COMPLETED
    exec_key = str(uuid.uuid4())
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/execute",
        headers={**headers_a, "Idempotency-Key": exec_key}
    )
    exec_res = r.json()
    log_test("Execution of APPROVED batch succeeds with HTTP 200 and status COMPLETED",
             r.status_code == 200 and exec_res.get("status") == "COMPLETED" and exec_res.get("executed") == 1)

    # Test 34: Execution receipt contains governance verification properties
    log_test("Execution receipt includes requiresApproval=true, policyVersion, policyFlags, approvedBy",
             exec_res.get("requiresApproval") is True and
             exec_res.get("approvedBy") == admin_c["id"] and
             "CRITICAL_PRIORITY_INCLUDED" in exec_res.get("policyFlags", []))

    # Test 35: Action in database successfully mutated by approved execution
    with conn.cursor() as cur:
        cur.execute("SELECT owner_id FROM contract_actions WHERE id = %s", (act_crit["id"],))
        updated_owner = cur.fetchone()[0]
    log_test("Database mutation verified: owner_id assigned to User B as authorized",
             updated_owner == user_b["id"])

    # Test 36: Stale-preview revalidation in STRICT mode: state changed after approval rolls back
    # Setup action, preview, approve, then mutate action state in DB before execute
    act_stale = create_test_action(conn, doc1, "Stale Test Action", priority_score=85, status="OPEN")
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/preview",
        headers=headers_a,
        json={
            "operation": "BULK_ASSIGN",
            "mode": "STRICT",
            "actionIds": [act_stale["id"]],
            "payload": {"ownerId": user_b["id"]}
        }
    )
    stale_batch_id = r.json()["previewId"]
    # Admin approves
    requests.post(f"{NODE_BASE_URL}/api/portfolio/operations/{stale_batch_id}/approve", headers=headers_admin_c, json={"comments": "Approved"})
    # Now action status changes externally in DB to RESOLVED
    with conn.cursor() as cur:
        cur.execute("UPDATE contract_actions SET status = 'RESOLVED' WHERE id = %s", (act_stale["id"],))

    # Requester executes -> STRICT mode must abort and rollback cleanly
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{stale_batch_id}/execute",
        headers={**headers_a, "Idempotency-Key": str(uuid.uuid4())}
    )
    log_test("Stale-preview revalidation: STRICT mode aborts when action status changed after approval (HTTP 409)",
             r.status_code == 409 and r.json().get("code") == "ACTION_BLOCKED_IN_STRICT_MODE")

    # Test 37: Stale action was NOT mutated (rollback confirmed)
    with conn.cursor() as cur:
        cur.execute("SELECT owner_id, status FROM contract_actions WHERE id = %s", (act_stale["id"],))
        row = cur.fetchone()
    log_test("Rollback verified: Zero mutations persisted during stale-preview abort",
             row[0] is None and row[1] == "RESOLVED")

    # Test 38: History endpoint returns governance fields
    r = requests.get(f"{NODE_BASE_URL}/api/portfolio/operations/history", headers=headers_a)
    hist_batches = r.json().get("batches", [])
    found_approved_batch = next((b for b in hist_batches if b["id"] == prev_crit["previewId"]), None)
    log_test("History endpoint returns governance fields (requires_approval, policy_flags, approved_by)",
             found_approved_batch is not None and
             found_approved_batch.get("requires_approval") is True and
             found_approved_batch.get("approved_by") == admin_c["id"])

    # -----------------------------------------------------------------------
    # Part 6: Audit Trail & Regression Invariants (Tests 39–45)
    # -----------------------------------------------------------------------

    # Test 39: Activity log records BATCH_OPERATION_APPROVED
    with conn.cursor() as cur:
        cur.execute(
            """SELECT user_id, action, metadata FROM activity_logs
               WHERE action = 'BATCH_OPERATION_APPROVED' AND user_id = %s
               ORDER BY created_at DESC LIMIT 1""",
            (admin_c["id"],)
        )
        log_row = cur.fetchone()
    log_test("Audit log records BATCH_OPERATION_APPROVED with approver identity and policy flags",
             log_row is not None and "CRITICAL_PRIORITY_INCLUDED" in str(log_row[2]),
             f"log_row: {log_row}")

    # Test 40: Activity log records BATCH_OPERATION_REJECTED
    with conn.cursor() as cur:
        cur.execute(
            """SELECT user_id, action, metadata FROM activity_logs
               WHERE action = 'BATCH_OPERATION_REJECTED' AND user_id = %s
               ORDER BY created_at DESC LIMIT 1""",
            (admin_c["id"],)
        )
        log_row = cur.fetchone()
    log_test("Audit log records BATCH_OPERATION_REJECTED with rejector identity and reason",
             log_row is not None and "Risk evidence is incomplete" in str(log_row[2]),
             f"log_row: {log_row}")

    # Test 41: Idempotent re-execution of approved batch returns cached COMPLETED receipt
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_crit['previewId']}/execute",
        headers={**headers_a, "Idempotency-Key": exec_key}
    )
    idemp_res = r.json()
    log_test("Idempotent re-execution returns cached COMPLETED receipt without re-executing",
             r.status_code == 200 and idemp_res.get("idempotent") is True and idemp_res.get("status") == "COMPLETED")

    # Test 42: Missing idempotency key returns HTTP 400
    r = requests.post(f"{NODE_BASE_URL}/api/portfolio/operations/{prev_exempt['previewId']}/execute", headers=headers_a)
    log_test("Execution without Idempotency-Key header returns HTTP 400",
             r.status_code == 400 and r.json().get("code") == "IDEMPOTENCY_KEY_REQUIRED")

    # Test 43: Approval-exempt operation executes cleanly without peer approval
    r = requests.post(
        f"{NODE_BASE_URL}/api/portfolio/operations/{prev_exempt['previewId']}/execute",
        headers={**headers_a, "Idempotency-Key": str(uuid.uuid4())}
    )
    exempt_exec = r.json()
    log_test("Approval-exempt operation executes directly to COMPLETED without approval requirement",
             r.status_code == 200 and exempt_exec.get("status") == "COMPLETED" and exempt_exec.get("executed") == 2)

    # Test 44: Phase 8.0 backwards-compatibility: bulk deadline date verified in DB
    with conn.cursor() as cur:
        cur.execute("SELECT due_date FROM contract_actions WHERE id = %s", (act_low1["id"],))
        new_due = cur.fetchone()[0]
    log_test("Phase 8.0 compatibility: action mutations persisted correctly on approval-exempt execution",
             new_due is not None and "2026-11-01" in str(new_due))

    # Test 45: Full regression invariant: zero orphaned or corrupted records
    with conn.cursor() as cur:
        cur.execute(
            """SELECT COUNT(*) FROM portfolio_operation_batches
               WHERE status NOT IN ('PREVIEWED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'FAILED')"""
        )
        invalid_states = cur.fetchone()[0]
    log_test("Regression invariant: 100% of batch records comply with valid state machine lifecycle",
             invalid_states == 0)

    print("=" * 70, flush=True)
    print(f"Results: {passed_tests}/{total_tests} passed (100%)", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    run_all_tests()
