import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import uuid
from unittest import mock
from backend.services.database import get_db_connection
from backend.services.analysis.analyzer import analyze_document

print("=== VERIFYING ATOMIC TRANSACTION & ROLLBACK GUARANTEE ===\n")

# 1. Create a dummy document record in PostgreSQL
doc_id = str(uuid.uuid4())
conn = get_db_connection()
cur = conn.cursor()
cur.execute("""
    INSERT INTO documents (id, filename, original_name, analysis_status)
    VALUES (%s, 'atomic_test_doc.pdf', 'atomic_test_doc.pdf', 'NOT_STARTED');
""", (doc_id,))
conn.commit()
cur.close()
conn.close()

sample_text = """
1. CONFIDENTIALITY
Information shall be held in strict confidence.

2. TERMINATION
Either party may terminate with 30 days notice.

3. PAYMENT
Payment is due on October 15, 2026.
"""

# 2. Simulate a mid-persistence failure (e.g. simulate network drop or SQL failure while inserting deadlines)
print("Simulating database failure halfway through persistence (during deadline batch insert)...")

# We mock execute_values such that it succeeds on segments and clauses, but raises an OperationalError on deadlines
real_execute_values = __import__('psycopg2.extras').extras.execute_values
call_count = 0

def mocked_execute_values(cur, sql, argslist, **kwargs):
    global call_count
    call_count += 1
    if "document_deadlines" in sql:
        raise Exception("Neon PostgreSQL connection timeout simulated during deadline insert!")
    return real_execute_values(cur, sql, argslist, **kwargs)

with mock.patch('backend.services.analysis.analyzer.execute_values', side_effect=mocked_execute_values):
    result = analyze_document(doc_id=doc_id, document_text=sample_text, persist_to_db=True)

print(f"  Response Status: {result.get('analysisStatus')}")
print(f"  Response Error:  {result.get('error')}")

# 3. Check database to verify NOTHING was partially written (0 orphaned rows)
conn = get_db_connection()
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM document_segments WHERE document_id = %s;", (doc_id,))
s_count = cur.fetchone()['count']

cur.execute("SELECT COUNT(*) FROM document_clauses WHERE document_id = %s;", (doc_id,))
c_count = cur.fetchone()['count']

cur.execute("SELECT COUNT(*) FROM document_deadlines WHERE document_id = %s;", (doc_id,))
d_count = cur.fetchone()['count']

cur.execute("SELECT analysis_status, analysis_error, analysis_error_internal FROM documents WHERE id = %s;", (doc_id,))
doc_row = cur.fetchone()

# Cleanup
cur.execute("DELETE FROM documents WHERE id = %s;", (doc_id,))
conn.commit()
cur.close()
conn.close()

print("\n[Database State Verification After Simulated Mid-Write Failure]")
print(f"  Segments in DB:  {s_count} (Expected: 0)")
print(f"  Clauses in DB:   {c_count} (Expected: 0)")
print(f"  Deadlines in DB: {d_count} (Expected: 0)")
print(f"  Doc Status:      {doc_row['analysis_status']} (Expected: FAILED)")
print(f"  Doc Error:       {doc_row['analysis_error']}")
print(f"  Internal Error:  {doc_row['analysis_error_internal'][:70]}...")

is_atomic = (s_count == 0 and c_count == 0 and d_count == 0 and doc_row['analysis_status'] == 'FAILED')
print("\n" + "="*60)
if is_atomic:
    print("✅ VERIFIED: Strict Atomicity Confirmed. Zero Frankenstein records left on failure.")
else:
    print("❌ FAILED: Partial records were detected in database.")
print("="*60)
