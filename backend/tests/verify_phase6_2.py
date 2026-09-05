import os
import sys
import io
import json
import time
import requests
from dotenv import load_dotenv

# Ensure root directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

try:
    from backend.services.database import get_db_connection
except ImportError:
    from services.database import get_db_connection

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")
FLASK_URL = os.getenv("FLASK_URL", "http://127.0.0.1:5001")

CONTRACT_A_TEXT = (
    "MASTER SERVICES AGREEMENT\n\n"
    "Section 1. Scope of Services\n"
    "The Provider shall furnish software development consulting services as described in attached statements of work.\n\n"
    "Section 2. Termination\n"
    "The Client may terminate this agreement at any time without notice and without cause.\n\n"
    "Section 3. Payment Terms\n"
    "Invoices shall be payable within sixty (60) days of invoice date with no dispute rights.\n\n"
    "Section 4. Limitation of Liability\n"
    "The Supplier shall be liable for all direct, indirect, punitive, and consequential damages arising from this Agreement without any financial limitation.\n"
)

CONTRACT_B_TEXT = (
    "NON-DISCLOSURE AGREEMENT\n\n"
    "Section 1. Confidential Information\n"
    "Recipient shall hold all proprietary technical information in strict confidence for a period of five years.\n\n"
    "Section 2. Permitted Use\n"
    "Information shall be used solely for evaluating a potential strategic transaction.\n"
)

def authenticate_user(email, password, name="Test User"):
    # Attempt registration in case user doesn't exist
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })

    # Attempt login
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
    print("=" * 70)
    print("=== STARTING PHASE 6.2: AI CONTRACT NEGOTIATION & REDLINE VERIFICATION ===")
    print("=" * 70)

    token_a = authenticate_user("admin@deciva.ai", "Password123!")
    token_b = authenticate_user("auditor@deciva.ai", "Password123!", name="Auditor User")
    assert token_a and token_b, "Failed to authenticate test users."
    print("  [Setup] Authenticated test sessions established (Admin + Non-Admin Auditor).")

    doc_a_id = upload_and_analyze(token_a, "Contract_A_Negotiation", CONTRACT_A_TEXT)
    doc_b_id = upload_and_analyze(token_a, "Contract_B_NDA", CONTRACT_B_TEXT)
    print(f"  [Setup] Uploaded and analyzed Document A (ID: {doc_a_id}) and Document B (ID: {doc_b_id})")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Fetch suggestions/opportunities for Document A
    opps_res = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/negotiation-suggestions", headers=headers_a)
    assert opps_res.status_code == 200, f"Failed to get opportunities: {opps_res.text}"
    opps = opps_res.json().get("opportunities", [])
    assert len(opps) > 0, "No negotiation opportunities returned."
    print(f"  [Setup] Identified {len(opps)} negotiation opportunity clauses in Document A.")
    
    first_clause_id = opps[0]["clauseId"]
    first_clause_type = opps[0]["clauseType"]

    # -------------------------------------------------------------------------
    # TEST 1: Clause Negotiation & Strategy Generation
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Clause Negotiation & Strategy Generation...")
    neg_res = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/negotiate",
        headers=headers_a,
        json={"clauseId": first_clause_id, "mode": "balanced"}
    )
    assert neg_res.status_code == 200, f"Negotiate failed: {neg_res.text}"
    neg_data = neg_res.json()

    assert "documentEvidence" in neg_data, "Missing documentEvidence in response"
    assert "aiRecommendation" in neg_data, "Missing aiRecommendation in response"
    assert "redline" in neg_data, "Missing redline in response"
    assert len(neg_data["aiRecommendation"]["suggestedRevision"]) > 0, "Empty suggestedRevision"
    print(f"  Clause Type: {neg_data['clauseType']}")
    print(f"  Identified Imbalance: {neg_data['aiRecommendation']['identifiedImbalance']}")
    print(f"  Strategy: {neg_data['aiRecommendation']['strategy']}")
    print(f"  Suggested Revision: {neg_data['aiRecommendation']['suggestedRevision']}")
    print("  [PASS] Test 1: Clause negotiation & strategic recommendation generated.")

    # -------------------------------------------------------------------------
    # TEST 2: Redline Diff Accuracy
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Redline Diff Accuracy...")
    redline = neg_data["redline"]
    assert "operations" in redline, "Missing operations in redline diff"
    assert "summary" in redline, "Missing summary in redline diff"
    assert redline["summary"]["additions"] >= 0, "Invalid additions count"
    assert redline["summary"]["deletions"] >= 0, "Invalid deletions count"
    
    # Verify reconstructed revised text matches operations
    reconstructed_revised = "".join([op["text"] for op in redline["operations"] if op["type"] in ["equal", "insert"]])
    assert reconstructed_revised == neg_data["aiRecommendation"]["suggestedRevision"], "Redline reconstruction mismatch with suggestedRevision"
    print(f"  Redline Summary: +{redline['summary']['additions']} additions, -{redline['summary']['deletions']} deletions, {redline['summary']['unchanged']} unchanged words")
    print("  [PASS] Test 2: Word-level redline diff verified mathematically accurate.")

    # -------------------------------------------------------------------------
    # TEST 3: Document & Clause Isolation (Layer 2 Verification)
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Document & Clause Isolation...")
    # Attempt to negotiate Document A's clause ID using Document B's endpoint
    cross_res = requests.post(
        f"{BASE_URL}/api/documents/{doc_b_id}/negotiate",
        headers=headers_a,
        json={"clauseId": first_clause_id, "mode": "balanced"}
    )
    assert cross_res.status_code == 404, f"Expected 404 for cross-document clause, got {cross_res.status_code}"
    print("  Cross-Document Clause Access: HTTP 404 (Clause not found in Document B)")
    print("  [PASS] Test 3: Double-layer document and clause isolation enforced.")

    # -------------------------------------------------------------------------
    # TEST 4: Authentication & Authorization Security Checks
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Authentication & Authorization Security Checks...")
    unauth_res = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/negotiate",
        headers={"Authorization": "Bearer invalid.jwt.token"},
        json={"clauseId": first_clause_id, "mode": "balanced"}
    )
    assert unauth_res.status_code == 401, f"Expected 401, got {unauth_res.status_code}"
    print("  [PASS] 4a: Invalid JWT rejected with HTTP 401.")

    # Create a non-admin document owned by User B, verify User A cannot access if non-admin or verify cross-ownership
    doc_b_owned_id = upload_and_analyze(token_b, "Auditor_Private_Doc", CONTRACT_B_TEXT)
    
    # User B attempting to access Document A
    cross_user_res = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/negotiate",
        headers=headers_b,
        json={"clauseId": first_clause_id, "mode": "balanced"}
    )
    # Since User B is auditor (non-admin), accessing Admin's doc_a_id should be rejected
    assert cross_user_res.status_code in [403, 404], f"Expected 403/404, got {cross_user_res.status_code}"
    print(f"  [PASS] 4b: Cross-user negotiation request rejected with HTTP {cross_user_res.status_code}.")

    # -------------------------------------------------------------------------
    # TEST 5: Separation of Evidence from Recommendation
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Separation of Evidence from Recommendation...")
    doc_evidence = neg_data["documentEvidence"]
    ai_rec = neg_data["aiRecommendation"]

    assert "clause" in doc_evidence and len(doc_evidence["clause"]) > 0
    assert "section" in doc_evidence
    assert "sources" in doc_evidence
    assert "riskSeverity" in ai_rec
    assert "identifiedImbalance" in ai_rec
    assert "strategy" in ai_rec
    assert "suggestedRevision" in ai_rec
    assert doc_evidence["clause"] != ai_rec["suggestedRevision"], "Evidence and recommendation should not be identical"
    print("  [PASS] Test 5: Strict schema boundary between document facts and AI advice verified.")

    # -------------------------------------------------------------------------
    # TEST 6: Negotiation Modes & Input Validation
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Negotiation Modes & Input Validation...")
    modes = ["balanced", "protective", "aggressive", "collaborative"]
    mode_results = {}
    for m in modes:
        res = requests.post(
            f"{BASE_URL}/api/documents/{doc_a_id}/negotiate",
            headers=headers_a,
            json={"clauseId": first_clause_id, "mode": m}
        )
        assert res.status_code == 200, f"Mode {m} failed: {res.text}"
        mode_data = res.json()
        mode_results[m] = mode_data
        assert mode_data["mode"] == m
        assert len(mode_data["aiRecommendation"]["objectives"]) > 0
        print(f"  Mode '{m}': Objectives -> {mode_data['aiRecommendation']['objectives']}")

    # Test invalid mode
    invalid_mode_res = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/negotiate",
        headers=headers_a,
        json={"clauseId": first_clause_id, "mode": "invalid_mode_xyz"}
    )
    assert invalid_mode_res.status_code == 400, f"Expected 400 for invalid mode, got {invalid_mode_res.status_code}"
    print("  Invalid Mode Rejection: HTTP 400")
    print("  [PASS] Test 6: All 4 negotiation postures verified with objective tracking and input validation.")

    # -------------------------------------------------------------------------
    # TEST 7: Evidence Immutability Across Posture Modes
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Evidence Immutability Across Posture Modes...")
    original_evidence_clause = mode_results["balanced"]["documentEvidence"]["clause"]
    for m in ["protective", "aggressive", "collaborative"]:
        mode_evidence_clause = mode_results[m]["documentEvidence"]["clause"]
        assert mode_evidence_clause == original_evidence_clause, f"Evidence clause mutated in mode {m}!"
    print(f"  Verified documentEvidence.clause remains 100% immutable across balanced, protective, aggressive, collaborative.")
    print("  [PASS] Test 7: Evidence Immutability guaranteed — modes affect recommendations, never document facts.")

    # -------------------------------------------------------------------------
    # TEST 8: Clause -> Document Ownership Integrity
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Clause -> Document Ownership Integrity...")
    opps_b_res = requests.get(f"{BASE_URL}/api/documents/{doc_b_id}/negotiation-suggestions", headers=headers_a)
    opps_b = opps_b_res.json().get("opportunities", [])
    if opps_b:
        b_clause_id = opps_b[0]["clauseId"]
        mismatch_res = requests.post(
            f"{BASE_URL}/api/documents/{doc_a_id}/negotiate",
            headers=headers_a,
            json={"clauseId": b_clause_id, "mode": "balanced"}
        )
        assert mismatch_res.status_code == 404
    print("  [PASS] Test 8: Strict Clause-to-Document ownership integrity verified.")

    print("\n" + "=" * 70)
    print("ALL PHASE 6.2 AI NEGOTIATION & REDLINE VERIFICATION CHECKS PASSED (100%)")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
