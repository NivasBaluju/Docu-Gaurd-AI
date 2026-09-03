import os
import sys
import uuid
import json
import requests
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

def upload_and_analyze(token, title, content_text):
    headers = {'Authorization': f"Bearer {token}"}
    upload_res = requests.post(
        f"{BASE_URL}/api/documents/upload",
        headers=headers,
        files={'file': (f"{title}.txt", content_text.encode('utf-8'), 'text/plain')},
        data={'title': title}
    )
    assert upload_res.status_code in [200, 201], f"Upload failed: {upload_res.text}"
    doc_id = upload_res.json().get("id") or upload_res.json().get("document_id") or (upload_res.json().get("document") or {}).get("id")

    analyze_res = requests.post(f"{BASE_URL}/api/documents/{doc_id}/analyze", headers=headers, timeout=60)
    assert analyze_res.status_code == 200, f"Analysis failed: {analyze_res.text}"
    return doc_id


def verify_phase7_2_1():
    print("=" * 75)
    print("=== STARTING PHASE 7.2.1: ROUTE ARCHITECTURE & AUTHORIZATION TESTS ===")
    print("=" * 75)

    email_a = f"test_owner_a_{uuid.uuid4().hex[:8]}@example.com"
    email_b = f"test_owner_b_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPassword123!"

    token_a = authenticate_user(email_a, pwd, "User Alpha")
    token_b = authenticate_user(email_b, pwd, "User Beta")
    assert token_a, "Failed to authenticate User A"
    assert token_b, "Failed to authenticate User B"

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = %s;", (email_a.lower(),))
    user_a_id = cur.fetchone()["id"]
    cur.execute("SELECT id FROM users WHERE email = %s;", (email_b.lower(),))
    user_b_id = cur.fetchone()["id"]

    # Create test document and workflow actions for User A
    doc_a_id = str(uuid.uuid4())
    act_a1_id = str(uuid.uuid4())
    act_a2_id = str(uuid.uuid4())
    dec_a1_id = str(uuid.uuid4())
    act_aud_a1_id = str(uuid.uuid4())

    cur.execute("""
        INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
        VALUES (%s, %s, 'alpha_doc.pdf', 'Alpha_Contract.pdf', 2048, 'application/pdf');
    """, (doc_a_id, user_a_id))

    cur.execute("""
        INSERT INTO contract_actions (
            id, document_id, source_action_id, title, category, priority_score, status, decision, decision_reason
        ) VALUES 
        (%s, %s, 'act-src-01', 'Renegotiate Termination Rights', 'CRITICAL', 85, 'IN_REVIEW', 'NEGOTIATE', 'Material unilateral clause imbalance'),
        (%s, %s, 'act-src-02', 'Clarify Payment Net Days', 'IMPORTANT', 60, 'OPEN', NULL, NULL);
    """, (act_a1_id, doc_a_id, act_a2_id, doc_a_id))

    cur.execute("""
        INSERT INTO contract_action_decisions (
            id, action_id, previous_status, new_status, decision, reason, decided_by
        ) VALUES (%s, %s, 'OPEN', 'IN_REVIEW', 'NEGOTIATE', 'Requires 30 days mutual notice', %s);
    """, (dec_a1_id, act_a1_id, user_a_id))

    cur.execute("""
        INSERT INTO contract_action_activity (
            id, action_id, event_type, actor_id, metadata
        ) VALUES (%s, %s, 'ACTION_CREATED', %s, '{"source": "phase_6_4_intelligence"}'::jsonb);
    """, (act_aud_a1_id, act_a1_id, user_a_id))

    # Create test document and workflow actions for User B
    doc_b_id = str(uuid.uuid4())
    act_b1_id = str(uuid.uuid4())

    cur.execute("""
        INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
        VALUES (%s, %s, 'beta_doc.pdf', 'Beta_Contract.pdf', 4096, 'application/pdf');
    """, (doc_b_id, user_b_id))

    cur.execute("""
        INSERT INTO contract_actions (
            id, document_id, source_action_id, title, category, priority_score, status
        ) VALUES (%s, %s, 'act-beta-01', 'Review Indemnity Obligations', 'CRITICAL', 90, 'OPEN');
    """, (act_b1_id, doc_b_id))

    conn.commit()
    cur.close()
    conn.close()

    try:
        # [TEST 1] Route architecture exists and routes are reachable
        print("\n[TEST 1] Verifying Route Architecture Reachability...")
        res_check = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/actions", headers=headers_a)
        assert res_check.status_code == 200, f"Expected 200 for document actions, got {res_check.status_code}"
        res_act_check = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}", headers=headers_a)
        assert res_act_check.status_code == 200, f"Expected 200 for single action, got {res_act_check.status_code}"
        res_hist_check = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}/history", headers=headers_a)
        assert res_hist_check.status_code == 200, f"Expected 200 for action history, got {res_hist_check.status_code}"
        print("  [PASS] Test 1: Route architecture verified and endpoints are responsive.")

        # [TEST 2] Unauthenticated access returns 401
        print("\n[TEST 2] Verifying Unauthenticated Access Security (HTTP 401)...")
        res_unauth_1 = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/actions")
        assert res_unauth_1.status_code == 401, f"Expected 401 unauth, got {res_unauth_1.status_code}"
        res_unauth_2 = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}")
        assert res_unauth_2.status_code == 401, f"Expected 401 unauth, got {res_unauth_2.status_code}"
        res_unauth_3 = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}/history")
        assert res_unauth_3.status_code == 401, f"Expected 401 unauth, got {res_unauth_3.status_code}"
        res_invalid_jwt = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}", headers={"Authorization": "Bearer bad.token.here"})
        assert res_invalid_jwt.status_code == 401, f"Expected 401 invalid token, got {res_invalid_jwt.status_code}"
        print("  [PASS] Test 2: Unauthenticated / invalid token requests strictly rejected with HTTP 401.")

        # [TEST 3] Authorized document owner can list their own actions
        print("\n[TEST 3] Verifying Authorized Document Actions Listing...")
        res_list = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/actions", headers=headers_a)
        assert res_list.status_code == 200
        actions = res_list.json().get("actions", [])
        assert len(actions) == 2, f"Expected 2 actions for Doc A, got {len(actions)}"
        # Verify ordering: priority_score DESC (85 then 60)
        assert actions[0]["priority_score"] == 85
        assert actions[1]["priority_score"] == 60
        assert actions[0]["title"] == "Renegotiate Termination Rights"
        print(f"  Retrieved {len(actions)} actions sorted by priority: {[a['priority_score'] for a in actions]}")
        print("  [PASS] Test 3: Document owner successfully retrieved authorized actions.")

        # [TEST 4] User cannot access another user's actions
        print("\n[TEST 4] Verifying Cross-User Action Protection (HTTP 403)...")
        res_cross_act = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}", headers=headers_b)
        assert res_cross_act.status_code == 403, f"Expected 403 for cross-user action, got {res_cross_act.status_code}"
        print("  [PASS] Test 4: User B blocked from accessing User A's action ID (HTTP 403).")

        # [TEST 5] User cannot list actions from another user's document
        print("\n[TEST 5] Verifying Cross-User Document Listing Protection (HTTP 403)...")
        res_cross_doc = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/actions", headers=headers_b)
        assert res_cross_doc.status_code == 403, f"Expected 403 for cross-user document actions, got {res_cross_doc.status_code}"
        print("  [PASS] Test 5: User B blocked from listing actions from User A's document (HTTP 403).")

        # [TEST 6] Authorized user can retrieve one action
        print("\n[TEST 6] Verifying Single Action Retrieval...")
        res_single = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}", headers=headers_a)
        assert res_single.status_code == 200
        act_data = res_single.json().get("action")
        assert act_data is not None
        assert act_data["id"] == act_a1_id
        assert act_data["title"] == "Renegotiate Termination Rights"
        assert act_data["status"] == "IN_REVIEW"
        assert act_data["decision"] == "NEGOTIATE"
        assert act_data["priority_score"] == 85
        print(f"  Action data verified: {act_data['title']} (Status: {act_data['status']}, Score: {act_data['priority_score']})")
        print("  [PASS] Test 6: Single action retrieved with accurate workflow fields.")

        # [TEST 7] Authorized user can retrieve action history
        print("\n[TEST 7] Verifying Action History Retrieval...")
        res_hist = requests.get(f"{BASE_URL}/api/actions/{act_a1_id}/history", headers=headers_a)
        assert res_hist.status_code == 200
        hist_data = res_hist.json()
        assert "action" in hist_data
        assert "decisions" in hist_data
        assert "activity" in hist_data
        decisions = hist_data["decisions"]
        activity = hist_data["activity"]
        assert len(decisions) == 1, f"Expected 1 decision, got {len(decisions)}"
        assert len(activity) == 1, f"Expected 1 activity event, got {len(activity)}"
        assert decisions[0]["decision"] == "NEGOTIATE"
        assert decisions[0]["new_status"] == "IN_REVIEW"
        assert activity[0]["event_type"] == "ACTION_CREATED"
        print(f"  Decision trail: {decisions[0]['previous_status']} -> {decisions[0]['new_status']} (Reason: {decisions[0]['reason']})")
        print(f"  Audit trail: {activity[0]['event_type']} (Actor: {activity[0]['actor_id']})")
        print("  [PASS] Test 7: Action decision history and activity audit trail retrieved accurately.")

        # [TEST 8] Nonexistent resources return 404
        print("\n[TEST 8] Verifying Nonexistent Resource Handling (HTTP 404)...")
        fake_act_id = str(uuid.uuid4())
        fake_doc_id = str(uuid.uuid4())
        res_404_act = requests.get(f"{BASE_URL}/api/actions/{fake_act_id}", headers=headers_a)
        assert res_404_act.status_code == 404, f"Expected 404 for nonexistent action, got {res_404_act.status_code}"
        res_404_doc = requests.get(f"{BASE_URL}/api/documents/{fake_doc_id}/actions", headers=headers_a)
        assert res_404_doc.status_code == 404, f"Expected 404 for nonexistent document, got {res_404_doc.status_code}"
        res_404_hist = requests.get(f"{BASE_URL}/api/actions/{fake_act_id}/history", headers=headers_a)
        assert res_404_hist.status_code == 404, f"Expected 404 for nonexistent action history, got {res_404_hist.status_code}"
        print("  [PASS] Test 8: Nonexistent document/action IDs properly returned HTTP 404.")

        # [TEST 9] No unintended mutations across read endpoints
        print("\n[TEST 9] Verifying Immutability of Read-Only Endpoints...")
        conn2 = get_db_connection()
        cur2 = conn2.cursor()
        cur2.execute("SELECT COUNT(*) AS cnt FROM contract_actions;")
        count_actions_before = cur2.fetchone()["cnt"]
        cur2.execute("SELECT COUNT(*) AS cnt FROM contract_action_decisions;")
        count_decisions_before = cur2.fetchone()["cnt"]
        cur2.execute("SELECT COUNT(*) AS cnt FROM contract_action_activity;")
        count_activity_before = cur2.fetchone()["cnt"]

        # Perform 15 read requests
        for _ in range(5):
            requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/actions", headers=headers_a)
            requests.get(f"{BASE_URL}/api/actions/{act_a1_id}", headers=headers_a)
            requests.get(f"{BASE_URL}/api/actions/{act_a1_id}/history", headers=headers_a)

        cur2.execute("SELECT COUNT(*) AS cnt FROM contract_actions;")
        count_actions_after = cur2.fetchone()["cnt"]
        cur2.execute("SELECT COUNT(*) AS cnt FROM contract_action_decisions;")
        count_decisions_after = cur2.fetchone()["cnt"]
        cur2.execute("SELECT COUNT(*) AS cnt FROM contract_action_activity;")
        count_activity_after = cur2.fetchone()["cnt"]
        cur2.close()
        conn2.close()

        assert count_actions_before == count_actions_after, "contract_actions table row count mutated by GET endpoint"
        assert count_decisions_before == count_decisions_after, "contract_action_decisions row count mutated by GET endpoint"
        assert count_activity_before == count_activity_after, "contract_action_activity row count mutated by GET endpoint"
        print("  [PASS] Test 9: Zero database mutations observed across repeated read operations.")

        # [TEST 10] Phase 6.4 Intelligence integrity verified
        print("\n[TEST 10] Verifying Phase 6.4 Intelligence Integrity...")
        intel_doc_id = upload_and_analyze(token_a, "Intel_Test_Master", "MASTER SERVICES AGREEMENT\n\nSection 1. Term\nThis agreement runs for 1 year.")

        res_intel = requests.get(f"{BASE_URL}/api/documents/{intel_doc_id}/intelligence", headers=headers_a)
        assert res_intel.status_code == 200
        intel_data = res_intel.json()
        assert "healthScore" in intel_data
        assert "actionPlan" in intel_data
        assert "metrics" in intel_data
        print(f"  Phase 6.4 Health Score: {intel_data.get('healthScore')}/100 | Action Plan Count: {len(intel_data.get('actionPlan', []))}")
        print("  [PASS] Test 10: Phase 6.4 intelligence engine functions with zero interference.")

        print("\n" + "=" * 75)
        print("ALL PHASE 7.2.1 WORKFLOW ROUTE ARCHITECTURE CHECKS PASSED (100%)")
        print("=" * 75)

    finally:
        # Clean up test documents and users
        conn_clean = get_db_connection()
        cur_clean = conn_clean.cursor()
        cur_clean.execute("DELETE FROM sessions WHERE user_id IN (%s, %s);", (user_a_id, user_b_id))
        cur_clean.execute("DELETE FROM otp_codes WHERE user_id IN (%s, %s);", (user_a_id, user_b_id))
        cur_clean.execute("DELETE FROM documents WHERE user_id IN (%s, %s);", (user_a_id, user_b_id))
        cur_clean.execute("DELETE FROM users WHERE id IN (%s, %s);", (user_a_id, user_b_id))
        conn_clean.commit()
        cur_clean.close()
        conn_clean.close()

if __name__ == "__main__":
    verify_phase7_2_1()
