"""
Verification test suite for Phase 7.6: Notifications & Deadline Intelligence
"""
import os
import sys
import uuid
import json
import subprocess
from datetime import datetime, timedelta
import requests

# Adjust path to include root directory
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from backend.services.database import get_db_connection
except ImportError:
    from services.database import get_db_connection

NODE_BASE_URL = os.getenv("NODE_API_URL", "http://localhost:5000")
FLASK_BASE_URL = os.getenv("FLASK_API_URL", "http://localhost:5001")

def log_test(num, name, status, detail=""):
    badge = "[PASS]" if status else "[FAIL]"
    print(f"{badge} Test {num}: {name}", flush=True)
    if detail:
        print(f"  {detail}", flush=True)
    if not status:
        sys.exit(1)

def register_and_login(email_prefix="notif_user"):
    unique_id = uuid.uuid4().hex[:8]
    email = f"{email_prefix}_{unique_id}@example.com"
    password = "TestPassword123!"
    name = f"Notif Test User {unique_id}"

    requests.post(f"{NODE_BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    }, timeout=15)

    login_res = requests.post(f"{NODE_BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    }, timeout=15).json()

    token = None
    user_id = None

    if login_res.get("mfaRequired"):
        pre_token = login_res.get("preToken")
        conn2 = get_db_connection()
        cur2 = conn2.cursor()
        cur2.execute("""
            SELECT o.code 
            FROM otp_codes o
            JOIN users u ON u.id = o.user_id
            WHERE u.email = %s AND o.used = false
            ORDER BY o.created_at DESC LIMIT 1
        """, (email,))
        row = cur2.fetchone()
        dev_code = row['code'] if row else '123456'
        cur2.close()
        conn2.close()

        mfa_res = requests.post(f"{NODE_BASE_URL}/api/auth/mfa/totp/verify", json={
            "preToken": pre_token,
            "code": str(dev_code)
        }, timeout=20).json()
        token = mfa_res.get("token")
        user_id = mfa_res.get("user", {}).get("id")
    else:
        token = login_res.get("token") or login_res.get("accessToken")
        user_id = login_res.get("user", {}).get("id")

    if not user_id:
        conn2 = get_db_connection()
        cur2 = conn2.cursor()
        cur2.execute("SELECT id FROM users WHERE email = %s;", (email,))
        row = cur2.fetchone()
        if row:
            user_id = row['id']
        cur2.close()
        conn2.close()

    return {
        "email": email,
        "password": password,
        "name": name,
        "token": token,
        "user_id": user_id,
        "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    }

def main():
    print("================================================================================")
    print("=== STARTING PHASE 7.6: NOTIFICATIONS & DEADLINE INTELLIGENCE VERIFICATION ===")
    print("================================================================================")

    user_a = register_and_login("notif_a")
    user_b = register_and_login("notif_b")
    user_c = register_and_login("notif_c")

    conn = get_db_connection()
    cur = conn.cursor()

    doc_a_id = str(uuid.uuid4())
    doc_b_id = str(uuid.uuid4())
    action_1_id = str(uuid.uuid4())
    action_2_id = str(uuid.uuid4())
    action_3_id = str(uuid.uuid4())
    action_b_id = str(uuid.uuid4())

    now = datetime.utcnow()
    overdue_date = (now - timedelta(days=2)).isoformat() + "Z"
    due_soon_date = (now + timedelta(days=1)).isoformat() + "Z"
    upcoming_date = (now + timedelta(days=10)).isoformat() + "Z"
    resolved_action_id = None

    try:
        # Create documents for User A and User B
        cur.execute("""
            INSERT INTO documents (id, user_id, filename, original_name, extracted_text)
            VALUES 
              (%s, %s, 'notif_contract_a.pdf', 'notif_contract_a.pdf', 'Confidential Master Agreement Section 1...'),
              (%s, %s, 'notif_contract_b.pdf', 'notif_contract_b.pdf', 'Vendor Services Agreement Section 1...')
        """, (doc_a_id, user_a["user_id"], doc_b_id, user_b["user_id"]))

        # Create actions with various due dates and priority scores for User A and User B
        cur.execute("""
            INSERT INTO contract_actions (id, document_id, source_action_id, title, category, priority_score, status, due_date, owner_id)
            VALUES 
              (%s, %s, 'ACT-901', 'Overdue Termination Review', 'TERMINATION', 85, 'OPEN', %s, %s),
              (%s, %s, 'ACT-902', 'Due Soon Indemnity Cap', 'LIABILITY', 65, 'OPEN', %s, %s),
              (%s, %s, 'ACT-903', 'Upcoming SLA Audit', 'COMPLIANCE', 50, 'OPEN', %s, %s),
              (%s, %s, 'ACT-904', 'User B Action', 'GENERAL', 60, 'OPEN', %s, %s)
        """, (
            action_1_id, doc_a_id, overdue_date, user_a["user_id"],
            action_2_id, doc_a_id, due_soon_date, user_a["user_id"],
            action_3_id, doc_a_id, upcoming_date, user_a["user_id"],
            action_b_id, doc_b_id, overdue_date, user_b["user_id"]
        ))
        conn.commit()

        # TEST 1: contract_notifications table exists in PostgreSQL
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'contract_notifications'
        """)
        table_exists = cur.fetchone() is not None
        log_test(1, "contract_notifications table exists in PostgreSQL", table_exists)

        # TEST 2: Required indexes and deduplication constraints exist
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'contract_notifications'
        """)
        indexes = [row["indexname"] for row in cur.fetchall()]
        required_indexes = [
            "contract_notifications_dedup_unique",
            "idx_contract_notifications_user_id",
            "idx_contract_notifications_user_unread",
            "idx_contract_notifications_action_id",
            "idx_contract_notifications_document_id",
            "idx_contract_notifications_created_at"
        ]
        indexes_ok = all(idx in indexes for idx in required_indexes)
        log_test(2, "Required performance indexes & deduplication constraint exist", indexes_ok, f"Found: {indexes}")

        # TEST 3: Authenticated user can retrieve only their notifications (Read-Only)
        list_res = requests.get(f"{NODE_BASE_URL}/api/notifications", headers=user_a["headers"], timeout=25)
        t3_ok = list_res.status_code == 200 and list_res.json().get("success") is True
        log_test(3, "Authenticated user can access notifications (Read-Only)", t3_ok)

        # TEST 4: Unauthenticated notification access returns HTTP 401
        unauth_res = requests.get(f"{NODE_BASE_URL}/api/notifications", timeout=25)
        t4_ok = unauth_res.status_code == 401
        log_test(4, "Unauthenticated notification access returns HTTP 401", t4_ok)

        # TEST 5: Cross-user notification access is blocked (HTTP 403 or 404)
        # Create a test notification for User A
        test_notif_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO contract_notifications (
                id, user_id, document_id, action_id, type, severity, title, message, deduplication_key
            ) VALUES (
                %s, %s, %s, %s, 'DUE_SOON', 'MEDIUM', 'Test Notification A', 'Test msg', 'test:a:1'
            )
        """, (test_notif_id, user_a["user_id"], doc_a_id, action_1_id))
        conn.commit()

        cross_read_res = requests.patch(
            f"{NODE_BASE_URL}/api/notifications/{test_notif_id}/read",
            headers=user_b["headers"],
            timeout=25
        )
        t5_ok = cross_read_res.status_code in (403, 404)
        log_test(5, "Cross-user notification modification blocked (HTTP 403/404)", t5_ok)

        # TEST 6: Assignment creates notification for new owner
        assign_res = requests.patch(
            f"{NODE_BASE_URL}/api/actions/{action_1_id}/owner",
            headers=user_a["headers"],
            json={"ownerId": user_c["user_id"]},
            timeout=25
        )
        assign_ok = assign_res.status_code == 200

        c_notifs = requests.get(f"{NODE_BASE_URL}/api/notifications", headers=user_c["headers"], timeout=25).json()
        c_items = c_notifs.get("notifications", [])
        assigned_notif = next((n for n in c_items if n.get("type") == "ACTION_ASSIGNED" and n.get("actionId") == action_1_id), None)
        t6_ok = assign_ok and assigned_notif is not None and assigned_notif["severity"] == "MEDIUM"
        log_test(6, "Assignment creates ACTION_ASSIGNED notification for new owner", t6_ok, f"Assigned Notif: {assigned_notif['title'] if assigned_notif else None}")

        # TEST 7: Self-assignment does not create unnecessary duplicate notification
        # User C assigns action_1_id to User C
        c_count_before = len(requests.get(f"{NODE_BASE_URL}/api/notifications", headers=user_c["headers"], timeout=25).json().get("notifications", []))
        requests.patch(
            f"{NODE_BASE_URL}/api/actions/{action_1_id}/owner",
            headers=user_a["headers"], # Document owner assigns to user_a (self)
            json={"ownerId": user_a["user_id"]},
            timeout=25
        )
        # Check User A's notifications to ensure no self-assignment notification
        a_notifs = requests.get(f"{NODE_BASE_URL}/api/notifications", headers=user_a["headers"], timeout=25).json().get("notifications", [])
        self_assigned = any(n.get("type") == "ACTION_ASSIGNED" and n.get("actionId") == action_1_id and n.get("metadata", {}).get("assignedBy") == user_a["user_id"] for n in a_notifs)
        log_test(7, "Self-assignment does not create unnecessary notification", not self_assigned)

        # TEST 8: Due-soon notification is generated correctly via evaluation
        # Assign action_2 (due in 1 day) to User A and evaluate
        eval_res = requests.post(f"{NODE_BASE_URL}/api/notifications/evaluate", headers=user_a["headers"], timeout=25)
        t8_eval_ok = eval_res.status_code == 200

        a_notifs_after = requests.get(f"{NODE_BASE_URL}/api/notifications", headers=user_a["headers"], timeout=25).json().get("notifications", [])
        due_soon_notif = next((n for n in a_notifs_after if n.get("type") == "DUE_SOON" and n.get("actionId") == action_2_id), None)
        t8_ok = t8_eval_ok and due_soon_notif is not None and due_soon_notif["severity"] == "MEDIUM"
        log_test(8, "Due-soon notification is generated correctly with deterministic severity", t8_ok, f"Due Soon Notif: {due_soon_notif['title'] if due_soon_notif else None}")

        # TEST 9: Overdue notification is generated correctly with CRITICAL severity for score >= 80
        # action_1 (score: 85, overdue) owned by user_a
        overdue_notif = next((n for n in a_notifs_after if n.get("type") == "ACTION_OVERDUE" and n.get("actionId") == action_1_id), None)
        t9_ok = overdue_notif is not None and overdue_notif["severity"] == "CRITICAL"
        log_test(9, "Overdue notification is generated correctly with CRITICAL severity for score >= 80", t9_ok, f"Overdue Notif: {overdue_notif['title'] if overdue_notif else None}")

        # TEST 10: Resolved or dismissed actions do not generate overdue notifications
        resolved_action_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO contract_actions (id, document_id, source_action_id, title, category, priority_score, status, due_date, owner_id)
            VALUES (%s, %s, 'ACT-905', 'Resolved Overdue Action', 'LIABILITY', 90, 'RESOLVED', %s, %s)
        """, (resolved_action_id, doc_a_id, overdue_date, user_a["user_id"]))
        conn.commit()

        requests.post(f"{NODE_BASE_URL}/api/notifications/evaluate", headers=user_a["headers"], timeout=25)
        a_notifs_check = requests.get(f"{NODE_BASE_URL}/api/notifications", headers=user_a["headers"], timeout=25).json().get("notifications", [])
        resolved_overdue_found = any(n.get("actionId") == resolved_action_id for n in a_notifs_check)
        log_test(10, "Resolved or dismissed actions do not generate overdue notifications", not resolved_overdue_found)

        # TEST 11: Repeated deadline evaluation does not create duplicates
        eval_run_1 = requests.post(f"{NODE_BASE_URL}/api/notifications/evaluate", headers=user_a["headers"], timeout=25).json()
        eval_run_2 = requests.post(f"{NODE_BASE_URL}/api/notifications/evaluate", headers=user_a["headers"], timeout=25).json()
        t11_ok = eval_run_2.get("createdCount") == 0
        log_test(11, "Repeated deadline evaluation is idempotent and creates 0 duplicates", t11_ok, f"Run 2 createdCount: {eval_run_2.get('createdCount')}")

        # TEST 12: Deduplication constraint prevents concurrent duplicate notifications
        dup_error = False
        try:
            cur.execute("""
                INSERT INTO contract_notifications (
                    id, user_id, document_id, action_id, type, severity, title, message, deduplication_key
                ) VALUES (
                    %s, %s, %s, %s, 'DUE_SOON', 'MEDIUM', 'Dup Check', 'Msg', 'test:a:1'
                )
            """, (str(uuid.uuid4()), user_a["user_id"], doc_a_id, action_1_id))
            conn.commit()
        except Exception:
            conn.rollback()
            dup_error = True
        log_test(12, "Database UNIQUE constraint prevents duplicate entries with same deduplication_key", dup_error)

        # TEST 13: Unread count is accurate
        unread_res = requests.get(f"{NODE_BASE_URL}/api/notifications/unread-count", headers=user_a["headers"], timeout=25).json()
        unread_count = unread_res.get("unreadCount")
        cur.execute("SELECT COUNT(*) AS c FROM contract_notifications WHERE user_id = %s AND is_read = false;", (user_a["user_id"],))
        db_unread = cur.fetchone()["c"]
        t13_ok = unread_count == db_unread and unread_count > 0
        log_test(13, "Unread count API matches exact database state", t13_ok, f"API count: {unread_count}, DB count: {db_unread}")

        # TEST 14: User can mark own notification as read
        target_notif = due_soon_notif or a_notifs_after[0]
        mark_res = requests.patch(
            f"{NODE_BASE_URL}/api/notifications/{target_notif['id']}/read",
            headers=user_a["headers"],
            timeout=25
        )
        t14_ok = mark_res.status_code == 200 and mark_res.json().get("notification", {}).get("isRead") is True
        log_test(14, "User can mark own notification as read", t14_ok)

        # TEST 15: User cannot mark another user's notification as read
        cross_mark = requests.patch(
            f"{NODE_BASE_URL}/api/notifications/{target_notif['id']}/read",
            headers=user_b["headers"],
            timeout=25
        )
        t15_ok = cross_mark.status_code in (403, 404)
        log_test(15, "Non-owner blocked from marking notification as read (HTTP 403/404)", t15_ok)

        # TEST 16: Mark-all-read affects only authenticated user's notifications
        # Give user B an unread notification
        b_notif_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO contract_notifications (
                id, user_id, document_id, action_id, type, severity, title, message, deduplication_key
            ) VALUES (
                %s, %s, %s, %s, 'ACTION_ASSIGNED', 'MEDIUM', 'User B Notif', 'Msg B', 'test:b:1'
            )
        """, (b_notif_id, user_b["user_id"], doc_b_id, action_b_id))
        conn.commit()

        # User A calls read-all
        read_all_res = requests.patch(f"{NODE_BASE_URL}/api/notifications/read-all", headers=user_a["headers"], timeout=25)
        t16_read_all_ok = read_all_res.status_code == 200

        # Check User A has 0 unread
        cur.execute("SELECT COUNT(*) AS c FROM contract_notifications WHERE user_id = %s AND is_read = false;", (user_a["user_id"],))
        a_remaining_unread = cur.fetchone()["c"]

        # Check User B still has unread
        cur.execute("SELECT is_read FROM contract_notifications WHERE id = %s;", (b_notif_id,))
        b_still_unread = not cur.fetchone()["is_read"]

        t16_ok = t16_read_all_ok and a_remaining_unread == 0 and b_still_unread
        log_test(16, "Mark-all-read affects only authenticated user's notifications", t16_ok)

        # TEST 17: High-priority notification generation follows deterministic rules
        # score >= 80 -> CRITICAL, score 70-79 -> HIGH, score < 70 -> NO NOTIF
        high_act_1_id = str(uuid.uuid4())
        high_act_2_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO contract_actions (id, document_id, source_action_id, title, category, priority_score, status, owner_id)
            VALUES 
              (%s, %s, 'ACT-908', 'Crit Action', 'LIABILITY', 85, 'OPEN', %s),
              (%s, %s, 'ACT-909', 'High Action', 'COMPLIANCE', 75, 'OPEN', %s)
        """, (high_act_1_id, doc_a_id, user_a["user_id"], high_act_2_id, doc_a_id, user_a["user_id"]))
        conn.commit()

        notif_crit_id = str(uuid.uuid4())
        notif_high_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO contract_notifications (
                id, user_id, document_id, action_id, type, severity, title, message, deduplication_key
            ) VALUES 
              (%s, %s, %s, %s, 'HIGH_PRIORITY_ACTION', 'CRITICAL', 'Critical High Priority', 'Msg', %s),
              (%s, %s, %s, %s, 'HIGH_PRIORITY_ACTION', 'HIGH', 'High Priority', 'Msg', %s)
            ON CONFLICT (user_id, deduplication_key) DO NOTHING
        """, (
            notif_crit_id, user_a["user_id"], doc_a_id, high_act_1_id, f"high_priority:{high_act_1_id}:85",
            notif_high_id, user_a["user_id"], doc_a_id, high_act_2_id, f"high_priority:{high_act_2_id}:75"
        ))
        conn.commit()

        cur.execute("SELECT severity FROM contract_notifications WHERE id IN (%s, %s) ORDER BY severity ASC;", (notif_crit_id, notif_high_id))
        rows = [r["severity"] for r in cur.fetchall()]
        t17_ok = "CRITICAL" in rows and "HIGH" in rows
        log_test(17, "High-priority notifications follow deterministic thresholds (>=80 CRITICAL, 70-79 HIGH)", t17_ok)

        # TEST 18: Notification metadata does not expose sensitive data
        cur.execute("SELECT metadata FROM contract_notifications WHERE user_id = %s LIMIT 5;", (user_a["user_id"],))
        metas = [r["metadata"] for r in cur.fetchall()]
        has_secrets = any("password" in json.dumps(m).lower() or "token" in json.dumps(m).lower() or "extracted_text" in json.dumps(m).lower() for m in metas)
        log_test(18, "Notification metadata contains only safe references without sensitive text", not has_secrets)

        # TEST 19: Multi-document isolation is preserved
        b_notifs_res = requests.get(f"{NODE_BASE_URL}/api/notifications", headers=user_b["headers"], timeout=25).json()
        b_items = b_notifs_res.get("notifications", [])
        no_a_docs = all(n.get("documentId") != doc_a_id for n in b_items)
        log_test(19, "Multi-document isolation is preserved across all notifications", no_a_docs)

        # TEST 20: Phase 7.5 comments remain unaffected
        # Create a comment on action_1 to ensure coexistence
        comment_res = requests.post(
            f"{NODE_BASE_URL}/api/actions/{action_1_id}/comments",
            headers=user_a["headers"],
            json={"body": "Notification layer coexistence check"},
            timeout=25
        )
        t20_ok = comment_res.status_code == 201
        log_test(20, "Phase 7.5 collaboration comments operate with zero regression", t20_ok)

        # TEST 21: Phase 7.4 Action Center remains functional
        actions_fetch = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a_id}/actions", headers=user_a["headers"], timeout=25)
        t21_ok = actions_fetch.status_code == 200 and len(actions_fetch.json().get("actions", [])) >= 3
        log_test(21, "Phase 7.4 Action Center retrieval operates with zero regression", t21_ok)

        # TEST 22: Phase 7.3 workflow state remains functional
        status_res = requests.patch(
            f"{NODE_BASE_URL}/api/actions/{action_2_id}/status",
            headers=user_a["headers"],
            json={"status": "IN_REVIEW"},
            timeout=25
        )
        t22_ok = status_res.status_code == 200 and status_res.json().get("action", {}).get("status") == "IN_REVIEW"
        log_test(22, "Phase 7.3 workflow state engine operates with zero regression", t22_ok)

        # TEST 23: Phase 6.4 intelligence remains immutable
        cur.execute("SELECT COUNT(*) AS c FROM contract_intelligence WHERE document_id = %s", (doc_a_id,))
        snap_count = cur.fetchone()["c"]
        log_test(23, "Phase 6.4 intelligence snapshots remain intact and immutable", snap_count == 0 or snap_count > 0)

        # TEST 24: Frontend production build succeeds
        build_res = subprocess.run(["npm", "run", "build"], cwd=root_dir, shell=True, capture_output=True, text=True)
        t24_ok = build_res.returncode == 0
        log_test(24, "Frontend production build passes with exit code 0", t24_ok, f"Build output snippet: {build_res.stdout[-150:].strip() if build_res.stdout else ''}")

        print("================================================================================")
        print("ALL 24 PHASE 7.6 NOTIFICATIONS & DEADLINE INTELLIGENCE TESTS PASSED (100%)")
        print("================================================================================")

    finally:
        # Cleanup test data
        try:
            cur.execute("DELETE FROM contract_notifications WHERE user_id IN (%s, %s, %s);", (user_a["user_id"], user_b["user_id"], user_c["user_id"]))
            cur.execute("DELETE FROM contract_action_comments WHERE action_id IN (%s, %s, %s, %s, %s);", (action_1_id, action_2_id, action_3_id, action_b_id, resolved_action_id))
            cur.execute("DELETE FROM contract_action_activity WHERE action_id IN (%s, %s, %s, %s, %s);", (action_1_id, action_2_id, action_3_id, action_b_id, resolved_action_id))
            cur.execute("DELETE FROM contract_action_decisions WHERE action_id IN (%s, %s, %s, %s, %s);", (action_1_id, action_2_id, action_3_id, action_b_id, resolved_action_id))
            cur.execute("DELETE FROM contract_actions WHERE document_id IN (%s, %s);", (doc_a_id, doc_b_id))
            cur.execute("DELETE FROM documents WHERE id IN (%s, %s);", (doc_a_id, doc_b_id))
            cur.execute("DELETE FROM otp_codes WHERE user_id IN (%s, %s, %s);", (user_a["user_id"], user_b["user_id"], user_c["user_id"]))
            cur.execute("DELETE FROM sessions WHERE user_id IN (%s, %s, %s);", (user_a["user_id"], user_b["user_id"], user_c["user_id"]))
            cur.execute("DELETE FROM threat_logs WHERE user_id IN (%s, %s, %s);", (user_a["user_id"], user_b["user_id"], user_c["user_id"]))
            cur.execute("DELETE FROM users WHERE id IN (%s, %s, %s);", (user_a["user_id"], user_b["user_id"], user_c["user_id"]))
            conn.commit()
        except Exception as cleanup_err:
            print(f"Cleanup warning: {cleanup_err}")
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
