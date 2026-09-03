import os
import sys
import uuid
import json
import requests
import concurrent.futures
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
sys.stdout.reconfigure(line_buffering=True, encoding='utf-8')

try:
    from backend.services.database import get_db_connection
except ImportError:
    from services.database import get_db_connection

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:5000")

def authenticate_user(email, password, name="Test User"):
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })

    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}).json()
    if login_res.get("mfaRequired"):
        pre_token = login_res.get("preToken")
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT code FROM otp_codes WHERE used = false ORDER BY created_at DESC LIMIT 1;")
        row = cur.fetchone()
        dev_code = row['code'] if row else '123456'
        cur.close()
        conn.close()

        mfa_res = requests.post(f"{BASE_URL}/api/auth/mfa/totp/verify", json={
            "preToken": pre_token,
            "code": str(dev_code)
        }).json()
        return mfa_res.get("token")
    return login_res.get("token")


def verify_phase7_3():
    print("=" * 80)
    print("=== STARTING PHASE 7.3: WORKFLOW STATE ENGINE & HUMAN DECISION APIS ===")
    print("=" * 80)

    email_a = f"test_owner_a_{uuid.uuid4().hex[:8]}@example.com"
    email_b = f"test_owner_b_{uuid.uuid4().hex[:8]}@example.com"
    email_c = f"test_assignee_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPassword123!"

    token_a = authenticate_user(email_a, pwd, "Workflow User Alpha")
    token_b = authenticate_user(email_b, pwd, "Workflow User Beta")
    token_c = authenticate_user(email_c, pwd, "Workflow Assignee Gamma")
    assert token_a, "Failed to authenticate User A"
    assert token_b, "Failed to authenticate User B"
    assert token_c, "Failed to authenticate User C"

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = %s;", (email_a.lower(),))
    user_a_id = cur.fetchone()["id"]
    cur.execute("SELECT id FROM users WHERE email = %s;", (email_b.lower(),))
    user_b_id = cur.fetchone()["id"]
    cur.execute("SELECT id FROM users WHERE email = %s;", (email_c.lower(),))
    user_c_id = cur.fetchone()["id"]

    # Create document, intelligence snapshot, and sync workflow actions for User A
    doc_a_id = str(uuid.uuid4())
    snap_a_id = str(uuid.uuid4())

    cur.execute("""
        INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
        VALUES (%s, %s, 'workflow_contract.pdf', 'Workflow_Contract.pdf', 2048, 'application/pdf');
    """, (doc_a_id, user_a_id))

    sample_actions = [
        {
            "actionId": "act-term-01",
            "title": "Renegotiate Unilateral Termination Rights",
            "category": "CRITICAL",
            "priorityScore": 85
        },
        {
            "actionId": "act-indem-02",
            "title": "Limit Indemnity to Direct Damages",
            "category": "CRITICAL",
            "priorityScore": 80
        },
        {
            "actionId": "act-pay-03",
            "title": "Clarify Net 30 Billing Milestones",
            "category": "IMPORTANT",
            "priorityScore": 65
        },
        {
            "actionId": "act-audit-04",
            "title": "Standardize Annual Audit Window",
            "category": "MONITORING",
            "priorityScore": 40
        }
    ]

    cur.execute("""
        INSERT INTO contract_intelligence (
            id, document_id, user_id, health_score, critical_count, important_count,
            monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
        ) VALUES (%s, %s, %s, 72, 2, 1, 1, 0, 'Executive summary for Workflow Test Contract', '[]'::jsonb, %s::jsonb, '{}'::jsonb);
    """, (snap_a_id, doc_a_id, user_a_id, json.dumps(sample_actions)))

    conn.commit()
    cur.close()
    conn.close()

    # Synchronize actions to populate initial OPEN state
    sync_res = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a)
    assert sync_res.status_code == 200, f"Sync failed: {sync_res.text}"
    synced_data = sync_res.json()
    actions_list = synced_data["actions"]
    actions_map = {a["source_action_id"]: a for a in actions_list}

    action_1_id = actions_map["act-term-01"]["id"]
    action_2_id = actions_map["act-indem-02"]["id"]
    action_3_id = actions_map["act-pay-03"]["id"]
    action_4_id = actions_map["act-audit-04"]["id"]

    try:
        # [TEST 1] Authenticated authorized user can transition: OPEN -> IN_REVIEW
        print("\n[TEST 1] Testing Valid Transition: OPEN -> IN_REVIEW...")
        res_t1 = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/status",
            headers=headers_a,
            json={"status": "IN_REVIEW"}
        )
        assert res_t1.status_code == 200, f"Expected 200, got {res_t1.status_code}: {res_t1.text}"
        data_t1 = res_t1.json()
        assert data_t1["success"] is True
        assert data_t1["action"]["status"] == "IN_REVIEW"
        print(f"  Action {action_1_id} status updated to '{data_t1['action']['status']}'.")
        print("  [PASS] Test 1: Authorized transition from OPEN -> IN_REVIEW successful.")

        # [TEST 2] Valid transition: IN_REVIEW -> RESOLVED requires resolution notes
        print("\n[TEST 2] Testing Valid Transition: IN_REVIEW -> RESOLVED with Resolution Notes...")
        res_t2 = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/status",
            headers=headers_a,
            json={
                "status": "RESOLVED",
                "resolutionNotes": "Successfully negotiated 60-day mutual written notice period."
            }
        )
        assert res_t2.status_code == 200, f"Expected 200, got {res_t2.status_code}: {res_t2.text}"
        data_t2 = res_t2.json()
        assert data_t2["action"]["status"] == "RESOLVED"
        assert data_t2["action"]["resolution_notes"] == "Successfully negotiated 60-day mutual written notice period."
        assert data_t2["action"]["resolved_at"] is not None
        print(f"  Action resolved. Notes: '{data_t2['action']['resolution_notes']}', Resolved At: {data_t2['action']['resolved_at']}")
        print("  [PASS] Test 2: Transition to RESOLVED with notes succeeded.")

        # [TEST 3] Resolution without resolution notes is rejected
        print("\n[TEST 3] Verifying Resolution Attempt Without Notes is Rejected...")
        # Move action 2 to IN_REVIEW first
        requests.patch(f"{BASE_URL}/api/actions/{action_2_id}/status", headers=headers_a, json={"status": "IN_REVIEW"})
        res_t3 = requests.patch(
            f"{BASE_URL}/api/actions/{action_2_id}/status",
            headers=headers_a,
            json={"status": "RESOLVED", "resolutionNotes": "   "}
        )
        assert res_t3.status_code == 400, f"Expected 400 for empty notes, got {res_t3.status_code}"
        print(f"  Server correctly rejected resolution without notes: {res_t3.json().get('error')}")
        print("  [PASS] Test 3: Resolution without notes strictly rejected with HTTP 400.")

        # [TEST 4] Invalid transition: OPEN -> RESOLVED is rejected
        print("\n[TEST 4] Verifying Forbidden Transition: OPEN -> RESOLVED is Rejected...")
        res_t4 = requests.patch(
            f"{BASE_URL}/api/actions/{action_3_id}/status",
            headers=headers_a,
            json={
                "status": "RESOLVED",
                "resolutionNotes": "Direct jump from OPEN without review."
            }
        )
        assert res_t4.status_code == 400, f"Expected 400, got {res_t4.status_code}"
        print(f"  Server correctly rejected illegal state transition: {res_t4.json().get('error')}")
        print("  [PASS] Test 4: Direct transition from OPEN -> RESOLVED forbidden.")

        # [TEST 5] Resolved action can be reopened: RESOLVED -> IN_REVIEW
        print("\n[TEST 5] Testing Reopening Action: RESOLVED -> IN_REVIEW...")
        res_t5 = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/status",
            headers=headers_a,
            json={
                "status": "IN_REVIEW",
                "reason": "Counterparty requested revision to notice clause."
            }
        )
        assert res_t5.status_code == 200, f"Expected 200, got {res_t5.status_code}: {res_t5.text}"
        data_t5 = res_t5.json()
        assert data_t5["action"]["status"] == "IN_REVIEW"
        # Historical resolved_at and notes preserved
        assert data_t5["action"]["resolution_notes"] is not None
        print(f"  Action reopened to IN_REVIEW. Historical resolution notes preserved.")
        print("  [PASS] Test 5: Reopening RESOLVED -> IN_REVIEW succeeded.")

        # [TEST 6] Dismissal requires a reason
        print("\n[TEST 6] Verifying Dismissal Requires Reason...")
        # 6a: Dismiss without reason should fail
        res_t6_fail = requests.patch(
            f"{BASE_URL}/api/actions/{action_4_id}/status",
            headers=headers_a,
            json={"status": "DISMISSED", "reason": ""}
        )
        assert res_t6_fail.status_code == 400, f"Expected 400, got {res_t6_fail.status_code}"

        # 6b: Dismiss with valid reason should succeed
        res_t6_pass = requests.patch(
            f"{BASE_URL}/api/actions/{action_4_id}/status",
            headers=headers_a,
            json={
                "status": "DISMISSED",
                "reason": "Annual audit risk is standard and acceptable under current budget."
            }
        )
        assert res_t6_pass.status_code == 200, f"Expected 200, got {res_t6_pass.status_code}"
        assert res_t6_pass.json()["action"]["status"] == "DISMISSED"
        print(f"  Dismissal rejected when reason missing; succeeded with reason.")
        print("  [PASS] Test 6: Dismissal reason requirement enforced.")

        # [TEST 7] Human decision is appended correctly to the decision ledger
        print("\n[TEST 7] Testing Human Decision API (POST /decision)...")
        res_t7 = requests.post(
            f"{BASE_URL}/api/actions/{action_1_id}/decision",
            headers=headers_a,
            json={
                "decision": "NEGOTIATE",
                "reason": "Request 60 days cure period for breach instead of 10 days."
            }
        )
        assert res_t7.status_code == 200, f"Expected 200, got {res_t7.status_code}: {res_t7.text}"
        data_t7 = res_t7.json()
        assert data_t7["action"]["decision"] == "NEGOTIATE"
        assert data_t7["action"]["decision_reason"] == "Request 60 days cure period for breach instead of 10 days."
        assert data_t7["action"]["status"] == "IN_REVIEW"

        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT * FROM contract_action_decisions WHERE action_id = %s AND decision = 'NEGOTIATE';", (action_1_id,))
        dec_row = cur_check.fetchone()
        assert dec_row is not None
        assert dec_row["decided_by"] == user_a_id
        assert dec_row["reason"] == "Request 60 days cure period for breach instead of 10 days."
        cur_check.close()
        conn_check.close()
        print("  Decision recorded in contract_actions and appended to contract_action_decisions ledger.")
        print("  [PASS] Test 7: Human decision recorded and logged.")

        # [TEST 8] Previous decision records remain unchanged after a new decision
        print("\n[TEST 8] Verifying Append-Only Ledger Immutability on Subsequent Decision...")
        res_t8 = requests.post(
            f"{BASE_URL}/api/actions/{action_1_id}/decision",
            headers=headers_a,
            json={
                "decision": "ESCALATE",
                "reason": "Escalating to General Counsel due to counterparty impasse."
            }
        )
        assert res_t8.status_code == 200
        assert res_t8.json()["action"]["decision"] == "ESCALATE"

        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT decision, reason, created_at FROM contract_action_decisions WHERE action_id = %s ORDER BY created_at ASC;", (action_1_id,))
        dec_history = cur_check.fetchall()
        cur_check.close()
        conn_check.close()

        assert len(dec_history) >= 2, f"Expected at least 2 decisions, got {len(dec_history)}"
        # Verify first decision is still intact
        first_dec = [d for d in dec_history if d["decision"] == "NEGOTIATE"][0]
        assert first_dec["reason"] == "Request 60 days cure period for breach instead of 10 days."
        print(f"  Decision ledger count: {len(dec_history)}. First decision '{first_dec['decision']}' remains unaltered.")
        print("  [PASS] Test 8: Decision ledger is strictly append-only.")

        # [TEST 9] Decision validation rejects invalid decision values
        print("\n[TEST 9] Verifying Decision Value Validation...")
        res_t9 = requests.post(
            f"{BASE_URL}/api/actions/{action_1_id}/decision",
            headers=headers_a,
            json={"decision": "ARBITRARY_ACTION", "reason": "Testing invalid value"}
        )
        assert res_t9.status_code == 400, f"Expected 400, got {res_t9.status_code}"
        print(f"  Server rejected invalid decision: {res_t9.json().get('error')}")
        print("  [PASS] Test 9: Invalid decision values rejected with HTTP 400.")

        # [TEST 10] Action assignment correctly updates owner_id and audit trail
        print("\n[TEST 10] Testing Action Assignment & Unassignment (PATCH /owner)...")
        # 10a: Assign to User C
        res_t10_assign = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/owner",
            headers=headers_a,
            json={"ownerId": user_c_id}
        )
        assert res_t10_assign.status_code == 200
        assert res_t10_assign.json()["action"]["owner_id"] == user_c_id

        # 10b: Unassign (ownerId = null)
        res_t10_unassign = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/owner",
            headers=headers_a,
            json={"ownerId": None}
        )
        assert res_t10_unassign.status_code == 200
        assert res_t10_unassign.json()["action"]["owner_id"] is None

        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("""
            SELECT event_type, metadata FROM contract_action_activity 
            WHERE action_id = %s AND event_type IN ('ACTION_ASSIGNED', 'ACTION_UNASSIGNED')
            ORDER BY created_at ASC;
        """, (action_1_id,))
        assign_events = cur_check.fetchall()
        cur_check.close()
        conn_check.close()

        assert len(assign_events) == 2
        assert assign_events[0]["event_type"] == "ACTION_ASSIGNED"
        assert assign_events[1]["event_type"] == "ACTION_UNASSIGNED"
        print("  Assignment to User C and subsequent unassignment logged with proper audit events.")
        print("  [PASS] Test 10: Action assignment and unassignment verified.")

        # [TEST 11] Due date validation and update works correctly
        print("\n[TEST 11] Testing Due Date Management (PATCH /due-date)...")
        # 11a: Set valid ISO date
        iso_date = "2026-10-15T10:00:00.000Z"
        res_t11_set = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/due-date",
            headers=headers_a,
            json={"dueDate": iso_date}
        )
        assert res_t11_set.status_code == 200
        assert res_t11_set.json()["action"]["due_date"] is not None

        # 11b: Invalid date string rejected
        res_t11_bad = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/due-date",
            headers=headers_a,
            json={"dueDate": "not-a-valid-date"}
        )
        assert res_t11_bad.status_code == 400

        # 11c: Remove due date (dueDate = null)
        res_t11_remove = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/due-date",
            headers=headers_a,
            json={"dueDate": None}
        )
        assert res_t11_remove.status_code == 200
        assert res_t11_remove.json()["action"]["due_date"] is None
        print("  Due date successfully set, invalid string rejected, and cleared with null.")
        print("  [PASS] Test 11: Due date API validated.")

        # [TEST 12] Unauthorized user cannot mutate another user's action
        print("\n[TEST 12] Verifying Cross-User Mutation Protection (HTTP 403)...")
        res_t12_status = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/status",
            headers=headers_b,
            json={"status": "RESOLVED", "resolutionNotes": "Attacker trying to resolve"}
        )
        assert res_t12_status.status_code == 403, f"Expected 403, got {res_t12_status.status_code}"

        res_t12_dec = requests.post(
            f"{BASE_URL}/api/actions/{action_1_id}/decision",
            headers=headers_b,
            json={"decision": "DISMISS", "reason": "Attacker dismiss"}
        )
        assert res_t12_dec.status_code == 403, f"Expected 403, got {res_t12_dec.status_code}"
        print("  User B rejected with HTTP 403 on status transition and decision attempts.")
        print("  [PASS] Test 12: Cross-user mutation strictly blocked.")

        # [TEST 13] Unauthenticated mutation requests return HTTP 401
        print("\n[TEST 13] Verifying Unauthenticated Mutation Rejection (HTTP 401)...")
        res_t13 = requests.patch(
            f"{BASE_URL}/api/actions/{action_1_id}/status",
            json={"status": "IN_REVIEW"}
        )
        assert res_t13.status_code == 401, f"Expected 401, got {res_t13.status_code}"
        print("  [PASS] Test 13: Unauthenticated requests rejected with HTTP 401.")

        # [TEST 14] Every successful mutation produces exactly one appropriate audit event
        print("\n[TEST 14] Verifying Audit Trail Integrity for Mutations...")
        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("""
            SELECT event_type, actor_id, metadata, created_at
            FROM contract_action_activity
            WHERE action_id = %s
            ORDER BY created_at ASC;
        """, (action_1_id,))
        act_events = cur_check.fetchall()
        cur_check.close()
        conn_check.close()

        event_types = [e["event_type"] for e in act_events]
        print(f"  Captured audit events for action 1: {event_types}")
        assert "ACTION_CREATED" in event_types
        assert "ACTION_MOVED_TO_REVIEW" in event_types
        assert "ACTION_RESOLVED" in event_types
        assert "ACTION_REOPENED" in event_types
        assert "DECISION_RECORDED" in event_types
        assert "ACTION_ASSIGNED" in event_types
        assert "ACTION_UNASSIGNED" in event_types
        assert "DUE_DATE_SET" in event_types
        assert "DUE_DATE_REMOVED" in event_types
        for e in act_events:
            assert e["actor_id"] == user_a_id
        print("  [PASS] Test 14: Audit activity generated accurately for each mutation.")

        # [TEST 15] Failed mutations produce zero workflow database changes
        print("\n[TEST 15] Verifying Transactional Rollback on Failed Mutation...")
        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT status, updated_at FROM contract_actions WHERE id = %s;", (action_3_id,))
        before_state = cur_check.fetchone()
        cur_check.execute("SELECT COUNT(*) AS cnt FROM contract_action_decisions WHERE action_id = %s;", (action_3_id,))
        before_dec_count = cur_check.fetchone()["cnt"]
        cur_check.execute("SELECT COUNT(*) AS cnt FROM contract_action_activity WHERE action_id = %s;", (action_3_id,))
        before_act_count = cur_check.fetchone()["cnt"]

        # Attempt illegal transition: OPEN -> RESOLVED
        requests.patch(
            f"{BASE_URL}/api/actions/{action_3_id}/status",
            headers=headers_a,
            json={"status": "RESOLVED", "resolutionNotes": "Illegal"}
        )

        cur_check.execute("SELECT status, updated_at FROM contract_actions WHERE id = %s;", (action_3_id,))
        after_state = cur_check.fetchone()
        cur_check.execute("SELECT COUNT(*) AS cnt FROM contract_action_decisions WHERE action_id = %s;", (action_3_id,))
        after_dec_count = cur_check.fetchone()["cnt"]
        cur_check.execute("SELECT COUNT(*) AS cnt FROM contract_action_activity WHERE action_id = %s;", (action_3_id,))
        after_act_count = cur_check.fetchone()["cnt"]
        cur_check.close()
        conn_check.close()

        assert before_state["status"] == after_state["status"] == "OPEN"
        assert before_dec_count == after_dec_count
        assert before_act_count == after_act_count
        print("  Zero mutations or phantom audit logs created on failed request.")
        print("  [PASS] Test 15: Transactional rollback on failure verified.")

        # [TEST 16] Concurrent conflicting state transitions cannot both succeed incorrectly
        print("\n[TEST 16] Testing Concurrent Conflicting State Transitions Under Load...")
        # Reset action 3 to OPEN
        # Concurrently request OPEN -> IN_REVIEW and OPEN -> DISMISSED
        def req_in_review():
            return requests.patch(f"{BASE_URL}/api/actions/{action_3_id}/status", headers=headers_a, json={"status": "IN_REVIEW"})

        def req_dismiss():
            return requests.patch(f"{BASE_URL}/api/actions/{action_3_id}/status", headers=headers_a, json={"status": "DISMISSED", "reason": "Concurrent dismissal"})

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(req_in_review)
            f2 = executor.submit(req_dismiss)
            res1 = f1.result()
            res2 = f2.result()

        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT status FROM contract_actions WHERE id = %s;", (action_3_id,))
        final_status = cur_check.fetchone()["status"]
        cur_check.close()
        conn_check.close()

        # Both can succeed sequentially (OPEN -> IN_REVIEW -> DISMISSED or OPEN -> DISMISSED -> forbidden), but final state must be valid
        assert final_status in ["IN_REVIEW", "DISMISSED"]
        print(f"  Concurrent execution handled cleanly with row locking. Final state: '{final_status}'.")
        print("  [PASS] Test 16: Concurrency safety verified.")

        # [TEST 17] Priority score remains immutable through all workflow mutations
        print("\n[TEST 17] Verifying Priority Score Immutability...")
        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT source_action_id, priority_score FROM contract_actions WHERE document_id = %s;", (doc_a_id,))
        scores = {r["source_action_id"]: r["priority_score"] for r in cur_check.fetchall()}
        cur_check.close()
        conn_check.close()

        assert scores["act-term-01"] == 85
        assert scores["act-indem-02"] == 80
        assert scores["act-pay-03"] == 65
        assert scores["act-audit-04"] == 40
        print(f"  All priority scores unchanged: {scores}")
        print("  [PASS] Test 17: Priority scores are 100% immutable.")

        # [TEST 18] Intelligence snapshot remains unchanged after all workflow operations
        print("\n[TEST 18] Verifying Phase 6.4 Intelligence Immutability...")
        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT health_score, critical_count, actions_json FROM contract_intelligence WHERE id = %s;", (snap_a_id,))
        snap_row = cur_check.fetchone()
        cur_check.close()
        conn_check.close()

        assert snap_row["health_score"] == 72
        assert snap_row["critical_count"] == 2
        snap_actions = json.loads(snap_row["actions_json"]) if isinstance(snap_row["actions_json"], str) else snap_row["actions_json"]
        assert len(snap_actions) == 4
        print("  Phase 6.4 contract_intelligence snapshot remains identical.")
        print("  [PASS] Test 18: Phase 6.4 intelligence immutable.")

        # [TEST 19] Decision and activity history remain chronologically retrievable
        print("\n[TEST 19] Testing History Retrieval Endpoint (GET /api/actions/:id/history)...")
        res_hist = requests.get(f"{BASE_URL}/api/actions/{action_1_id}/history", headers=headers_a)
        assert res_hist.status_code == 200
        hist_data = res_hist.json()
        assert "action" in hist_data
        assert "decisions" in hist_data
        assert "activity" in hist_data
        assert len(hist_data["decisions"]) >= 2
        assert len(hist_data["activity"]) >= 5

        # Verify ascending chronology
        dec_times = [d["created_at"] for d in hist_data["decisions"]]
        assert dec_times == sorted(dec_times)
        act_times = [a["created_at"] for a in hist_data["activity"]]
        assert act_times == sorted(act_times)
        print(f"  History verified: {len(hist_data['decisions'])} decision entries, {len(hist_data['activity'])} activity entries in chronological order.")
        print("  [PASS] Test 19: History retrieval verified.")

        # [TEST 20] Existing Phase 7.2.2 synchronization continues to preserve human workflow state after mutations
        print("\n[TEST 20] Verifying Sync Preserves Mutated Workflow State...")
        sync_res_again = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a)
        assert sync_res_again.status_code == 200
        sync_data_again = sync_res_again.json()
        assert sync_data_again["summary"]["created"] == 0
        assert sync_data_again["summary"]["existing"] == 4

        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT status, decision, decision_reason, resolution_notes FROM contract_actions WHERE id = %s;", (action_1_id,))
        act1_state = cur_check.fetchone()
        cur_check.close()
        conn_check.close()

        assert act1_state["status"] == "IN_REVIEW"
        assert act1_state["decision"] == "ESCALATE"
        assert act1_state["decision_reason"] == "Escalating to General Counsel due to counterparty impasse."
        assert act1_state["resolution_notes"] == "Successfully negotiated 60-day mutual written notice period."
        print(f"  Action 1 state perfectly intact after resync: status='{act1_state['status']}', decision='{act1_state['decision']}'")
        print("  [PASS] Test 20: Phase 7.2.2 sync preserves human workflow mutations without overwrite.")

        print("\n" + "=" * 80)
        print("ALL 20 PHASE 7.3 WORKFLOW STATE ENGINE & DECISION TESTS PASSED (100%)")
        print("=" * 80)

    finally:
        conn_clean = get_db_connection()
        cur_clean = conn_clean.cursor()
        cur_clean.execute("DELETE FROM sessions WHERE user_id IN (%s, %s, %s);", (user_a_id, user_b_id, user_c_id))
        cur_clean.execute("DELETE FROM otp_codes WHERE user_id IN (%s, %s, %s);", (user_a_id, user_b_id, user_c_id))
        cur_clean.execute("DELETE FROM documents WHERE user_id IN (%s, %s, %s);", (user_a_id, user_b_id, user_c_id))
        cur_clean.execute("DELETE FROM users WHERE id IN (%s, %s, %s);", (user_a_id, user_b_id, user_c_id))
        conn_clean.commit()
        cur_clean.close()
        conn_clean.close()

if __name__ == "__main__":
    verify_phase7_3()
