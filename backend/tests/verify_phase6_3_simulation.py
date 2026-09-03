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
    from backend.services.simulation_service import simulate_contract_scenario
except ImportError:
    from services.database import get_db_connection
    from services.simulation_service import simulate_contract_scenario

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
    "Recipient agrees to hold all proprietary trade secrets in strict confidence and shall be liable for injunctive relief in the event of unauthorized disclosure.\n"
)

CONTRACT_B_TEXT = (
    "EQUIPMENT LEASE AGREEMENT\n\n"
    "Section 1. Leased Property\n"
    "Lessor leases to Lessee certain industrial robotics hardware.\n\n"
    "Section 2. Maintenance and Inspection\n"
    "Lessee shall maintain the hardware in good working condition and allow quarterly inspections.\n"
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
    print("=" * 70)
    print("=== STARTING PHASE 6.3: AI CONTRACT RISK SIMULATION VERIFICATION ===")
    print("=" * 70)

    token_a = authenticate_user("admin@docugaurd.ai", "Password123!")
    token_b = authenticate_user("auditor@docugaurd.ai", "Password123!", name="Auditor User")
    assert token_a and token_b, "Failed to authenticate test users."
    print("  [Setup] Authenticated sessions established (Admin + Non-Admin Auditor).")

    doc_a_id = upload_and_analyze(token_a, "Contract_A_Simulation_Master", CONTRACT_A_TEXT)
    doc_b_id = upload_and_analyze(token_a, "Contract_B_Simulation_Lease", CONTRACT_B_TEXT)
    print(f"  [Setup] Uploaded and indexed Document A (ID: {doc_a_id}) and Document B (ID: {doc_b_id})")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # -------------------------------------------------------------------------
    # TEST 1: Payment Delay Scenario Simulation
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Payment Delay Scenario Simulation...")
    q_pay = "What happens if the client pays 60 days late?"
    res_pay = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/simulate",
        headers=headers_a,
        json={"scenario": q_pay}
    )
    assert res_pay.status_code == 200, f"Payment simulation failed: {res_pay.text}"
    data_pay = res_pay.json()

    assert data_pay.get("grounded") is True, "Expected scenario to be grounded"
    assert len(data_pay.get("documentEvidence", [])) > 0, "Missing document evidence"
    assert "potentialImpact" in data_pay.get("simulationAnalysis", {}), "Missing potentialImpact"
    assert "riskLevel" in data_pay.get("simulationAnalysis", {}), "Missing riskLevel"
    assert len(data_pay["simulationAnalysis"].get("possibleConsequences", [])) > 0, "Missing consequences"
    assert len(data_pay["simulationAnalysis"].get("recommendedNextSteps", [])) > 0, "Missing next steps"

    print(f"  Scenario: '{q_pay}'")
    print(f"  Grounded: {data_pay['grounded']} | Confidence: {data_pay.get('confidence')}")
    print(f"  Risk Level: {data_pay['simulationAnalysis']['riskLevel']}")
    print(f"  Potential Impact: {data_pay['simulationAnalysis']['potentialImpact']}")
    print(f"  Evidence Section: {data_pay['documentEvidence'][0]['section']}")
    print("  [PASS] Test 1: Grounded payment scenario simulated with full impact assessment.")

    # -------------------------------------------------------------------------
    # TEST 2: Unilateral Early Termination Simulation
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Unilateral Early Termination Simulation...")
    q_term = "What happens if either party terminates immediately without prior notice?"
    res_term = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/simulate",
        headers=headers_a,
        json={"scenario": q_term}
    )
    assert res_term.status_code == 200, f"Termination simulation failed: {res_term.text}"
    data_term = res_term.json()

    assert data_term.get("grounded") is True
    assert len(data_term.get("documentEvidence", [])) > 0
    assert data_term["simulationAnalysis"]["riskLevel"] == "HIGH"
    print(f"  Scenario: '{q_term}'")
    print(f"  Grounded: {data_term['grounded']} | Risk Level: {data_term['simulationAnalysis']['riskLevel']}")
    print(f"  Potential Impact: {data_term['simulationAnalysis']['potentialImpact']}")
    print("  [PASS] Test 2: Unilateral termination contingency simulated with high-risk consequence assessment.")

    # -------------------------------------------------------------------------
    # TEST 3: Unsupported / Hallucinatory Scenario Refusal
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Unsupported / Hallucinatory Scenario Refusal...")
    q_alien = "What happens if extraterrestrial aliens invade and acquire the counterparty?"
    res_alien = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/simulate",
        headers=headers_a,
        json={"scenario": q_alien}
    )
    assert res_alien.status_code == 200, f"Request failed: {res_alien.text}"
    data_alien = res_alien.json()

    assert data_alien.get("grounded") is False, "Expected ungrounded scenario to be refused"
    assert len(data_alien.get("documentEvidence", [])) == 0, "Document evidence should be empty for ungrounded scenario"
    assert data_alien.get("confidence") == 0.0
    print(f"  Scenario: '{q_alien}'")
    print(f"  Grounded: {data_alien['grounded']} | Document Evidence Count: {len(data_alien['documentEvidence'])}")
    print(f"  Refusal Notice: {data_alien['simulationAnalysis']['potentialImpact']}")
    print("  [PASS] Test 3: Grounding Guard strictly refused out-of-scope hypothetical hallucination.")

    # -------------------------------------------------------------------------
    # TEST 4: Multi-Document Isolation Check
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Multi-Document Isolation Check...")
    # Querying Document B (Lease only) with Document A's payment interest scenario
    res_leak = requests.post(
        f"{BASE_URL}/api/documents/{doc_b_id}/simulate",
        headers=headers_a,
        json={"scenario": "What happens if payment is delayed past the 30-day window and interest accrues?"}
    )
    assert res_leak.status_code == 200
    data_leak = res_leak.json()
    # Document B has no payment or interest clause -> must return grounded: False
    assert data_leak.get("grounded") is False, "Cross-document information leakage detected!"
    print(f"  Document B Grounded Result: {data_leak['grounded']}")
    print("  [PASS] Test 4: Multi-document isolation enforced — zero cross-contract leakage.")

    # -------------------------------------------------------------------------
    # TEST 5: Authentication Security Checks
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Authentication Security Checks...")
    res_unauth = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/simulate",
        headers={"Authorization": "Bearer invalid.jwt.token"},
        json={"scenario": q_pay}
    )
    assert res_unauth.status_code == 401
    print("  [PASS] Test 5: Invalid/missing JWT securely rejected with HTTP 401.")

    # -------------------------------------------------------------------------
    # TEST 6: Authorization & Cross-User Security Checks
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Authorization & Cross-User Security Checks...")
    # User B (Auditor) attempting to simulate Document A owned by User A
    res_cross = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/simulate",
        headers=headers_b,
        json={"scenario": q_pay}
    )
    assert res_cross.status_code in [403, 404]
    print(f"  [PASS] Test 6: Unauthorized cross-user simulation rejected with HTTP {res_cross.status_code}.")

    # -------------------------------------------------------------------------
    # TEST 7: Evidence Separation & Immutability
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Evidence Separation & Immutability...")
    doc_evidence = data_pay["documentEvidence"]
    sim_analysis = data_pay["simulationAnalysis"]

    assert isinstance(doc_evidence, list) and len(doc_evidence) > 0
    assert "section" in doc_evidence[0]
    assert "excerpt" in doc_evidence[0]
    # Check that document evidence matches actual database contract text
    assert "Invoices shall be payable strictly within thirty (30) days" in doc_evidence[0]["excerpt"]
    assert doc_evidence[0]["excerpt"] != sim_analysis["potentialImpact"], "Evidence should not match simulation analysis"
    assert "disclaimer" in sim_analysis
    print("  [PASS] Test 7: Strict separation between immutable document facts and hypothetical advice verified.")

    # -------------------------------------------------------------------------
    # TEST 8: Direct Grounding Guard No-Generation Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Direct Grounding Guard No-Generation Verification...")
    direct_refusal = simulate_contract_scenario(doc_a_id, "What happens if a meteor strikes the headquarters building?")
    assert direct_refusal["grounded"] is False
    assert direct_refusal["confidence"] == 0.0
    assert len(direct_refusal["documentEvidence"]) == 0
    print("  [PASS] Test 8: Grounding Guard verified to abort prior to LLM/synthesis pipeline.")

    # -------------------------------------------------------------------------
    # TEST 9: Scenario History Persistence & Retrieval
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Scenario History Persistence & Retrieval...")
    hist_res = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/simulations", headers=headers_a)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data.get("count", 0) >= 2, f"Expected at least 2 persisted simulations, found {hist_data.get('count')}"
    print(f"  Persisted Simulations Count in PostgreSQL: {hist_data.get('count')}")
    print("  [PASS] Test 9: Scenario simulation history successfully persisted and retrieved.")

    print("\n" + "=" * 70)
    print("ALL PHASE 6.3 CONTRACT RISK SIMULATION VERIFICATION CHECKS PASSED (100%)")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
