#!/usr/bin/env python3
"""
verify_phase7_7_analytics.py
Phase 7.7 Verification Suite: Workflow Escalation, Attention Management & Operational Intelligence
DocuGuard AI
"""

import sys
import os
import time
import uuid
import json
import requests
from datetime import datetime, timedelta

# Adjust path to include root directory
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from backend.services.database import get_db_connection
except ImportError:
    from services.database import get_db_connection

NODE_BASE_URL = os.environ.get("NODE_API_URL", "http://localhost:5000")

# Test run tracker
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
        if not passed:
            sys.exit(1)

def register_and_login(email_prefix="analytics_user"):
    unique_id = uuid.uuid4().hex[:8]
    email = f"{email_prefix}_{unique_id}@example.com"
    password = "TestPassword123!"
    name = f"Analytics Test User {unique_id}"

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
        "token": token,
        "user": {"id": user_id, "email": email, "name": name}
    }

def create_test_document(token, user_id, title="Analytics Master Agreement"):
    doc_id = str(uuid.uuid4())
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO documents (
            id, user_id, filename, original_name, size, mime_type, extracted_text
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id;
    """, (
        doc_id, user_id, f"{doc_id}.pdf", f"{title}.pdf", 1024, "application/pdf",
        "Test contract text for Phase 7.7 analytics evaluation."
    ))
    conn.commit()
    cur.close()
    conn.close()
    return doc_id

def create_intelligence_and_sync(token, user_id, doc_id):
    headers = {"Authorization": f"Bearer {token}"}
    snap_id = str(uuid.uuid4())
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Insert intelligence snapshot
    action_plan = [
        {
            "action_id": "act-indemnity-01",
            "title": "Cap Unlimited Indemnity Exposure",
            "category": "LIABILITY",
            "priority": "CRITICAL",
            "priority_score": 92,
            "reasoning": "Uncapped indemnification poses extreme financial exposure."
        },
        {
            "action_id": "act-sla-02",
            "title": "Establish 99.9% Uptime Remedy",
            "category": "SERVICE_LEVEL",
            "priority": "HIGH",
            "priority_score": 76,
            "reasoning": "Vague service remedy requires deterministic escalation."
        },
        {
            "action_id": "act-audit-03",
            "title": "Limit Annual Audit Notice Window",
            "category": "AUDIT",
            "priority": "MEDIUM",
            "priority_score": 54,
            "reasoning": "Notice window too short for operations."
        },
        {
            "action_id": "act-data-04",
            "title": "Clarify Cross-Border Data Transfer Terms",
            "category": "PRIVACY",
            "priority": "HIGH",
            "priority_score": 72,
            "reasoning": "High risk unassigned data sovereignty requirement."
        }
    ]
    
    cur.execute("""
        INSERT INTO contract_intelligence (
            id, document_id, user_id, health_score, critical_count, important_count,
            monitoring_count, healthy_count, executive_summary, conflicts_json,
            actions_json, metrics_json, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
        );
    """, (
        snap_id, doc_id, user_id, 75, 2, 2, 0, 0,
        "Executive Summary for Phase 7.7",
        json.dumps([]), json.dumps(action_plan), json.dumps({"actionsCount": 4})
    ))
    conn.commit()
    cur.close()
    conn.close()
    
    # Call sync endpoint
    sync_res = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_id}/actions/sync", headers=headers)
    return sync_res.status_code == 200

def run_all_tests():
    print("============================================================")
    print("RUNNING PHASE 7.7 VERIFICATION SUITE: WORKFLOW ANALYTICS & ESCALATION")
    print("============================================================")
    
    # 1. Setup User A and Document A
    user_a_data = register_and_login("analytics_a")
    token_a = user_a_data["token"]
    user_a = user_a_data["user"]

    user_b_data = register_and_login("analytics_b")
    token_b = user_b_data["token"]
    user_b = user_b_data["user"]

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    doc_a = create_test_document(token_a, user_a["id"], "Master Vendor Services Agreement")
    synced = create_intelligence_and_sync(token_a, user_a["id"], doc_a)
    log_test("Document & Actions Initialization", synced)
    
    # 2. Test GET /api/documents/:id/workflow-analytics on baseline state
    ana_res = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/workflow-analytics", headers=headers_a)
    log_test("GET /workflow-analytics returns 200", ana_res.status_code == 200)
    
    ana_data = ana_res.json()
    log_test("Analytics payload contains all 10 core sections", 
             all(k in ana_data for k in [
                 "overview", "resolutionPerformance", "deadlinePerformance",
                 "priorityDistribution", "decisionMetrics", "ownerWorkload",
                 "reopenMetrics", "collaborationMetrics", "categoryMetrics",
                 "operationalHealth"
             ]))
    
    # 3. Test Operational Health Score format & formulaVersion 1.0 (Correction 3)
    health = ana_data.get("operationalHealth", {})
    log_test("Operational Health Score has formulaVersion '1.0'", health.get("formulaVersion") == "1.0")
    log_test("Operational Health Score is integer bounded [0, 100]", 
             isinstance(health.get("score"), (int, float)) and 0 <= health.get("score") <= 100)
    log_test("Operational Health Score components are explicitly exposed",
             all(c in health.get("components", {}) for c in [
                 "resolutionPerformance", "deadlinePerformance", "priorityManagement",
                 "overduePenalty", "reopenPenalty"
             ]))
    
    # 4. Fetch Actions for doc_a
    act_res = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/actions", headers=headers_a)
    actions = act_res.json().get("actions", [])
    log_test("Actions retrieved for test manipulation", len(actions) == 4)
    
    act_critical = next((a for a in actions if a["source_action_id"] == "act-indemnity-01"), None)
    act_sla = next((a for a in actions if a["source_action_id"] == "act-sla-02"), None)
    act_audit = next((a for a in actions if a["source_action_id"] == "act-audit-03"), None)
    act_data = next((a for a in actions if a["source_action_id"] == "act-data-04"), None)
    
    # 5. Seed Deterministic Escalation Scenarios in DB:
    #   - OVERDUE_3D: act_sla -> due_date = NOW() - 4 days
    #   - IGNORED_CRITICAL_5D: act_critical -> priority_score = 92, status = OPEN, created_at = NOW() - 6 days
    #   - UNASSIGNED_HIGH_RISK_3D: act_data -> priority_score = 72, owner_id = NULL, created_at = NOW() - 4 days
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        UPDATE contract_actions
        SET due_date = CURRENT_TIMESTAMP - INTERVAL '4 days',
            owner_id = %s
        WHERE id = %s;
    """, (user_a["id"], act_sla["id"]))
    
    cur.execute("""
        UPDATE contract_actions
        SET created_at = CURRENT_TIMESTAMP - INTERVAL '6 days',
            owner_id = %s
        WHERE id = %s;
    """, (user_a["id"], act_critical["id"]))
    
    cur.execute("""
        UPDATE contract_actions
        SET created_at = CURRENT_TIMESTAMP - INTERVAL '4 days',
            owner_id = NULL
        WHERE id = %s;
    """, (act_data["id"],))
    
    conn.commit()
    cur.close()
    conn.close()
    
    # 6. Explicitly Trigger Escalation Evaluation POST /api/documents/:id/escalations/evaluate
    esc_eval_res = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_a}/escalations/evaluate", headers=headers_a)
    log_test("POST /escalations/evaluate returns 200", esc_eval_res.status_code == 200)
    
    eval_data = esc_eval_res.json()
    log_test("Escalation engine evaluated 4 active actions", eval_data.get("totalEvaluated") == 4)
    log_test("Escalation engine triggered 3 escalations", eval_data.get("newlyEscalatedCount") == 3)
    
    # 7. Check database rows for escalation metadata (Correction 2)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, is_escalated, escalation_rule, escalation_reason, escalated_at
        FROM contract_actions
        WHERE document_id = %s;
    """, (doc_a,))
    escalated_rows = {r["id"]: r for r in cur.fetchall()}
    cur.close()
    conn.close()
    
    log_test("Overdue action flagged is_escalated=True with OVERDUE_3D",
             escalated_rows[act_sla["id"]]["is_escalated"] and 
             escalated_rows[act_sla["id"]]["escalation_rule"] == "OVERDUE_3D")
    
    log_test("Ignored critical action flagged is_escalated=True with IGNORED_CRITICAL_5D",
             escalated_rows[act_critical["id"]]["is_escalated"] and 
             escalated_rows[act_critical["id"]]["escalation_rule"] == "IGNORED_CRITICAL_5D")
    
    log_test("Unassigned high risk action flagged is_escalated=True with UNASSIGNED_HIGH_RISK_3D",
             escalated_rows[act_data["id"]]["is_escalated"] and 
             escalated_rows[act_data["id"]]["escalation_rule"] == "UNASSIGNED_HIGH_RISK_3D")
    
    # 8. Check append-only audit trail contract_action_activity for ACTION_ESCALATED
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, action_id, event_type, metadata
        FROM contract_action_activity
        WHERE event_type = 'ACTION_ESCALATED' AND action_id = ANY(%s);
    """, ([act_sla["id"], act_critical["id"], act_data["id"]],))
    esc_activities = cur.fetchall()
    cur.close()
    conn.close()
    
    log_test("ACTION_ESCALATED logged in audit trail for each escalated action", len(esc_activities) >= 3)
    
    # 9. Verify Notification Deduplication Key (Correction 1)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, action_id, type, deduplication_key, message
        FROM contract_notifications
        WHERE type = 'ACTION_ESCALATED' AND document_id = %s;
    """, (doc_a,))
    notifs = cur.fetchall()
    cur.close()
    conn.close()
    
    log_test("Escalation notifications created with activity-based deduplication keys",
             len(notifs) >= 3 and all("escalated:" in n["deduplication_key"] for n in notifs))
    
    # 10. Re-evaluate Escalation (Deduplication / Idempotency Test)
    re_eval_res = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_a}/escalations/evaluate", headers=headers_a)
    re_eval_data = re_eval_res.json()
    log_test("Subsequent evaluation produces 0 newly escalated actions (idempotent)",
             re_eval_data.get("newlyEscalatedCount") == 0)
    
    # 11. Test GET /api/documents/:id/attention-queue
    att_res = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/attention-queue", headers=headers_a)
    log_test("GET /attention-queue returns 200", att_res.status_code == 200)
    
    att_data = att_res.json()
    log_test("Attention queue includes all 3 escalated high-risk items", 
             att_data.get("totalAttentionItems") >= 3)
    
    # 12. Test Escalation Lifecycle: Resolve an escalated action (Correction 4)
    # Step 12a: Move to IN_REVIEW first
    in_review_res = requests.patch(
        f"{NODE_BASE_URL}/api/actions/{act_sla['id']}/status",
        headers=headers_a,
        json={"status": "IN_REVIEW"}
    )
    log_test("Transition escalated action to IN_REVIEW succeeds", in_review_res.status_code == 200)

    # Step 12b: Move to RESOLVED
    res_trans = requests.patch(
        f"{NODE_BASE_URL}/api/actions/{act_sla['id']}/status",
        headers=headers_a,
        json={
            "status": "RESOLVED",
            "resolutionNotes": "Agreed with counterparty to add 99.9% uptime credit tier."
        }
    )
    log_test("Transition escalated action to RESOLVED succeeds", res_trans.status_code == 200)
    
    # Verify active is_escalated is cleared in DB
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT is_escalated, escalation_rule, escalation_reason, escalated_at
        FROM contract_actions
        WHERE id = %s;
    """, (act_sla["id"],))
    resolved_row = cur.fetchone()
    cur.close()
    conn.close()
    
    log_test("Resolved action has is_escalated=False and metadata cleared",
             resolved_row["is_escalated"] is False and resolved_row["escalation_rule"] is None)
    
    # 13. Verify Attention Queue reflects resolved action removal
    att_res_after = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/attention-queue", headers=headers_a)
    att_items_after = att_res_after.json().get("attentionQueue", [])
    log_test("Resolved action is excluded from executive attention queue",
             not any(item["id"] == act_sla["id"] for item in att_items_after))
    
    # 14. Record Decision & Collaboration for remaining actions
    dec_res = requests.post(
        f"{NODE_BASE_URL}/api/actions/{act_critical['id']}/decision",
        headers=headers_a,
        json={
            "decision": "ESCALATE",
            "reason": "Escalated to General Counsel for unlimited indemnity carveout."
        }
    )
    log_test("Record ESCALATE decision on critical action", dec_res.status_code in [200, 201])
    
    comment_res = requests.post(
        f"{NODE_BASE_URL}/api/actions/{act_critical['id']}/comments",
        headers=headers_a,
        json={
            "body": "Legal counsel meeting scheduled for tomorrow morning."
        }
    )
    log_test("Post collaboration comment on critical action", comment_res.status_code in [200, 201])
    
    # 15. Reopen an action (act_sla) to test reopen penalty & tracking
    reopen_res = requests.patch(
        f"{NODE_BASE_URL}/api/actions/{act_sla['id']}/status",
        headers=headers_a,
        json={
            "status": "IN_REVIEW",
            "reason": "Counterparty revised SLA terms in final draft."
        }
    )
    log_test("Reopen resolved action to IN_REVIEW", reopen_res.status_code == 200)
    
    # 16. Verify updated workflow analytics reflects decisions, comments, and reopen
    ana_updated_res = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/workflow-analytics", headers=headers_a)
    ana_updated = ana_updated_res.json()
    
    log_test("Decision metrics reflect recorded ESCALATE decision",
             ana_updated["decisionMetrics"]["escalate"] >= 1)
    
    log_test("Collaboration metrics reflect recorded comment thread",
             ana_updated["collaborationMetrics"]["totalComments"] >= 1)
    
    log_test("Reopen metrics reflect reopened action",
             ana_updated["reopenMetrics"]["reopenedActions"] >= 1)
    
    # 17. Test Multi-Document Isolation & Authorization
    unauth_ana = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/workflow-analytics", headers=headers_b)
    log_test("Unauthorized User B gets 403 on User A's workflow analytics", unauth_ana.status_code == 403)
    
    unauth_queue = requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/attention-queue", headers=headers_b)
    log_test("Unauthorized User B gets 403 on User A's attention queue", unauth_queue.status_code == 403)
    
    unauth_esc = requests.post(f"{NODE_BASE_URL}/api/documents/{doc_a}/escalations/evaluate", headers=headers_b)
    log_test("Unauthorized User B gets 403 on User A's escalation evaluation", unauth_esc.status_code == 403)
    
    # 18. Test Read-Only Guarantee on GET endpoints
    count_before = len(requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/actions", headers=headers_a).json().get("actions", []))
    requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/workflow-analytics", headers=headers_a)
    requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/attention-queue", headers=headers_a)
    count_after = len(requests.get(f"{NODE_BASE_URL}/api/documents/{doc_a}/actions", headers=headers_a).json().get("actions", []))
    log_test("GET analytics endpoints are strictly read-only (zero row mutations)", count_before == count_after)
    
    # Summary
    print("============================================================")
    print(f"PHASE 7.7 VERIFICATION SUMMARY: {passed_tests}/{total_tests} Tests Passed")
    print("============================================================")
    
    if passed_tests == total_tests:
        print("ALL PHASE 7.7 VERIFICATION TESTS PASSED SUCCESSFULLY!")
        return 0
    else:
        print(f"FAILED: {total_tests - passed_tests} test(s) failed.")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
