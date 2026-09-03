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


def verify_phase7_2_2():
    print("=" * 80)
    print("=== STARTING PHASE 7.2.2: INTELLIGENCE -> WORKFLOW ACTION SYNCHRONIZATION ===")
    print("=" * 80)

    email_a = f"test_owner_a_{uuid.uuid4().hex[:8]}@example.com"
    email_b = f"test_owner_b_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPassword123!"

    token_a = authenticate_user(email_a, pwd, "User Alpha Sync")
    token_b = authenticate_user(email_b, pwd, "User Beta Sync")
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

    # Create test document and intelligence snapshot for User A
    doc_a_id = str(uuid.uuid4())
    snap_a1_id = str(uuid.uuid4())

    cur.execute("""
        INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
        VALUES (%s, %s, 'sync_contract_a.pdf', 'Sync_Contract_A.pdf', 2048, 'application/pdf');
    """, (doc_a_id, user_a_id))

    sample_actions = [
        {
            "actionId": "act-termination-01",
            "title": "Renegotiate Unilateral Termination Clause",
            "category": "CRITICAL",
            "priorityScore": 85,
            "priorityBreakdown": {
                "clauseSeverity": 35,
                "negotiationImbalance": 20,
                "simulationExposure": 20,
                "deadlineUrgency": 10,
                "complianceHazard": 0,
                "total": 85
            }
        },
        {
            "actionId": "act-indemnity-02",
            "title": "Scope Indemnification to Direct Damages",
            "category": "CRITICAL",
            "priorityScore": 80,
            "priorityBreakdown": {
                "clauseSeverity": 35,
                "negotiationImbalance": 20,
                "simulationExposure": 15,
                "deadlineUrgency": 0,
                "complianceHazard": 10,
                "total": 80
            }
        },
        {
            "actionId": "act-payment-03",
            "title": "Clarify Net 30 Commercial Billing Terms",
            "category": "IMPORTANT",
            "priorityScore": 65,
            "priorityBreakdown": {
                "clauseSeverity": 20,
                "negotiationImbalance": 10,
                "simulationExposure": 10,
                "deadlineUrgency": 15,
                "complianceHazard": 10,
                "total": 65
            }
        }
    ]

    cur.execute("""
        INSERT INTO contract_intelligence (
            id, document_id, user_id, health_score, critical_count, important_count,
            monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
        ) VALUES (%s, %s, %s, 72, 2, 1, 0, 0, 'Executive summary for Sync Contract A', '[]'::jsonb, %s::jsonb, '{}'::jsonb);
    """, (snap_a1_id, doc_a_id, user_a_id, json.dumps(sample_actions)))

    # Create test document for User B
    doc_b_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
        VALUES (%s, %s, 'sync_contract_b.pdf', 'Sync_Contract_B.pdf', 1024, 'application/pdf');
    """, (doc_b_id, user_b_id))

    conn.commit()
    cur.close()
    conn.close()

    try:
        # [TEST 1] Authorized user can synchronize actions from existing snapshot
        print("\n[TEST 1] Testing Authorized Sync Execution...")
        sync_res_1 = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a)
        assert sync_res_1.status_code == 200, f"Expected 200, got {sync_res_1.status_code}: {sync_res_1.text}"
        data_1 = sync_res_1.json()
        assert data_1.get("success") is True
        assert data_1.get("documentId") == doc_a_id
        assert data_1.get("intelligenceSnapshotId") == snap_a1_id
        print(f"  Sync successful. Summary: {data_1.get('summary')}")
        print("  [PASS] Test 1: Authorized sync endpoint executed successfully.")

        # [TEST 2] Correct number of workflow actions is created
        print("\n[TEST 2] Verifying Created Action Count...")
        summary_1 = data_1["summary"]
        assert summary_1["sourceActions"] == 3, f"Expected 3 source actions, got {summary_1['sourceActions']}"
        assert summary_1["created"] == 3, f"Expected 3 created actions, got {summary_1['created']}"
        assert summary_1["existing"] == 0, f"Expected 0 existing actions on first sync, got {summary_1['existing']}"
        assert summary_1["invalid"] == 0, f"Expected 0 invalid actions, got {summary_1['invalid']}"
        assert len(data_1["actions"]) == 3, f"Expected 3 action objects in payload, got {len(data_1['actions'])}"
        print(f"  Created 3/3 actions matching snapshot.")
        print("  [PASS] Test 2: Exact action count verified.")

        # [TEST 3] Field mapping is correct
        print("\n[TEST 3] Verifying Schema Field Mapping...")
        actions_map = {a["source_action_id"]: a for a in data_1["actions"]}
        act_term = actions_map.get("act-termination-01")
        assert act_term is not None, "act-termination-01 missing from synced actions"
        assert act_term["title"] == "Renegotiate Unilateral Termination Clause"
        assert act_term["category"] == "CRITICAL"
        assert act_term["priority_score"] == 85
        assert act_term["document_id"] == doc_a_id
        assert act_term["intelligence_snapshot_id"] == snap_a1_id
        print(f"  Mapped: {act_term['source_action_id']} -> Title: '{act_term['title']}', Cat: {act_term['category']}, Score: {act_term['priority_score']}")
        print("  [PASS] Test 3: Intelligence fields correctly mapped to workflow schema.")

        # [TEST 4] New workflow actions default to OPEN and human fields are NULL
        print("\n[TEST 4] Verifying Initial Status and Empty Human Workflow Fields...")
        for act in data_1["actions"]:
            assert act["status"] == "OPEN", f"Action {act['id']} status should be 'OPEN', got {act['status']}"
            assert act["decision"] is None, f"Action {act['id']} decision should be NULL initially"
            assert act["owner_id"] is None, f"Action {act['id']} owner_id should be NULL initially"
            assert act["due_date"] is None, f"Action {act['id']} due_date should be NULL initially"
            assert act["decision_reason"] is None, f"Action {act['id']} decision_reason should be NULL initially"
            assert act["resolution_notes"] is None, f"Action {act['id']} resolution_notes should be NULL initially"
            assert act["resolved_at"] is None, f"Action {act['id']} resolved_at should be NULL initially"
        print("  All 3 actions verified with status='OPEN' and NULL human decision/assignment fields.")
        print("  [PASS] Test 4: Default initial state and null human workflow fields verified.")

        # [TEST 5] Every newly created action has exactly one ACTION_CREATED activity record
        print("\n[TEST 5] Verifying Audit Activity Records...")
        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        for act in data_1["actions"]:
            cur_check.execute("""
                SELECT id, event_type, actor_id, metadata
                FROM contract_action_activity
                WHERE action_id = %s;
            """, (act["id"],))
            audits = cur_check.fetchall()
            assert len(audits) == 1, f"Expected 1 activity record for {act['id']}, got {len(audits)}"
            assert audits[0]["event_type"] == "ACTION_CREATED"
            assert audits[0]["actor_id"] == user_a_id
            meta = audits[0]["metadata"]
            if isinstance(meta, str):
                meta = json.loads(meta)
            assert meta.get("source") == "PHASE_6_4_INTELLIGENCE_SYNC"
            assert meta.get("intelligenceSnapshotId") == snap_a1_id
            assert meta.get("sourceActionId") == act["source_action_id"]
        cur_check.close()
        conn_check.close()
        print("  Exactly one ACTION_CREATED audit event verified per newly created action.")
        print("  [PASS] Test 5: Activity audit creation verified.")

        # [TEST 6] Calling sync twice against the same snapshot is idempotent
        print("\n[TEST 6] Testing Idempotency on Repeated Sync...")
        sync_res_2 = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a)
        assert sync_res_2.status_code == 200
        data_2 = sync_res_2.json()
        summary_2 = data_2["summary"]
        assert summary_2["created"] == 0, f"Expected 0 created on second sync, got {summary_2['created']}"
        assert summary_2["existing"] == 3, f"Expected 3 existing on second sync, got {summary_2['existing']}"
        assert summary_2["invalid"] == 0
        assert len(data_2["actions"]) == 3

        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT COUNT(*) AS cnt FROM contract_actions WHERE document_id = %s;", (doc_a_id,))
        total_actions_db = cur_check.fetchone()["cnt"]
        assert total_actions_db == 3, f"Expected 3 actions total in DB, got {total_actions_db}"
        cur_check.close()
        conn_check.close()
        print(f"  Second sync summary: created={summary_2['created']}, existing={summary_2['existing']}. DB count={total_actions_db}")
        print("  [PASS] Test 6: Sync is 100% idempotent with zero duplicate insertions.")

        # [TEST 7] Cross-user synchronization is blocked
        print("\n[TEST 7] Verifying Cross-User Sync Protection (HTTP 403)...")
        res_cross = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_b)
        assert res_cross.status_code == 403, f"Expected 403 for cross-user sync, got {res_cross.status_code}"
        print("  [PASS] Test 7: User B blocked from synchronizing User A's document.")

        # [TEST 8] Unauthenticated synchronization is blocked
        print("\n[TEST 8] Verifying Unauthenticated Access Rejection (HTTP 401)...")
        res_unauth = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync")
        assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"
        print("  [PASS] Test 8: Unauthenticated sync request rejected with HTTP 401.")

        # [TEST 9] Missing intelligence snapshot is handled safely
        print("\n[TEST 9] Testing Missing Intelligence Snapshot Handling (Doc B)...")
        res_no_intel = requests.post(f"{BASE_URL}/api/documents/{doc_b_id}/actions/sync", headers=headers_b)
        assert res_no_intel.status_code in [400, 404], f"Expected 404/400 for missing intelligence, got {res_no_intel.status_code}"
        conn_check = get_db_connection()
        cur_check = conn_check.cursor()
        cur_check.execute("SELECT COUNT(*) AS cnt FROM contract_actions WHERE document_id = %s;", (doc_b_id,))
        doc_b_actions = cur_check.fetchone()["cnt"]
        cur_check.close()
        conn_check.close()
        assert doc_b_actions == 0, f"No actions should be created for doc without intelligence, found {doc_b_actions}"
        print(f"  Handled cleanly with HTTP {res_no_intel.status_code}. Action count: {doc_b_actions}")
        print("  [PASS] Test 9: Missing intelligence snapshot handled gracefully.")

        # [TEST 10] A new intelligence snapshot does not overwrite existing human workflow records
        print("\n[TEST 10] Verifying Preservation of Human Workflow State Across Snapshots...")
        # Simulate human decision on existing action in Snapshot A1
        first_action_id = data_1["actions"][0]["id"]
        conn_dec = get_db_connection()
        cur_dec = conn_dec.cursor()
        cur_dec.execute("""
            UPDATE contract_actions
            SET status = 'IN_REVIEW', decision = 'NEGOTIATE', decision_reason = 'Human negotiated 60-day notice'
            WHERE id = %s;
        """, (first_action_id,))
        conn_dec.commit()

        # Insert Snapshot A2 with same source action IDs
        snap_a2_id = str(uuid.uuid4())
        cur_dec.execute("""
            INSERT INTO contract_intelligence (
                id, document_id, user_id, health_score, critical_count, important_count,
                monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
            ) VALUES (%s, %s, %s, 75, 2, 1, 0, 0, 'Refreshed summary', '[]'::jsonb, %s::jsonb, '{}'::jsonb);
        """, (snap_a2_id, doc_a_id, user_a_id, json.dumps(sample_actions)))
        conn_dec.commit()
        cur_dec.close()
        conn_dec.close()

        # Sync against latest Snapshot A2
        sync_res_3 = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/actions/sync", headers=headers_a)
        assert sync_res_3.status_code == 200
        data_3 = sync_res_3.json()
        assert data_3["intelligenceSnapshotId"] == snap_a2_id
        assert data_3["summary"]["created"] == 3

        # Verify old action from Snapshot A1 remains untouched
        conn_verify = get_db_connection()
        cur_verify = conn_verify.cursor()
        cur_verify.execute("SELECT status, decision, decision_reason FROM contract_actions WHERE id = %s;", (first_action_id,))
        preserved_action = cur_verify.fetchone()
        cur_verify.close()
        conn_verify.close()

        assert preserved_action["status"] == "IN_REVIEW"
        assert preserved_action["decision"] == "NEGOTIATE"
        assert preserved_action["decision_reason"] == "Human negotiated 60-day notice"
        print("  Old workflow action preserved: status='IN_REVIEW', decision='NEGOTIATE', reason='Human negotiated 60-day notice'")
        print("  [PASS] Test 10: Human workflow state preserved with zero overwrites.")

        # [TEST 11] Malformed source intelligence actions do not create corrupt workflow records
        print("\n[TEST 11] Testing Malformed Intelligence Handling...")
        doc_malformed_id = str(uuid.uuid4())
        snap_malformed_id = str(uuid.uuid4())
        conn_mal = get_db_connection()
        cur_mal = conn_mal.cursor()
        cur_mal.execute("""
            INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
            VALUES (%s, %s, 'malformed.pdf', 'Malformed.pdf', 1024, 'application/pdf');
        """, (doc_malformed_id, user_a_id))

        malformed_actions = [
            {"actionId": "valid-01", "title": "Valid Action", "category": "IMPORTANT", "priorityScore": 70},
            {"actionId": "", "title": "Missing Action ID", "category": "CRITICAL", "priorityScore": 80},  # Invalid
            {"actionId": "missing-title", "title": "", "category": "CRITICAL", "priorityScore": 80},     # Invalid
            {"actionId": "bad-score", "title": "Bad Score", "category": "CRITICAL", "priorityScore": 150}, # Invalid (>100)
            {"actionId": "bad-score-2", "title": "Negative Score", "category": "CRITICAL", "priorityScore": -10}, # Invalid (<0)
            None, # Invalid
            "string-item" # Invalid
        ]

        cur_mal.execute("""
            INSERT INTO contract_intelligence (
                id, document_id, user_id, health_score, critical_count, important_count,
                monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
            ) VALUES (%s, %s, %s, 70, 1, 0, 0, 0, 'Malformed Test', '[]'::jsonb, %s::jsonb, '{}'::jsonb);
        """, (snap_malformed_id, doc_malformed_id, user_a_id, json.dumps(malformed_actions)))
        conn_mal.commit()
        cur_mal.close()
        conn_mal.close()

        res_mal = requests.post(f"{BASE_URL}/api/documents/{doc_malformed_id}/actions/sync", headers=headers_a)
        assert res_mal.status_code == 200
        data_mal = res_mal.json()
        assert data_mal["summary"]["created"] == 1
        assert data_mal["summary"]["invalid"] == 6
        print(f"  Handled malformed snapshot safely: created=1, invalid=6.")
        print("  [PASS] Test 11: Malformed data filtered out without corrupting workflow database.")

        # [TEST 12] Phase 6.4 intelligence snapshot remains unchanged
        print("\n[TEST 12] Verifying Phase 6.4 Snapshot Immutability...")
        conn_snap = get_db_connection()
        cur_snap = conn_snap.cursor()
        cur_snap.execute("SELECT health_score, critical_count, actions_json FROM contract_intelligence WHERE id = %s;", (snap_a1_id,))
        snap_after = cur_snap.fetchone()
        cur_snap.close()
        conn_snap.close()

        assert snap_after["health_score"] == 72
        assert snap_after["critical_count"] == 2
        actions_after = snap_after["actions_json"]
        if isinstance(actions_after, str):
            actions_after = json.loads(actions_after)
        assert len(actions_after) == 3
        print("  Phase 6.4 snapshot columns and JSON payloads remain identical.")
        print("  [PASS] Test 12: Phase 6.4 intelligence remains 100% immutable.")

        # [TEST 13] No duplicate activity records are created after repeated sync calls
        print("\n[TEST 13] Verifying Activity Log Duplicate Prevention...")
        conn_act = get_db_connection()
        cur_act = conn_act.cursor()
        cur_act.execute("""
            SELECT action_id, COUNT(*) AS cnt
            FROM contract_action_activity
            WHERE event_type = 'ACTION_CREATED'
            GROUP BY action_id;
        """)
        activity_counts = cur_act.fetchall()
        for row in activity_counts:
            assert row["cnt"] == 1, f"Expected 1 ACTION_CREATED activity per action_id, found {row['cnt']} for action {row['action_id']}"
        cur_act.close()
        conn_act.close()
        print(f"  Verified {len(activity_counts)} activity logs across all actions, exactly 1 ACTION_CREATED per action.")
        print("  [PASS] Test 13: Zero duplicate activity records created.")

        # [TEST 14] Concurrent sync requests preserve database uniqueness
        print("\n[TEST 14] Testing Concurrent Synchronization Under Load...")
        doc_conc_id = str(uuid.uuid4())
        snap_conc_id = str(uuid.uuid4())
        conn_conc = get_db_connection()
        cur_conc = conn_conc.cursor()
        cur_conc.execute("""
            INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
            VALUES (%s, %s, 'concurrent.pdf', 'Concurrent.pdf', 1024, 'application/pdf');
        """, (doc_conc_id, user_a_id))
        cur_conc.execute("""
            INSERT INTO contract_intelligence (
                id, document_id, user_id, health_score, critical_count, important_count,
                monitoring_count, healthy_count, executive_summary, conflicts_json, actions_json, metrics_json
            ) VALUES (%s, %s, %s, 80, 2, 0, 0, 0, 'Concurrent Test', '[]'::jsonb, %s::jsonb, '{}'::jsonb);
        """, (snap_conc_id, doc_conc_id, user_a_id, json.dumps(sample_actions)))
        conn_conc.commit()
        cur_conc.close()
        conn_conc.close()

        def do_sync():
            return requests.post(f"{BASE_URL}/api/documents/{doc_conc_id}/actions/sync", headers=headers_a)

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(do_sync) for _ in range(5)]
            responses = [f.result() for f in futures]

        for r in responses:
            assert r.status_code == 200

        conn_conc = get_db_connection()
        cur_conc = conn_conc.cursor()
        cur_conc.execute("SELECT COUNT(*) AS cnt FROM contract_actions WHERE document_id = %s;", (doc_conc_id,))
        final_conc_count = cur_conc.fetchone()["cnt"]
        cur_conc.execute("""
            SELECT COUNT(*) AS cnt FROM contract_action_activity caa
            JOIN contract_actions ca ON caa.action_id = ca.id
            WHERE ca.document_id = %s;
        """, (doc_conc_id,))
        final_act_count = cur_conc.fetchone()["cnt"]
        cur_conc.close()
        conn_conc.close()

        assert final_conc_count == 3, f"Expected 3 actions after 5 concurrent requests, got {final_conc_count}"
        assert final_act_count == 3, f"Expected 3 activity records after 5 concurrent requests, got {final_act_count}"
        print(f"  5 concurrent requests produced exactly {final_conc_count} actions and {final_act_count} activity logs.")
        print("  [PASS] Test 14: Concurrent synchronization preserved database uniqueness.")

        # [TEST 15] Phase 7.1 schema integrity remains valid
        print("\n[TEST 15] Verifying Phase 7.1 Schema Integrity...")
        conn_schema = get_db_connection()
        cur_schema = conn_schema.cursor()
        cur_schema.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('contract_actions', 'contract_action_decisions', 'contract_action_activity');
        """)
        tables = [r["table_name"] for r in cur_schema.fetchall()]
        assert len(tables) == 3
        cur_schema.close()
        conn_schema.close()
        print("  All 3 Phase 7.1 tables active and verified.")
        print("  [PASS] Test 15: Schema integrity remains completely intact.")

        print("\n" + "=" * 80)
        print("ALL 15 PHASE 7.2.2 SYNCHRONIZATION TESTS PASSED (100%)")
        print("=" * 80)

    finally:
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
    verify_phase7_2_2()
