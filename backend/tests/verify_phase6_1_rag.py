import os
import sys
import uuid
import requests
from dotenv import load_dotenv

# Ensure root directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

try:
    from backend.services.database import get_db_connection
    from backend.services.retrieval_service import retrieve_relevant_segments
    from backend.services.rag_service import answer_document_question
except ImportError:
    from services.database import get_db_connection
    from services.retrieval_service import retrieve_relevant_segments
    from services.rag_service import answer_document_question

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")
FLASK_URL = os.getenv("FLASK_URL", "http://127.0.0.1:5001")

def run_tests():
    print("=" * 70)
    print("=== STARTING PHASE 6.1: DOCUMENT AI CHAT WITH RAG VERIFICATION ===")
    print("=" * 70)

    # Step 1: Login & token acquisition
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@docugaurd.ai", "password": "Password123!"}).json()
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
        jwt_token = mfa_res.get("token")
    else:
        jwt_token = login_res.get("token")

    headers = {"Authorization": f"Bearer {jwt_token}"}
    print("  [Setup] Authenticated admin session established.")

    # -------------------------------------------------------------
    # Upload Contract A: Master Service Agreement (Contains Termination)
    # -------------------------------------------------------------
    contract_a_text = (
        "MASTER SERVICES AGREEMENT\n\n"
        "Section 1. Confidentiality\n"
        "Each party agrees to maintain the confidentiality of all proprietary information disclosed hereunder.\n\n"
        "Section 2. Termination\n"
        "Either party may terminate this Agreement early by providing thirty (30) days prior written notice to the other party.\n\n"
        "Section 3. Governing Law\n"
        "This Agreement shall be governed and construed in accordance with the laws of the State of Delaware.\n"
    )

    upload_a = requests.post(
        f"{BASE_URL}/api/documents/upload",
        headers=headers,
        files={"file": ("master_agreement.txt", contract_a_text.encode("utf-8"), "text/plain")}
    )
    doc_a_id = upload_a.json().get("id") or upload_a.json().get("document_id")
    print(f"  [Setup] Uploaded Document A (ID: {doc_a_id})")

    # -------------------------------------------------------------
    # TEST 1: Grounded Answer & Verifiable Source Citations
    # -------------------------------------------------------------
    print("\n[TEST 1] Grounded Answer & Verifiable Citations...")
    q1 = "What is the notice period required to terminate the agreement early?"
    chat_res1 = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/chat", headers=headers, json={"question": q1})
    assert chat_res1.status_code == 200, f"Chat request failed with {chat_res1.status_code}: {chat_res1.text}"
    data1 = chat_res1.json()

    print(f"  Question: '{q1}'")
    print(f"  Answer: {data1.get('answer')}")
    print(f"  Grounded: {data1.get('grounded')} | Confidence: {data1.get('confidence')}")
    print(f"  Sources Count: {len(data1.get('sources', []))}")

    assert data1.get("grounded") is True, "Expected grounded: True for termination question"
    assert len(data1.get("sources", [])) > 0, "Expected non-empty sources list"
    top_src = data1["sources"][0]
    assert "Section 2" in top_src["section"] or "Section" in top_src["section"] or "Segment" in top_src["section"], "Source section missing"
    assert "thirty (30) days" in top_src["excerpt"] or "terminate" in top_src["excerpt"], "Excerpt mismatch"
    assert top_src["similarity"] >= 0.15, "Similarity score below minimum threshold"
    print("  [PASS] Test 1: Grounded answer with source citations verified successfully.")

    # -------------------------------------------------------------
    # TEST 2: Unsupported Question & Grounding Guard Refusal
    # -------------------------------------------------------------
    print("\n[TEST 2] Unsupported Question & Grounding Guard Refusal...")
    q2 = "What is the CEO's personal mobile phone number and home address?"
    chat_res2 = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/chat", headers=headers, json={"question": q2})
    assert chat_res2.status_code == 200
    data2 = chat_res2.json()

    print(f"  Question: '{q2}'")
    print(f"  Answer: {data2.get('answer')}")
    print(f"  Grounded: {data2.get('grounded')} | Sources: {data2.get('sources')}")

    assert data2.get("grounded") is False, "Expected grounded: False for out-of-domain question"
    assert len(data2.get("sources", [])) == 0, "Expected 0 sources for out-of-domain question"
    assert "could not find sufficient information" in data2.get("answer", "").lower(), "Refusal message not returned"
    print("  [PASS] Test 2: Grounding Guard strictly refused ungrounded hallucination.")

    # -------------------------------------------------------------
    # TEST 3: Multi-Document Tenant & Document Isolation
    # -------------------------------------------------------------
    print("\n[TEST 3] Multi-Document Isolation Check...")
    contract_b_text = (
        "CONSULTING INVOICE TERMS\n\n"
        "Section 1. Payment Schedule\n"
        "Client shall remit payment within 15 days of invoice date.\n\n"
        "Section 2. Late Fees\n"
        "Late payments shall accrue interest at 1.5% per month.\n"
    )

    upload_b = requests.post(
        f"{BASE_URL}/api/documents/upload",
        headers=headers,
        files={"file": ("payment_terms.txt", contract_b_text.encode("utf-8"), "text/plain")}
    )
    doc_b_id = upload_b.json().get("id") or upload_b.json().get("document_id")
    print(f"  [Setup] Uploaded Document B (ID: {doc_b_id}) - contains only Payment/Late Fees")

    # Ask Document B about Termination terms that ONLY exist in Document A
    q3 = "What are the rules regarding contract termination notice?"
    chat_res3 = requests.post(f"{BASE_URL}/api/documents/{doc_b_id}/chat", headers=headers, json={"question": q3})
    data3 = chat_res3.json()

    print(f"  Querying Document B with Document A's topic: '{q3}'")
    print(f"  Grounded in Doc B: {data3.get('grounded')}")
    assert data3.get("grounded") is False, "Document A segments leaked into Document B retrieval!"
    assert len(data3.get("sources", [])) == 0, "Cross-document leakage detected in sources!"
    print("  [PASS] Test 3: Document isolation verified — zero cross-document leakage.")

    # -------------------------------------------------------------
    # TEST 4: Authentication & Authorization Security Checks
    # -------------------------------------------------------------
    print("\n[TEST 4] Authentication & Authorization Security Checks...")
    
    # 4a. Invalid JWT
    bad_res = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/chat", headers={"Authorization": "Bearer invalid.jwt.token"}, json={"question": q1})
    assert bad_res.status_code == 401, f"Expected 401 for bad JWT, got {bad_res.status_code}"
    print("  [PASS] 4a: Invalid JWT rejected with HTTP 401.")

    # 4b. Cross-User Access Attempt (User 2 trying to chat with User 1's doc)
    user2_email = f"user2_{uuid.uuid4().hex[:6]}@docuguard.ai"
    reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": "User 2",
        "email": user2_email,
        "password": "Password123!"
    })
    assert reg_res.status_code == 200, "User 2 registration failed"

    u2_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": user2_email, "password": "Password123!"}).json()
    u2_pre = u2_login.get("preToken")
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT code FROM otp_codes WHERE used = false ORDER BY created_at DESC LIMIT 1;")
    row = cur.fetchone()
    u2_otp = row["code"] if row else "123456"
    cur.close()
    conn.close()

    u2_mfa = requests.post(f"{BASE_URL}/api/auth/mfa/totp/verify", json={"preToken": u2_pre, "code": str(u2_otp)}).json()
    u2_token = u2_mfa.get("token")
    assert u2_token, f"User 2 token issuance failed: {u2_mfa}"

    cross_res = requests.post(
        f"{BASE_URL}/api/documents/{doc_a_id}/chat",
        headers={"Authorization": f"Bearer {u2_token}"},
        json={"question": q1}
    )
    assert cross_res.status_code in [403, 404], f"Expected 403 or 404 for cross-user document access, got {cross_res.status_code} ({cross_res.text})"
    print(f"  [PASS] 4b: Unauthorized cross-user chat access rejected with HTTP {cross_res.status_code}.")

    # -------------------------------------------------------------
    # TEST 5: Input Validation & Chat History Persistence
    # -------------------------------------------------------------
    print("\n[TEST 5] Input Validation & Chat History Persistence...")
    
    # 5a. Empty Question
    empty_res = requests.post(f"{BASE_URL}/api/documents/{doc_a_id}/chat", headers=headers, json={"question": "   "})
    assert empty_res.status_code == 400, f"Expected 400 for empty question, got {empty_res.status_code}"
    print("  [PASS] 5a: Empty question rejected with HTTP 400.")

    # 5b. Verify Chat History Persistence in PostgreSQL
    history_res = requests.get(f"{BASE_URL}/api/documents/{doc_a_id}/chat", headers=headers)
    assert history_res.status_code == 200
    messages = history_res.json().get("messages", [])
    print(f"  Retrieved {len(messages)} persisted messages from PostgreSQL.")
    assert len(messages) >= 2, "Chat history messages were not persisted in PostgreSQL!"
    user_msgs = [m for m in messages if m["role"] == "USER"]
    assistant_msgs = [m for m in messages if m["role"] == "ASSISTANT"]
    assert len(user_msgs) > 0 and len(assistant_msgs) > 0, "Missing user or assistant messages in history"
    print("  [PASS] 5b: Conversation history persistence verified.")

    print("\n" + "=" * 70)
    print("ALL PHASE 6.1 RAG CHAT VERIFICATION CHECKS PASSED WITH 100% SUCCESS")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
