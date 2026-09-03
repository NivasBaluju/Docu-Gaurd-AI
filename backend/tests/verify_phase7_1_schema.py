import os
import sys
import uuid
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
sys.stdout.reconfigure(line_buffering=True, encoding='utf-8')

try:
    from backend.services.database import get_db_connection
except ImportError:
    from services.database import get_db_connection

load_dotenv()

def verify_phase7_1_schema():
    print("=" * 70)
    print("=== STARTING PHASE 7.1: DATABASE SCHEMA & WORKFLOW FOUNDATION VERIFICATION ===")
    print("=" * 70)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # [TEST 1] Verify Tables Exist
        print("\n[TEST 1] Verifying Phase 7.1 Tables Exist in PostgreSQL...")
        target_tables = ["contract_actions", "contract_action_decisions", "contract_action_activity"]
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ANY(%s);
        """, (target_tables,))
        found_tables = [r['table_name'] for r in cur.fetchall()]
        print(f"  Found tables: {found_tables}")
        for t in target_tables:
            assert t in found_tables, f"Missing table: {t}"
        print("  [PASS] Test 1: All 3 Phase 7.1 tables exist.")

        # [TEST 2] Verify Indexes Exist
        print("\n[TEST 2] Verifying Performance Indexes...")
        target_indexes = [
            "idx_contract_actions_document_id",
            "idx_contract_actions_snapshot_id",
            "idx_contract_actions_status",
            "idx_contract_actions_owner_id",
            "idx_contract_actions_priority",
            "idx_contract_action_decisions_action_id",
            "idx_contract_action_activity_action_id"
        ]
        cur.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename IN ('contract_actions', 'contract_action_decisions', 'contract_action_activity');
        """)
        found_indexes = [r['indexname'] for r in cur.fetchall()]
        print(f"  Found indexes ({len(found_indexes)}): {found_indexes}")
        for idx in target_indexes:
            assert idx in found_indexes, f"Missing index: {idx}"
        print("  [PASS] Test 2: All 7 required performance indexes exist.")

        # [TEST 3] Verify Foreign Keys and Delete Behaviors
        print("\n[TEST 3] Verifying Foreign Key Delete Behaviors...")
        cur.execute("""
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name IN ('contract_actions', 'contract_action_decisions', 'contract_action_activity');
        """)
        fk_rules = cur.fetchall()
        fk_map = {(r['table_name'], r['column_name']): (r['foreign_table_name'], r['delete_rule']) for r in fk_rules}
        print("  Foreign Key Mappings:")
        for k, v in fk_map.items():
            print(f"    - {k[0]}.{k[1]} -> {v[0]} (ON DELETE {v[1]})")

        # Assert document_id -> CASCADE
        assert fk_map.get(('contract_actions', 'document_id')) == ('documents', 'CASCADE')
        # Assert intelligence_snapshot_id -> SET NULL
        assert fk_map.get(('contract_actions', 'intelligence_snapshot_id')) == ('contract_intelligence', 'SET NULL')
        # Assert owner_id -> SET NULL
        assert fk_map.get(('contract_actions', 'owner_id')) == ('users', 'SET NULL')
        # Assert action_id in decisions -> CASCADE
        assert fk_map.get(('contract_action_decisions', 'action_id')) == ('contract_actions', 'CASCADE')
        # Assert decided_by in decisions -> SET NULL
        assert fk_map.get(('contract_action_decisions', 'decided_by')) == ('users', 'SET NULL')
        # Assert action_id in activity -> CASCADE
        assert fk_map.get(('contract_action_activity', 'action_id')) == ('contract_actions', 'CASCADE')
        # Assert actor_id in activity -> SET NULL
        assert fk_map.get(('contract_action_activity', 'actor_id')) == ('users', 'SET NULL')

        print("  [PASS] Test 3: Foreign keys and ON DELETE CASCADE / SET NULL behaviors correctly configured.")

        # [TEST 4] Operational Integrity & Constraint Testing
        print("\n[TEST 4] Testing Operational Integrity, Check Constraints & Cascades...")
        test_owner_user_id = str(uuid.uuid4())
        test_assignee_user_id = str(uuid.uuid4())
        test_doc_id = str(uuid.uuid4())
        test_snap_id = str(uuid.uuid4())
        test_act_id = str(uuid.uuid4())
        test_dec_id = str(uuid.uuid4())
        test_audit_id = str(uuid.uuid4())

        # Setup test data
        cur.execute("""
            INSERT INTO users (id, name, email, password_hash, role)
            VALUES (%s, 'Doc Owner User', %s, 'hash', 'admin'),
                   (%s, 'Assignee User', %s, 'hash', 'user');
        """, (
            test_owner_user_id, f"test_owner_{uuid.uuid4().hex[:8]}@example.com",
            test_assignee_user_id, f"test_assignee_{uuid.uuid4().hex[:8]}@example.com"
        ))

        cur.execute("""
            INSERT INTO documents (id, user_id, filename, original_name, size, mime_type)
            VALUES (%s, %s, 'wf_doc.pdf', 'Workflow_Doc.pdf', 1000, 'application/pdf');
        """, (test_doc_id, test_owner_user_id))

        cur.execute("""
            INSERT INTO contract_intelligence (id, document_id, user_id, health_score, critical_count, important_count, monitoring_count, healthy_count)
            VALUES (%s, %s, %s, 75, 1, 1, 0, 2);
        """, (test_snap_id, test_doc_id, test_owner_user_id))

        # Insert valid contract_action assigned to test_assignee_user_id
        cur.execute("""
            INSERT INTO contract_actions (
                id, document_id, intelligence_snapshot_id, source_action_id,
                title, category, priority_score, status, decision, owner_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            test_act_id, test_doc_id, test_snap_id, "act-term-01",
            "Renegotiate Termination Provision", "CRITICAL", 80, "OPEN", None, test_assignee_user_id
        ))

        # Insert decision & activity with test_assignee_user_id
        cur.execute("""
            INSERT INTO contract_action_decisions (id, action_id, previous_status, new_status, decision, reason, decided_by)
            VALUES (%s, %s, 'OPEN', 'IN_REVIEW', 'NEGOTIATE', 'Material unilateral imbalance', %s);
        """, (test_dec_id, test_act_id, test_assignee_user_id))

        cur.execute("""
            INSERT INTO contract_action_activity (id, action_id, event_type, actor_id, metadata)
            VALUES (%s, %s, 'ACTION_CREATED', %s, '{"source": "phase_6_4"}'::jsonb);
        """, (test_audit_id, test_act_id, test_assignee_user_id))
        conn.commit()
        print("  Inserted test records across all 3 tables successfully.")

        # Test Check Constraint (priority_score > 100 should fail)
        invalid_score_thrown = False
        try:
            cur.execute("""
                INSERT INTO contract_actions (
                    id, document_id, intelligence_snapshot_id, source_action_id,
                    title, category, priority_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (str(uuid.uuid4()), test_doc_id, test_snap_id, "act-invalid-score", "Invalid", "CRITICAL", 101))
            conn.commit()
        except Exception:
            conn.rollback()
            invalid_score_thrown = True
        assert invalid_score_thrown, "CHECK constraint on priority_score (0..100) failed to reject invalid score."
        print("  CHECK constraint successfully rejected priority_score > 100.")

        # Test Unique Constraint on (document_id, intelligence_snapshot_id, source_action_id)
        duplicate_thrown = False
        try:
            cur.execute("""
                INSERT INTO contract_actions (
                    id, document_id, intelligence_snapshot_id, source_action_id,
                    title, category, priority_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (str(uuid.uuid4()), test_doc_id, test_snap_id, "act-term-01", "Duplicate Source Action", "CRITICAL", 80))
            conn.commit()
        except Exception:
            conn.rollback()
            duplicate_thrown = True
        assert duplicate_thrown, "UNIQUE constraint failed to reject duplicate (document_id, snapshot_id, source_action_id)."
        print("  UNIQUE constraint successfully prevented duplicate source action entry.")

        # Test Snapshot Deletion -> SET NULL on action.intelligence_snapshot_id
        cur.execute("DELETE FROM contract_intelligence WHERE id = %s;", (test_snap_id,))
        conn.commit()
        cur.execute("SELECT intelligence_snapshot_id FROM contract_actions WHERE id = %s;", (test_act_id,))
        row = cur.fetchone()
        assert row['intelligence_snapshot_id'] is None, "intelligence_snapshot_id was not set to NULL upon snapshot deletion."
        print("  Snapshot deletion verified: workflow action preserved with intelligence_snapshot_id = NULL.")

        # Test User Deletion -> SET NULL on action.owner_id, decisions.decided_by, and activity.actor_id
        cur.execute("DELETE FROM users WHERE id = %s;", (test_assignee_user_id,))
        conn.commit()
        cur.execute("SELECT owner_id FROM contract_actions WHERE id = %s;", (test_act_id,))
        assert cur.fetchone()['owner_id'] is None, "owner_id was not set to NULL upon user deletion."
        cur.execute("SELECT decided_by FROM contract_action_decisions WHERE id = %s;", (test_dec_id,))
        assert cur.fetchone()['decided_by'] is None, "decided_by was not set to NULL upon user deletion."
        cur.execute("SELECT actor_id FROM contract_action_activity WHERE id = %s;", (test_audit_id,))
        assert cur.fetchone()['actor_id'] is None, "actor_id was not set to NULL upon user deletion."
        print("  User deletion verified: workflow & audit records preserved with user references set to NULL.")

        # Test Document Deletion -> CASCADE deletes actions, decisions, and activity
        cur.execute("DELETE FROM documents WHERE id = %s;", (test_doc_id,))
        conn.commit()
        cur.execute("SELECT COUNT(*) AS cnt FROM contract_actions WHERE id = %s;", (test_act_id,))
        assert cur.fetchone()['cnt'] == 0, "contract_actions was not CASCADE deleted upon document deletion."
        cur.execute("SELECT COUNT(*) AS cnt FROM contract_action_decisions WHERE id = %s;", (test_dec_id,))
        assert cur.fetchone()['cnt'] == 0, "contract_action_decisions was not CASCADE deleted upon action deletion."
        cur.execute("SELECT COUNT(*) AS cnt FROM contract_action_activity WHERE id = %s;", (test_audit_id,))
        assert cur.fetchone()['cnt'] == 0, "contract_action_activity was not CASCADE deleted upon action deletion."
        print("  Document deletion verified: contract actions and associated history CASCADE deleted.")

        print("  [PASS] Test 4: Operational integrity, check constraints, and cascade delete verified.")

        # [TEST 5] Verify Phase 6.4 contract_intelligence Untouched & Intact
        print("\n[TEST 5] Verifying Phase 6.4 contract_intelligence Table Structure...")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'contract_intelligence'
            ORDER BY ordinal_position;
        """)
        ci_cols = [r['column_name'] for r in cur.fetchall()]
        expected_ci_cols = [
            "id", "document_id", "user_id", "health_score", "critical_count",
            "important_count", "monitoring_count", "healthy_count",
            "executive_summary", "conflicts_json", "actions_json", "metrics_json", "created_at"
        ]
        for col in expected_ci_cols:
            assert col in ci_cols, f"Missing column in contract_intelligence: {col}"
        print(f"  contract_intelligence columns verified ({len(ci_cols)}): {ci_cols}")
        print("  [PASS] Test 5: contract_intelligence remains completely intact and untouched.")

        print("\n" + "=" * 70)
        print("ALL PHASE 7.1 DATABASE SCHEMA & WORKFLOW FOUNDATION CHECKS PASSED (100%)")
        print("=" * 70)

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    verify_phase7_1_schema()
