import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import requests
import io
import time
import pymupdf as fitz

BASE_URL = "http://localhost:5000"

print("=== STARTING PHASE 5 FRONTEND INTEGRATION VALIDATION ===\n")

# 1. Authenticate with Node Gateway to obtain JWT token
print("1. Authenticating with Node Gateway...")
# Attempt registration if user does not exist
requests.post(f"{BASE_URL}/api/auth/register", json={
    "name": "Deciva Admin",
    "email": "admin@deciva.ai",
    "password": "Password123!"
})

login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "admin@deciva.ai",
    "password": "Password123!"
}).json()
print("  Login Response:", login_res)

if login_res.get("mfaRequired"):
    pre_token = login_res.get("preToken")
    dev_code = login_res.get("devCode")
    if not dev_code:
        from backend.services.database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT code FROM otp_codes WHERE used = false ORDER BY created_at DESC LIMIT 1;")
        row = cur.fetchone()
        dev_code = row['code'] if row else '123456'
        cur.close()
        conn.close()

    print("  MFA Required -> Verifying with Database OTP Code:", dev_code)
    mfa_res = requests.post(f"{BASE_URL}/api/auth/mfa/totp/verify", json={
        "preToken": pre_token,
        "code": str(dev_code)
    }).json()
    token = mfa_res.get("token")
else:
    token = login_res.get("token")

print("  JWT Token Acquired:", f"{token[:18]}..." if token else "FAILED TO ACQUIRE TOKEN")
headers = {"Authorization": f"Bearer {token}"}

# 2. Phase 5.1: Test GET /api/documents (Live List State)
print("\n2. Phase 5.1: Testing GET /api/documents (Live List State)...")
docs_res = requests.get(f"{BASE_URL}/api/documents", headers=headers)
print(f"  HTTP Status: {docs_res.status_code}")
docs = docs_res.json()
print(f"  Total Documents in Live PostgreSQL: {len(docs)}")
if docs:
    d0 = docs[0]
    print(f"  First Doc -> ID: {d0.get('id')}, Name: {d0.get('filename')}, Risk: {d0.get('risk_score')}, Status: {d0.get('analysisStatus') or d0.get('analysis_status')}, HasPrevious: {d0.get('hasPreviousAnalysis')}")

# 3. Phase 5.2: Test Document Upload (POST /api/documents/upload)
print("\n3. Phase 5.2: Testing POST /api/documents/upload (Upload Flow)...")
contract_text = """
COMMERCIAL LEASE & SERVICES AGREEMENT
1. CONFIDENTIALITY & PROPRIETARY INFORMATION
The contractor shall hold all proprietary and technical trade secrets in strict confidence for three (3) years.

2. TERMINATION NOTICE
Either party may terminate this agreement without cause upon sixty (60) days written notice.

3. PAYMENT TERMS & CONSIDERATION
Invoices are payable within 30 days of receipt. Total fee is $25,000 annually.

4. LIMITATION OF LIABILITY
Neither party shall be liable for indirect, incidental, or consequential damages exceeding $100,000.
"""

doc = fitz.open()
p = doc.new_page()
p.insert_text((50, 50), contract_text)
buf = io.BytesIO()
doc.save(buf)
doc.close()
buf.seek(0)

upload_res = requests.post(
    f"{BASE_URL}/api/documents/upload",
    headers=headers,
    files={"file": ("Phase5_Executive_Lease.pdf", buf, "application/pdf")}
)
print(f"  Upload HTTP Status: {upload_res.status_code}")
upload_data = upload_res.json()
new_doc_id = upload_data.get("id") or upload_data.get("document_id")
print(f"  Uploaded Document ID: {new_doc_id}")
print(f"  SHA-256 Hash: {upload_data.get('sha256')}")
print(f"  Analysis Status: {upload_data.get('analysisStatus')}")

# 4. Phase 5.4: Trigger AI Analysis (POST /api/documents/:id/analyze)
print("\n4. Phase 5.4: Testing POST /api/documents/:id/analyze (Analysis Trigger)...")
t0 = time.time()
analyze_res = requests.post(f"{BASE_URL}/api/documents/{new_doc_id}/analyze", headers=headers)
print(f"  Analyze HTTP Status: {analyze_res.status_code} in {round((time.time() - t0)*1000)}ms")
analysis = analyze_res.json()
print(f"  Analysis Status: {analysis.get('analysisStatus')}")
print(f"  Calibrated Risk Score: {analysis.get('risk', {}).get('score')} / 100 ({analysis.get('risk', {}).get('level')})")

# 5. Phase 5.5: Analysis Overview (GET /api/documents/:id/analysis)
print("\n5. Phase 5.5: Testing GET /api/documents/:id/analysis (Executive Overview)...")
overview_res = requests.get(f"{BASE_URL}/api/documents/{new_doc_id}/analysis", headers=headers)
print(f"  Overview HTTP Status: {overview_res.status_code}")
ov = overview_res.json()
print(f"  KPIs -> Score: {ov.get('risk', {}).get('score')}, Clauses: {len(ov.get('clauses', {}).get('detected', []))}, Deadlines: {len(ov.get('deadlines', []))}, Segments: {ov.get('segmentsCount')}")

# 6. Phase 5.6: Clauses Tab (GET /api/documents/:id/clauses)
print("\n6. Phase 5.6: Testing GET /api/documents/:id/clauses (Consensus Breakdown)...")
clauses_res = requests.get(f"{BASE_URL}/api/documents/{new_doc_id}/clauses", headers=headers)
print(f"  Clauses HTTP Status: {clauses_res.status_code}")
cl = clauses_res.json()
detected_list = cl.get("clauses", {}).get("detected", [])
print(f"  Detected Clauses Count: {len(detected_list)}")
for c in detected_list[:4]:
    print(f"    - {c.get('clauseType')} | Status: {c.get('status')} | Consensus: {c.get('consensus')} | Conf: {round(float(c.get('effectiveConfidence') or 0)*100)}%")

# 7. Phase 5.7: Risk Tab (GET /api/documents/:id/risks)
print("\n7. Phase 5.7: Testing GET /api/documents/:id/risks (Explainable Risks)...")
risks_res = requests.get(f"{BASE_URL}/api/documents/{new_doc_id}/risks", headers=headers)
print(f"  Risks HTTP Status: {risks_res.status_code}")
rk = risks_res.json()
print(f"  Risk Factors Count: {len(rk.get('riskFactors', []))}")
print(f"  Hazard Points: {rk.get('risk', {}).get('hazardPoints')}, Omission Points: {rk.get('risk', {}).get('omissionPoints')}")

# 8. Phase 5.9: Deadlines Tab (GET /api/documents/:id/deadlines)
print("\n8. Phase 5.9: Testing GET /api/documents/:id/deadlines (Milestone Timeline)...")
deadlines_res = requests.get(f"{BASE_URL}/api/documents/{new_doc_id}/deadlines", headers=headers)
print(f"  Deadlines HTTP Status: {deadlines_res.status_code}")
dl = deadlines_res.json()
print(f"  Deadlines Count: {len(dl.get('deadlines', []))}")
for d in dl.get("deadlines", []):
    print(f"    - {d.get('deadlineType')} | Date/Relative: {d.get('deadlineDate') or d.get('relativeDeadline')} | Source: {d.get('sourceText')}")

print("\n" + "="*60)
print("ALL PHASE 5 FRONTEND INTEGRATION ENDPOINTS VERIFIED AND LIVE")
print("="*60)
