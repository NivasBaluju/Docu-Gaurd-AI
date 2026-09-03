import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import uuid
from unittest import mock
from backend.services.database import get_db_connection
from backend.services.analysis.analyzer import analyze_document

print("=== VERIFYING RE-ANALYSIS ROLLBACK PRESERVATION ===\n")

# 1. Create document record and perform initial SUCCESSFUL analysis
doc_id = str(uuid.uuid4())
conn = get_db_connection()
cur = conn.cursor()
cur.execute("""
    INSERT INTO documents (id, filename, original_name, analysis_status)
    VALUES (%s, 'existing_contract.pdf', 'existing_contract.pdf', 'NOT_STARTED');
""", (doc_id,))
conn.commit()
cur.close()
conn.close()

initial_text = """
1. CONFIDENTIALITY
The receiving party will maintain strict confidentiality of proprietary data.

2. TERMINATION
This agreement may be terminated by either party with thirty days written notice.

3. PAYMENT
All payments are due upon receipt of invoice.
"""

print("Step 1: Running initial successful analysis...")
res1 = analyze_document(doc_id=doc_id, document_text=initial_text, persist_to_db=True)
print(f"  Initial Analysis Status: {res1.get('analysisStatus')}")

conn = get_db_connection()
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM document_clauses WHERE document_id = %s;", (doc_id,))
c_initial = cur.fetchone()['count']
cur.execute("SELECT COUNT(*) FROM document_deadlines WHERE document_id = %s;", (doc_id,))
d_initial = cur.fetchone()['count']
cur.close()
conn.close()
print(f"  Committed Prior State -> Clauses: {c_initial}, Deadlines: {d_initial}")

# 2. Trigger RE-ANALYSIS with simulated failure halfway through database write
print("\nStep 2: Triggering re-analysis with simulated mid-write failure...")
real_execute_values = __import__('psycopg2.extras').extras.execute_values

def mocked_execute_values(cur, sql, argslist, **kwargs):
    if "document_risk_factors" in sql:
        raise Exception("Neon database dropped socket simulated during risk factors batch insert!")
    return real_execute_values(cur, sql, argslist, **kwargs)

with mock.patch('backend.services.analysis.analyzer.execute_values', side_effect=mocked_execute_values):
    res2 = analyze_document(doc_id=doc_id, document_text=initial_text + "\n4. JURISDICTION\nGoverned by laws of California.", persist_to_db=True)

print(f"  Re-analysis Attempt Status: {res2.get('analysisStatus')}")
print(f"  Safe User Error: {res2.get('error')}")

# 3. Verify that ROLLBACK restored the prior committed 3 clauses & 1 deadline
conn = get_db_connection()
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM document_clauses WHERE document_id = %s;", (doc_id,))
c_after = cur.fetchone()['count']
cur.execute("SELECT COUNT(*) FROM document_deadlines WHERE document_id = %s;", (doc_id,))
d_after = cur.fetchone()['count']
cur.execute("SELECT analysis_status, analysis_error FROM documents WHERE id = %s;", (doc_id,))
doc_row = cur.fetchone()

# Cleanup
cur.execute("DELETE FROM documents WHERE id = %s;", (doc_id,))
conn.commit()
cur.close()
conn.close()

print("\n[Database State Inspection After Re-Analysis Rollback]")
print(f"  Clauses in DB:   {c_after} (Expected preserved: {c_initial})")
print(f"  Deadlines in DB: {d_after} (Expected preserved: {d_initial})")
print(f"  Doc Status:      {doc_row['analysis_status']} (Recorded via fresh connection: FAILED)")

is_preserved = (c_after == c_initial and d_after == d_initial and doc_row['analysis_status'] == 'FAILED')
print("\n" + "="*60)
if is_preserved:
    print("SUCCESS: Prior committed analysis preserved by rollback; fresh connection recorded FAILED state.")
else:
    print("FAILURE: State mismatch.")
print("="*60)
