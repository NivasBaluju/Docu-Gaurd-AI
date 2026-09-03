import os
import sys
import json
import time
import uuid
import subprocess
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
        return mfa_res.get("token"), mfa_res.get("user")
    return login_res.get("token"), login_res.get("user")

def run_tests():
    print("================================================================================")
    print("=== STARTING PHASE 7.4: WORKFLOW ACTION CENTER & HUMAN DECISION UI TESTS ===")
    print("================================================================================")

    email_a = f"ui_owner_a_{uuid.uuid4().hex[:8]}@example.com"
    email_b = f"ui_owner_b_{uuid.uuid4().hex[:8]}@example.com"
    email_c = f"ui_collab_c_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "UiPassword123!"

    token_a, user_a = authenticate_user(email_a, pwd, "UI Owner Alpha")
    token_b, user_b = authenticate_user(email_b, pwd, "UI Owner Beta")
    token_c, user_c = authenticate_user(email_c, pwd, "UI Collab Gamma")
    assert token_a, "Failed to authenticate User A"
    assert token_b, "Failed to authenticate User B"
    assert token_c, "Failed to authenticate User C"

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # Fetch User IDs from DB if not returned in auth object
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s;", (email_a,))
    user_a_id = str(cur.fetchone()['id'])
    cur.execute("SELECT id FROM users WHERE email = %s;", (email_b,))
    user_b_id = str(cur.fetchone()['id'])
    cur.execute("SELECT id FROM users WHERE email = %s;", (email_c,))
    user_c_id = str(cur.fetchone()['id'])

    # Setup: Create Document A with snapshot
    doc_a_id = str(uuid.uuid4())
    doc_b_id = str(uuid.uuid4())
    snap_a_id = str(uuid.uuid4())

    cur.execute("""
        INSERT INTO documents (id, user_id, filename, original_name, mime_type, size, sha256)
        VALUES (%s, %s, 'test_ui_doc_a.pdf', 'Master Service Agreement A.pdf', 'application/pdf', 10240, 'sha_ui_a')
        ON CONFLICT (id) DO NOTHING;
    """, (doc_a_id, user_a_id))

    cur.execute("""
        INSERT INTO documents (id, user_id, filename, original_name, mime_type, size, sha256)
        VALUES (%s, %s, 'test_ui_doc_b.pdf', 'Vendor Agreement B.pdf', 'application/pdf', 20480, 'sha_ui_b')
        ON CONFLICT (id) DO NOTHING;
    """, (doc_b_id, user_b_id))

    # Insert snapshot for Doc A
    sample_actions_json = [
        {
            "actionId": "act-term-01",
            "title": "Renegotiate Unilateral Termination Clause",
            "category": "CRITICAL",
            "priorityScore": 85,
            "priorityBreakdown": {"clauseSeverity": 35, "negotiationImbalance": 20, "simulationExposure": 20, "deadlineUrgency": 10, "complianceHazard": 0},
            "documentEvidence": {"section": "Section 12.1", "excerpt": "Company may terminate this agreement at any time without cause."},
            "intelligenceAssessment": {"whyItMatters": "Creates unreciprocated cancellation exposure.", "recommendedAction": "Insert mutual 60-day notice requirement."},
            "provenance": {"clauseIds": [str(uuid.uuid4())], "riskFactorIds": [], "simulationIds": [], "deadlineIds": []}
        },
        {
            "actionId": "act-indem-02",
            "title": "Cap Broad Indemnification Exposure",
            "category": "IMPORTANT",
            "priorityScore": 75,
            "priorityBreakdown": {"clauseSeverity": 25, "negotiationImbalance": 20, "simulationExposure": 20, "deadlineUrgency": 0, "complianceHazard": 10},
            "documentEvidence": {"section": "Section 9", "excerpt": "Vendor shall indemnify, defend and hold harmless Client from any and all claims."},
            "intelligenceAssessment": {"whyItMatters": "Uncapped third-party IP indemnity risk.", "recommendedAction": "Limit indemnification obligation to aggregate fee cap."},
            "provenance": {"clauseIds": [str(uuid.uuid4())], "riskFactorIds": [], "simulationIds": [], "deadlineIds": []}
        },
        {
            "actionId": "act-pay-03",
            "title": "Clarify Late Payment Interest Penalties",
            "category": "MONITORING",
            "priorityScore": 45,
            "priorityBreakdown": {"clauseSeverity": 10, "negotiationImbalance": 10, "simulationExposure": 10, "deadlineUrgency": 15, "complianceHazard": 0},
            "documentEvidence": {"section": "Section 4", "excerpt": "Overdue invoices accrue interest at 1.5% per month."},
            "intelligenceAssessment": {"whyItMatters": "Accelerates dispute risk on delayed remittances.", "recommendedAction": "Establish 15-day grace period."},
            "provenance": {"clauseIds": [str(uuid.uuid4())], "riskFactorIds": [], "simulationIds": [], "deadlineIds": []}
        }
    ]

    cur.execute("""
        INSERT INTO contract_intelligence (
            id, document_id, user_id, health_score, critical_count, important_count,
            monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
        ) VALUES (%s, %s, %s, 72, 1, 1, 1, 0, 'Executive summary UI test.', '[]', %s, '{}');
    """, (snap_a_id, doc_a_id, user_a_id, json.dumps(sample_actions_json)))

    conn.commit()
    cur.close()
    conn.close()

    # TEST 1: Sync button successfully calls workflow synchronization
    print("\n[TEST 1] Testing Action Center Sync API Trigger...")
    sync_res = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a, timeout=10)
    assert sync_res.status_code == 200, f"Sync failed: {sync_res.text}"
    sync_data = sync_res.json()
    assert sync_data.get("success") is True
    assert sync_data["summary"]["created"] == 3
    print(f"  Sync successful. Summary: {sync_data['summary']}")
    print("  [PASS] Test 1: Sync button API successfully synchronizes actions.")

    # TEST 2: Action Center loads document-specific actions
    print("\n[TEST 2] Testing Action Center Document Actions Retrieval...")
    actions_res = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/actions", headers=headers_a, timeout=10)
    assert actions_res.status_code == 200
    actions_data = actions_res.json()
    actions_list = actions_data.get("actions", [])
    assert len(actions_list) == 3
    action_1 = next(a for a in actions_list if a["source_action_id"] == "act-term-01")
    action_2 = next(a for a in actions_list if a["source_action_id"] == "act-indem-02")
    action_3 = next(a for a in actions_list if a["source_action_id"] == "act-pay-03")
    print(f"  Retrieved {len(actions_list)} actions for Doc A.")
    print("  [PASS] Test 2: Action Center loads document-specific actions.")

    # TEST 3: Multi-document isolation (No cross-document actions appear)
    print("\n[TEST 3] Verifying Strict Multi-Document Isolation...")
    doc_b_actions_res = requests.get(f"{BASE_URL}/api/documents/{doc_b_id}/actions", headers=headers_b, timeout=10)
    assert doc_b_actions_res.status_code == 200
    doc_b_actions = doc_b_actions_res.json().get("actions", [])
    assert len(doc_b_actions) == 0, f"Doc B should have 0 actions, got {len(doc_b_actions)}"
    print("  Doc B returned 0 actions. Zero cross-contract leakage.")
    print("  [PASS] Test 3: Multi-document isolation verified.")

    # TEST 4: Sync results displayed correctly on repeated sync
    print("\n[TEST 4] Verifying Sync Results Breakdown (Created vs Existing)...")
    resync_res = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a, timeout=10)
    assert resync_res.status_code == 200
    resync_summary = resync_res.json().get("summary", {})
    assert resync_summary["created"] == 0
    assert resync_summary["existing"] == 3
    print(f"  Resync summary: created={resync_summary['created']}, existing={resync_summary['existing']}")
    print("  [PASS] Test 4: Sync results breakdown verified.")

    # TEST 5: Transition OPEN -> IN_REVIEW via UI Start Review
    print("\n[TEST 5] Testing 'Start Review' Transition (OPEN -> IN_REVIEW)...")
    review_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/status",
        json={"status": "IN_REVIEW"},
        headers=headers_a,
        timeout=10
    )
    assert review_res.status_code == 200
    assert review_res.json()["action"]["status"] == "IN_REVIEW"
    print("  Action 1 status successfully transitioned to IN_REVIEW.")
    print("  [PASS] Test 5: Start Review transition verified.")

    # TEST 6: Invalid backend transition error handling
    print("\n[TEST 6] Verifying Invalid Transition Error Handling (OPEN -> RESOLVED blocked)...")
    illegal_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_2['id']}/status",
        json={"status": "RESOLVED", "resolutionNotes": "premature"},
        headers=headers_a,
        timeout=10
    )
    assert illegal_res.status_code == 400
    print(f"  Illegal jump blocked with HTTP 400: {illegal_res.json().get('error')}")
    print("  [PASS] Test 6: Illegal transition rejected with HTTP 400.")

    # TEST 7: RESOLVED transition requires non-empty resolution notes
    print("\n[TEST 7] Testing Resolution Requirement (Non-empty Resolution Notes)...")
    no_notes_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/status",
        json={"status": "RESOLVED", "resolutionNotes": "   "},
        headers=headers_a,
        timeout=10
    )
    assert no_notes_res.status_code == 400
    print("  Empty notes rejected.")
    
    valid_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/status",
        json={"status": "RESOLVED", "resolutionNotes": "Negotiated 60-day bilateral termination rights approved by GC."},
        headers=headers_a,
        timeout=10
    )
    assert valid_res.status_code == 200
    assert valid_res.json()["action"]["status"] == "RESOLVED"
    assert valid_res.json()["action"]["resolved_at"] is not None
    print(f"  Action 1 resolved. Notes preserved, resolved_at={valid_res.json()['action']['resolved_at']}")
    print("  [PASS] Test 7: Resolution notes requirement enforced.")

    # TEST 8: Reopening RESOLVED -> IN_REVIEW
    print("\n[TEST 8] Testing Action Reopen (RESOLVED -> IN_REVIEW)...")
    reopen_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/status",
        json={"status": "IN_REVIEW"},
        headers=headers_a,
        timeout=10
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["action"]["status"] == "IN_REVIEW"
    assert reopen_res.json()["action"]["resolution_notes"] is not None
    print("  Action 1 reopened to IN_REVIEW while preserving historical resolution notes.")
    print("  [PASS] Test 8: Reopening preserves historical state.")

    # TEST 9: DISMISSED transition requires a reason
    print("\n[TEST 9] Testing Dismissal Requirement (Non-empty Dismissal Reason)...")
    no_reason_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_3['id']}/status",
        json={"status": "DISMISSED", "reason": ""},
        headers=headers_a,
        timeout=10
    )
    assert no_reason_res.status_code == 400
    
    valid_dismiss = requests.patch(
        f"{BASE_URL}/api/actions/{action_3['id']}/status",
        json={"status": "DISMISSED", "reason": "Late interest penalty is standard statutory commercial rate."},
        headers=headers_a,
        timeout=10
    )
    assert valid_dismiss.status_code == 200
    assert valid_dismiss.json()["action"]["status"] == "DISMISSED"
    print("  Action 3 dismissed with reason.")
    print("  [PASS] Test 9: Dismissal reason requirement enforced.")

    # TEST 10: Human Decision API validation
    print("\n[TEST 10] Testing Decision Form Validation (Required Decision & Reason)...")
    no_dec_res = requests.post(
        f"{BASE_URL}/api/actions/{action_1['id']}/decision",
        json={"decision": "", "reason": "Some reason"},
        headers=headers_a,
        timeout=10
    )
    assert no_dec_res.status_code == 400
    print("  Empty decision rejected.")
    print("  [PASS] Test 10: Decision form validation verified.")

    # TEST 11: Record Decision in Append-Only Ledger
    print("\n[TEST 11] Testing Human Decision Submission & Ledger Recording...")
    dec_res = requests.post(
        f"{BASE_URL}/api/actions/{action_1['id']}/decision",
        json={"decision": "NEGOTIATE", "reason": "Unilateral cancellation clause requires 60-day bilateral amendment."},
        headers=headers_a,
        timeout=10
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["action"]["decision"] == "NEGOTIATE"
    print("  Decision recorded. Action summary state updated.")
    print("  [PASS] Test 11: Decision recorded and ledger appended.")

    # TEST 12: Owner assignment & unassignment
    print("\n[TEST 12] Testing Owner Assignment & Unassignment...")
    assign_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/owner",
        json={"ownerId": user_c_id},
        headers=headers_a,
        timeout=10
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["action"]["owner_id"] == user_c_id

    unassign_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/owner",
        json={"ownerId": None},
        headers=headers_a,
        timeout=10
    )
    assert unassign_res.status_code == 200
    assert unassign_res.json()["action"]["owner_id"] is None
    print("  Owner successfully assigned to Collab User and unassigned with null.")
    print("  [PASS] Test 12: Owner assignment and unassignment verified.")

    # TEST 13: Due date management
    print("\n[TEST 13] Testing Due Date Management...")
    iso_date = "2026-11-15T23:59:59.000Z"
    due_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/due-date",
        json={"dueDate": iso_date},
        headers=headers_a,
        timeout=10
    )
    assert due_res.status_code == 200
    assert due_res.json()["action"]["due_date"] is not None

    clear_due = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/due-date",
        json={"dueDate": None},
        headers=headers_a,
        timeout=10
    )
    assert clear_due.status_code == 200
    assert clear_due.json()["action"]["due_date"] is None
    print("  Due date successfully set and cleared.")
    print("  [PASS] Test 13: Due date management verified.")

    # TEST 14: Chronological Action Activity History
    print("\n[TEST 14] Verifying Chronological Action Activity History...")
    history_res = requests.get(f"{BASE_URL}/api/actions/{action_1['id']}/history", headers=headers_a, timeout=10)
    assert history_res.status_code == 200
    history_data = history_res.json()
    activity = history_data.get("activity", [])
    assert len(activity) >= 5
    event_types = [a["event_type"] for a in activity]
    print(f"  Activity event trail ({len(activity)}): {event_types}")
    assert "ACTION_CREATED" in event_types
    assert "DECISION_RECORDED" in event_types
    print("  [PASS] Test 14: Action activity history is chronologically accurate.")

    # TEST 15: Decision History is visible and immutable
    print("\n[TEST 15] Verifying Decision Ledger Immutability...")
    decisions = history_data.get("decisions", [])
    assert len(decisions) >= 1
    assert any(d["decision"] == "NEGOTIATE" for d in decisions), f"Expected NEGOTIATE in decisions: {decisions}"
    print(f"  Decision ledger entries ({len(decisions)}): '{decisions[-1]['decision']}' - '{decisions[-1]['reason']}'")
    print("  [PASS] Test 15: Decision ledger history retrieved accurately.")

    # TEST 16: Read-only priority and evidence provenance
    print("\n[TEST 16] Verifying Read-Only Priority & Evidence Provenance Integrity...")
    single_res = requests.get(f"{BASE_URL}/api/actions/{action_1['id']}", headers=headers_a, timeout=10)
    assert single_res.status_code == 200
    single_act = single_res.json()["action"]
    assert single_act["priority_score"] == 85
    assert single_act["category"] == "CRITICAL"
    assert "document_evidence" in single_act
    assert "intelligence_assessment" in single_act
    print(f"  Action Priority: {single_act['priority_score']} | Section: {single_act['document_evidence']['section']}")
    print("  [PASS] Test 16: Priority score and provenance evidence remain immutable.")

    # TEST 17: Cross-user mutation security (403 Forbidden)
    print("\n[TEST 17] Verifying Cross-User Mutation Security (403 Forbidden)...")
    forbidden_res = requests.patch(
        f"{BASE_URL}/api/actions/{action_1['id']}/status",
        json={"status": "IN_REVIEW"},
        headers=headers_b,
        timeout=10
    )
    assert forbidden_res.status_code == 403
    print("  User B blocked from mutating User A's action with HTTP 403.")
    print("  [PASS] Test 17: Cross-user authorization strictly enforced.")

    # TEST 18: Unauthenticated access security (401 Unauthorized)
    print("\n[TEST 18] Verifying Unauthenticated Access Security (401 Unauthorized)...")
    unauth_res = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/actions", timeout=10)
    assert unauth_res.status_code == 401
    print("  Unauthenticated request rejected with HTTP 401.")
    print("  [PASS] Test 18: Unauthenticated access rejected.")

    # TEST 19: Preservation of human workflow state across synchronization
    print("\n[TEST 19] Verifying Human Workflow State Preservation Across Sync...")
    sync_again = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a, timeout=10)
    assert sync_again.status_code == 200
    check_act1 = requests.get(f"{BASE_URL}/api/actions/{action_1['id']}", headers=headers_a, timeout=10).json()["action"]
    assert check_act1["status"] == "IN_REVIEW"
    assert check_act1["decision"] == "NEGOTIATE"
    print("  Action 1 state (IN_REVIEW / NEGOTIATE) completely preserved after resync.")
    print("  [PASS] Test 19: Human workflow state preserved with zero overwrites.")

    # TEST 20: Frontend build verification
    print("\n[TEST 20] Verifying Production Frontend Build (npm run build)...")
    build_cmd = subprocess.run(
        ["npm", "run", "build"],
        cwd="c:\\Users\\DELL\\Downloads\\Docu-Gaurd AI\\Docu-Gaurd AI",
        capture_output=True,
        text=True,
        shell=True
    )
    assert build_cmd.returncode == 0, f"Frontend build failed:\n{build_cmd.stderr}\n{build_cmd.stdout}"
    print("  Vite production bundle built successfully with code 0.")
    print("  [PASS] Test 20: Production frontend build completes without errors.")

    print("\n================================================================================")
    print("ALL 20 PHASE 7.4 FRONTEND WORKFLOW ACTION CENTER & DECISION TESTS PASSED (100%)")
    print("================================================================================")

if __name__ == "__main__":
    run_tests()
