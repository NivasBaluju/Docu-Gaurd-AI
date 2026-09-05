import os
import sys
import io
import json
import time
import requests
from dotenv import load_dotenv

# Ensure root directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
sys.stdout.reconfigure(line_buffering=True, encoding='utf-8')

try:
    from backend.services.database import get_db_connection
    from backend.services.intelligence_service import compute_contract_intelligence
except ImportError:
    from services.database import get_db_connection
    from services.intelligence_service import compute_contract_intelligence

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:5000")
FLASK_URL = os.getenv("FLASK_URL", "http://127.0.0.1:5001")

CONTRACT_A_TEXT = (
    "MASTER SERVICES AGREEMENT\n\n"
    "Section 1. Scope of Services\n"
    "The Provider shall furnish cloud architecture consulting services as described in attached statements of work.\n\n"
    "Section 2. Termination\n"
    "Either party may terminate this Agreement only upon thirty (30) days' prior written notice in the event of an uncured material breach.\n\n"
    "Section 3. Payment Terms\n"
    "Invoices shall be payable strictly within thirty (30) days of receipt. Invoices unpaid after 30 days shall accrue late interest of 1.5% per month.\n\n"
    "Section 4. Confidentiality Obligations\n"
    "Recipient agrees to hold all proprietary trade secrets in strict confidence and shall be liable for injunctive relief in the event of unauthorized disclosure.\n\n"
    "Section 5. Limitation of Liability\n"
    "Neither party shall be liable for consequential damages, and total aggregate liability shall not exceed fees paid in the preceding twelve (12) months.\n"
)

CONTRACT_B_TEXT = (
    "EQUIPMENT LEASE AGREEMENT\n\n"
    "Section 1. Leased Property\n"
    "Lessor leases to Lessee certain industrial robotics hardware.\n\n"
    "Section 2. Maintenance and Inspection\n"
    "Lessee shall maintain the hardware in good working condition and allow quarterly inspections.\n"
)

CONTRACT_CONFLICT_TEXT = (
    "VENDOR SUPPLY AGREEMENT\n\n"
    "Section 1. Goods and Delivery\n"
    "Supplier agrees to deliver industrial parts on a bi-weekly basis.\n\n"
    "Section 2. Standard Notice\n"
    "All official contract notices must be provided with sixty (60) days' prior written notice.\n\n"
    "Section 3. Payment Terms\n"
    "All invoices are payable strictly within thirty (30) days of receipt.\n\n"
    "Section 4. Termination for Convenience\n"
    "The Customer may terminate this contract at any time without notice.\n\n"
    "Section 5. Limitation of Liability\n"
    "Total aggregate liability shall not exceed fees paid under this agreement.\n\n"
    "Section 6. Indemnification\n"
    "Supplier shall indemnify, defend, and hold harmless Customer against all claims and damages without limitation.\n\n"
    "Section 7. Emergency Cure Notice\n"
    "Any default must be cured within fifteen (15) days' prior written notice.\n\n"
    "Section 8. Billing Terms\n"
    "Invoices shall be due within fifteen (15) days of issuance.\n"
)

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

    analyze_res = requests.post(f"{BASE_URL}/api/documents/{doc_id}/analyze", headers=headers)
    assert analyze_res.status_code == 200, f"Analysis failed: {analyze_res.text}"
    return doc_id

def run_all_tests():
    print("=" * 75)
    print("=== STARTING PHASE 6.4: EXECUTIVE CONTRACT INTELLIGENCE VERIFICATION ===")
    print("=" * 75)

    token_a = authenticate_user("admin@deciva.ai", "Password123!")
    token_b = authenticate_user("auditor@deciva.ai", "Password123!", name="Auditor User")
    assert token_a and token_b, "Failed to authenticate test users."
    print("  [Setup] Authenticated sessions established (Admin + Non-Admin Auditor).")

    doc_a_id = upload_and_analyze(token_a, "Contract_A_Intelligence_Master", CONTRACT_A_TEXT)
    doc_b_id = upload_and_analyze(token_a, "Contract_B_Intelligence_Lease", CONTRACT_B_TEXT)
    print(f"  [Setup] Uploaded Document A (ID: {doc_a_id}) and Document B (ID: {doc_b_id})")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Simulate a scenario on Doc A to verify cross-feature simulation incorporation
    requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/simulate",
        headers=headers_a,
        json={"scenario": "What happens if either party terminates immediately without prior notice?"}
    )

    # -------------------------------------------------------------------------
    # TEST 1: Risk & Feature Aggregation
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Risk & Cross-Feature Aggregation Check...")
    res_a = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/intelligence", headers=headers_a)
    assert res_a.status_code == 200, f"Intelligence fetch failed: {res_a.text}"
    data_a = res_a.json()

    assert "healthScore" in data_a, "Missing healthScore"
    assert "metrics" in data_a, "Missing metrics"
    assert "actionPlan" in data_a, "Missing actionPlan"
    assert len(data_a["actionPlan"]) > 0, "Expected action items in action plan"
    assert data_a["metrics"]["totalActionItems"] == len(data_a["actionPlan"])
    print(f"  Aggregated Action Items Count: {data_a['metrics']['totalActionItems']}")
    print(f"  Contract Health Score: {data_a['healthScore']}/100")
    print(f"  Critical Count: {data_a['metrics']['criticalCount']} | Important: {data_a['metrics']['importantCount']}")
    print("  [PASS] Test 1: Full multi-feature risk aggregation verified.")

    # -------------------------------------------------------------------------
    # TEST 2: Deterministic Priority Scoring & Range Bounding
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Deterministic Priority Scoring & Mathematical Bounding...")
    # Compute intelligence multiple times directly and via gateway
    run1 = compute_contract_intelligence(doc_a_id)
    run2 = compute_contract_intelligence(doc_a_id)

    assert run1["healthScore"] == run2["healthScore"], "Health score not deterministic"
    assert len(run1["actionPlan"]) == len(run2["actionPlan"]), "Action items count mismatch"

    for idx, (a1, a2) in enumerate(zip(run1["actionPlan"], run2["actionPlan"])):
        assert a1["priorityScore"] == a2["priorityScore"], f"Score non-deterministic for action {idx}"
        b1 = a1["priorityBreakdown"]
        b2 = a2["priorityBreakdown"]
        assert b1 == b2, f"Breakdown non-deterministic for action {idx}"

        # Verify contribution maximums
        assert b1["clauseSeverity"] <= 35, f"Clause severity exceeds max 35: {b1['clauseSeverity']}"
        assert b1["negotiationImbalance"] <= 20, f"Negotiation imbalance exceeds max 20: {b1['negotiationImbalance']}"
        assert b1["simulationExposure"] <= 20, f"Simulation exposure exceeds max 20: {b1['simulationExposure']}"
        assert b1["deadlineUrgency"] <= 15, f"Deadline urgency exceeds max 15: {b1['deadlineUrgency']}"
        assert b1["complianceHazard"] <= 10, f"Compliance hazard exceeds max 10: {b1['complianceHazard']}"
        assert 0 <= a1["priorityScore"] <= 100, f"Priority score out of range: {a1['priorityScore']}"

    top_item = run1["actionPlan"][0]
    print(f"  Top Priority Item: '{top_item['title']}' (Score: {top_item['priorityScore']}/100)")
    print(f"  Score Breakdown: Clause ({top_item['priorityBreakdown']['clauseSeverity']}) + Neg ({top_item['priorityBreakdown']['negotiationImbalance']}) + Sim ({top_item['priorityBreakdown']['simulationExposure']}) + Deadline ({top_item['priorityBreakdown']['deadlineUrgency']}) + Comp ({top_item['priorityBreakdown']['complianceHazard']}) = {top_item['priorityBreakdown']['total']}")
    print("  [PASS] Test 2: Deterministic, explainable scoring naturally bounded to [0, 100].")

    # -------------------------------------------------------------------------
    # TEST 3: Evidence Traceability & Provenance
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Evidence Traceability & Provenance Verification...")
    for action in data_a["actionPlan"]:
        assert "documentEvidence" in action, "Missing document evidence"
        assert "provenance" in action, "Missing provenance trail"
        assert "priorityBreakdown" in action, "Missing priority breakdown"
        doc_ev = action["documentEvidence"]
        assert "clauseType" in doc_ev and "section" in doc_ev
        if action["category"] in ["CRITICAL", "IMPORTANT"] and action["documentEvidence"]["section"] != "Document Body (Omission)":
            assert len(doc_ev.get("excerpt", "")) > 0, "Missing contract excerpt in evidence"

    prov = top_item["provenance"]
    print(f"  Machine-Readable Provenance: {prov}")
    print("  [PASS] Test 3: Every prioritized action item links to underlying document evidence and ID provenance.")

    # -------------------------------------------------------------------------
    # TEST 4: Multi-Document Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Multi-Document Isolation Check...")
    res_b = requests.get(f"{BASE_URL}/api/documents/{doc_b_id}/intelligence", headers=headers_a)
    assert res_b.status_code == 200
    data_b = res_b.json()

    # Document B (Equipment lease) must not contain Document A's cloud consulting or termination provisions
    doc_b_clauses = [a["documentEvidence"]["clauseType"] for a in data_b["actionPlan"]]
    assert not any("CONSULTING" in c for c in doc_b_clauses), "Cross-document leakage detected in Document B!"
    assert data_b["documentId"] == doc_b_id
    print(f"  Document B Health Score: {data_b['healthScore']}/100 | Action Items: {len(data_b['actionPlan'])}")
    print("  [PASS] Test 4: Strict multi-document isolation verified — zero cross-contract leakage.")

    # -------------------------------------------------------------------------
    # TEST 5: Cross-User Authorization & Security
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Gateway Authentication & Cross-User Security...")
    # Unauthenticated request
    res_unauth = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/intelligence", headers={"Authorization": "Bearer bad.token"})
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"
    
    # Cross-user unauthorized access (User B requesting User A's document)
    res_cross = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/intelligence", headers=headers_b)
    assert res_cross.status_code in [403, 404], f"Expected 403 or 404, got {res_cross.status_code}"
    print("  [PASS] Test 5: Authentication (401) and cross-user authorization (403/404) enforced.")

    # -------------------------------------------------------------------------
    # TEST 6: Contradiction & Conflict Detection
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Contradiction & Contract Inconsistency Detection...")
    doc_conflict_id = upload_and_analyze(token_a, "Contract_Conflict_Vendor", CONTRACT_CONFLICT_TEXT)
    res_conflict = requests.get(f"{BASE_URL}/api/documents/{doc_conflict_id}/intelligence", headers=headers_a)
    assert res_conflict.status_code == 200
    data_conflict = res_conflict.json()

    conflicts = data_conflict.get("conflicts", [])
    assert len(conflicts) > 0, "Expected contract conflicts to be detected"
    
    conflict_types = [c["conflictType"] for c in conflicts]
    print(f"  Detected Inconsistencies ({len(conflicts)}): {conflict_types}")
    for c in conflicts:
        assert "disclaimer" in c, "Missing conflict disclaimer"
        assert "Potential inconsistency detected by automated analysis" in c["disclaimer"]
        assert len(c["evidence"]) >= 2, "Conflict should provide at least two conflicting evidence points"
        print(f"    - [{c['conflictType']}] {c['title']}: {c['recommendation']}")

    print("  [PASS] Test 6: Inconsistent provisions detected with side-by-side evidence and legal disclaimer.")

    # -------------------------------------------------------------------------
    # TEST 7: Fact vs AI Recommendation Separation
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Fact vs AI Recommendation Separation...")
    for action in data_conflict["actionPlan"]:
        ev = action["documentEvidence"]
        ai = action["intelligenceAssessment"]
        assert ev != ai, "Document evidence must strictly differ from intelligence assessment"
        assert "whyItMatters" in ai
        assert "recommendedAction" in ai
        assert "disclaimer" in ai
        if ev.get("excerpt"):
            assert ev["excerpt"] != ai["recommendedAction"], "Evidence cannot match generated advice"

    print("  [PASS] Test 7: Strict separation of immutable facts and generated advice verified.")

    # -------------------------------------------------------------------------
    # TEST 8: Priority Stability
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Priority Stability Under Unrelated Operations...")
    # Fetch Doc A intelligence again after analyzing conflicting Doc C
    res_a_again = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/intelligence", headers=headers_a)
    assert res_a_again.status_code == 200
    data_a_again = res_a_again.json()

    assert data_a_again["healthScore"] == data_a["healthScore"], "Health score shifted unexpectedly"
    assert len(data_a_again["actionPlan"]) == len(data_a["actionPlan"]), "Action items shifted unexpectedly"
    for a_orig, a_new in zip(data_a["actionPlan"], data_a_again["actionPlan"]):
        assert a_orig["priorityScore"] == a_new["priorityScore"], f"Score unstable for {a_orig['title']}"

    print("  [PASS] Test 8: Priority scoring is stable across subsequent operations.")

    # -------------------------------------------------------------------------
    # TEST 9: Frontend Contract Validation
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Frontend Contract Schema Validation...")
    required_top_keys = ["documentId", "documentTitle", "healthScore", "metrics", "executiveSummary", "conflicts", "actionPlan", "disclaimer"]
    for k in required_top_keys:
        assert k in data_a, f"Missing required top-level key: {k}"

    required_metric_keys = ["criticalCount", "importantCount", "monitoringCount", "healthyCount", "conflictsCount", "totalActionItems"]
    for mk in required_metric_keys:
        assert mk in data_a["metrics"], f"Missing metric key: {mk}"

    required_action_keys = ["actionId", "title", "category", "priorityScore", "priorityBreakdown", "provenance", "documentEvidence", "intelligenceAssessment"]
    for ak in required_action_keys:
        assert ak in data_a["actionPlan"][0], f"Missing action key: {ak}"

    print("  [PASS] Test 9: Backend API responses strictly conform to React Executive Intelligence Dashboard contract.")

    print("\n" + "=" * 75)
    print("ALL PHASE 6.4 EXECUTIVE CONTRACT INTELLIGENCE CHECKS PASSED (100%)")
    print("=" * 75)

if __name__ == "__main__":
    run_all_tests()
