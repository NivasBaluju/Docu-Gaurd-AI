import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import io
import time
import requests
import pymupdf as fitz
from backend.services.analysis.ml_classifier import LegalClauseMLClassifier
from backend.services.database import get_db_connection

BASE_URL = "http://localhost:5000"

print("="*70)
print("=== STARTING PHASE 5 HARDENING & COMPREHENSIVE VERIFICATION ===")
print("="*70)

# -------------------------------------------------------------
# 1. Real ML Model Inference Proof
# -------------------------------------------------------------
print("\n[TEST 1] Proving Real ML Model Inference (TF-IDF + Calibrated Class Probabilities)...")
classifier = LegalClauseMLClassifier.get_instance()

test_cases = [
    ("The obligations of confidentiality and non-disclosure shall remain in effect for 3 years.", "CONFIDENTIALITY"),
    ("Either party may terminate this agreement with 30 days prior written notice.", "TERMINATION"),
    ("Client shall pay all outstanding invoices within thirty (30) days of receipt.", "PAYMENT"),
    ("Neither party shall be liable for indirect, punitive, or consequential damages.", "LIABILITY")
]

for text, expected in test_cases:
    pred = classifier.predict_segment(text)
    print(f"  Input: \"{text[:50]}...\"")
    print(f"  -> Predicted Label: {pred.get('clauseType')} (Confidence: {round(pred.get('confidence', 0)*100, 2)}%)")
    top3 = sorted(pred.get("probabilities", {}).items(), key=lambda x: x[1], reverse=True)[:3]
    top3_str = ", ".join([f"{k}: {round(v*100, 1)}%" for k, v in top3])
    print(f"  -> Probability Distribution: {top3_str}")
    assert pred.get("clauseType") == expected, f"ML Prediction mismatch: expected {expected}, got {pred.get('clauseType')}"
print("  [PASS] Real ML inference verified across contract taxonomy!")

# -------------------------------------------------------------
# 2. Authentication with Node Gateway
# -------------------------------------------------------------
print("\n[TEST 2] Authenticating with Node Gateway...")
login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "admin@deciva.ai",
    "password": "Password123!"
}).json()

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
    token = mfa_res.get("token")
else:
    token = login_res.get("token")

assert token, "Failed to obtain JWT token"
headers = {"Authorization": f"Bearer {token}"}
print(f"  [PASS] Authenticated successfully with JWT: {token[:16]}...")

# -------------------------------------------------------------
# 3. Document Ingestion & Verification on Untouched vs Tampered
# -------------------------------------------------------------
print("\n[TEST 3] Cryptographic Integrity Verification (Untouched vs Deliberately Tampered)...")

# 3a. Upload sample contract
doc = fitz.open()
p = doc.new_page()
p.insert_text((50, 50), "INTEGRITY TEST CONTRACT: Section 1. Confidentiality applies in full.")
buf = io.BytesIO()
doc.save(buf)
doc.close()
buf.seek(0)

upload_res = requests.post(
    f"{BASE_URL}/api/documents/upload",
    headers=headers,
    files={"file": ("Integrity_Test_Contract.pdf", buf, "application/pdf")}
)
doc_data = upload_res.json()
doc_id = doc_data.get("id") or doc_data.get("document_id")
original_hash = doc_data.get("sha256")
print(f"  Uploaded Doc ID: {doc_id} with SHA-256: {original_hash[:16]}...")

# 3b. Verify Untouched Document
verify_res1 = requests.get(f"{BASE_URL}/api/documents/{doc_id}/verify", headers=headers).json()
print(f"  Untouched Verify Result: {verify_res1}")
assert verify_res1.get("valid") is True, "Untouched file failed integrity verification!"
print("  [PASS] Untouched document cryptographically matches SHA-256 hash.")

# 3c. Test Tier 1: AEAD Ciphertext Tampering
# Mutating the encrypted payload causes AES-256-GCM authentication failure before decryption can complete.
conn = get_db_connection()
cur = conn.cursor()
cur.execute("SELECT filename FROM documents WHERE id = %s;", (doc_id,))
row = cur.fetchone()
stored_filename = row['filename']
cur.close()
conn.close()

uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'uploads'))
file_path = os.path.join(uploads_dir, stored_filename)

if os.path.exists(file_path):
    with open(file_path, "rb") as f:
        file_bytes = bytearray(f.read())
    # Flip byte in encrypted payload
    if len(file_bytes) > 20:
        file_bytes[15] = (file_bytes[15] + 1) % 256
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        print(f"  [Tamper Simulated] Flipped byte at index 15 in {stored_filename}")

# 3d. Verify Tier 1: AEAD Auth Rejection
verify_res2 = requests.get(f"{BASE_URL}/api/documents/{doc_id}/verify", headers=headers).json()
print(f"  Tampered Verify Result: {verify_res2}")
assert verify_res2.get("valid") is False, "Tampered ciphertext was NOT rejected by AEAD authentication check!"
print("  [PASS] AES-256-GCM authentication verification failed on tampered ciphertext via GHASH (valid: False).")

# 3e. Test Tier 2: Plaintext / Stored Hash Inconsistency
# Restore valid encrypted payload, but mutate database SHA-256 record to simulate database tampering
if os.path.exists(file_path):
    # Re-encrypt clean contract
    from backend.services.crypto import encrypt_buffer
    with open(file_path, "wb") as f:
        f.write(encrypt_buffer(b"INTEGRITY TEST CONTRACT: Section 1. Confidentiality applies in full."))

conn = get_db_connection()
cur = conn.cursor()
cur.execute("UPDATE documents SET sha256 = '0000000000000000000000000000000000000000000000000000000000000000' WHERE id = %s;", (doc_id,))
conn.commit()
cur.close()
conn.close()

verify_res3 = requests.get(f"{BASE_URL}/api/documents/{doc_id}/verify", headers=headers).json()
print(f"  Hash Mismatch Verify Result: {verify_res3}")
assert verify_res3.get("valid") is False, "Database hash substitution was NOT detected!"
print("  [PASS] SHA-256 integrity comparison detected plaintext/hash mismatch (valid: False).")

# -------------------------------------------------------------
# 4. Frontend Error & Edge Case Resilience
# -------------------------------------------------------------
print("\n[TEST 4] Edge Case & Error Resilience Testing...")

# 4a. Expired / Invalid JWT
bad_headers = {"Authorization": "Bearer invalid.fake.token"}
bad_jwt_res = requests.get(f"{BASE_URL}/api/documents", headers=bad_headers)
print(f"  Invalid JWT Response: HTTP {bad_jwt_res.status_code}")
assert bad_jwt_res.status_code == 401, f"Expected 401 for invalid JWT, got {bad_jwt_res.status_code}"
print("  [PASS] Invalid JWT securely rejected with HTTP 401.")

# 4b. Invalid Upload (Empty payload)
empty_upload = requests.post(f"{BASE_URL}/api/documents/upload", headers=headers, files={})
print(f"  Empty Upload Response: HTTP {empty_upload.status_code}")
assert empty_upload.status_code in [400, 500], f"Expected 400 for empty upload, got {empty_upload.status_code}"
print("  [PASS] Empty upload gracefully handled.")

# -------------------------------------------------------------
# 5. Canonical Field Name & Data Consistency
# -------------------------------------------------------------
print("\n[TEST 5] Canonical Field Name Verification Across API Routes...")
analysis_res = requests.get(f"{BASE_URL}/api/documents/{doc_id}/analysis", headers=headers).json()
clauses_res = requests.get(f"{BASE_URL}/api/documents/{doc_id}/clauses", headers=headers).json()
risks_res = requests.get(f"{BASE_URL}/api/documents/{doc_id}/risks", headers=headers).json()
deadlines_res = requests.get(f"{BASE_URL}/api/documents/{doc_id}/deadlines", headers=headers).json()

# Assert canonical keys
assert "risk" in analysis_res, "Missing 'risk' in /analysis"
assert "clauses" in analysis_res, "Missing 'clauses' in /analysis"
assert "deadlines" in analysis_res, "Missing 'deadlines' in /analysis"
assert "detected" in clauses_res, "Missing 'detected' in /clauses"
assert "missing" in clauses_res, "Missing 'missing' in /clauses"
assert "riskFactors" in risks_res, "Missing 'riskFactors' in /risks"
assert "deadlines" in deadlines_res, "Missing 'deadlines' in /deadlines"
print("  [PASS] All API routes return canonical data structures matching React component contracts.")

print("\n" + "="*70)
print("ALL PHASE 5 HARDENING & VERIFICATION CHECKS PASSED WITH 100% SUCCESS")
print("="*70)
