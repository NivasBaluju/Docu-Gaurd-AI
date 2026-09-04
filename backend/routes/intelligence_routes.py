from flask import Blueprint, jsonify, request

try:
    from backend.services.intelligence_service import compute_contract_intelligence
    from backend.services.contract_decision_intelligence import compute_contract_decision_intelligence
    from backend.services.contract_monitoring_engine import (
        detect_contract_changes,
        evaluate_lifecycle_events,
        calculate_attention_priority,
        calculate_risk_delta
    )
    from backend.services.database import get_db_connection
except ImportError:
    from services.intelligence_service import compute_contract_intelligence
    from services.contract_decision_intelligence import compute_contract_decision_intelligence
    from services.contract_monitoring_engine import (
        detect_contract_changes,
        evaluate_lifecycle_events,
        calculate_attention_priority,
        calculate_risk_delta
    )
    from services.database import get_db_connection

intelligence_bp = Blueprint('intelligence', __name__, url_prefix='/api/documents')

@intelligence_bp.route('/<doc_id>/decision-intelligence', methods=['GET'])
def get_document_decision_intelligence(doc_id):
    """
    GET /api/documents/<doc_id>/decision-intelligence
    Returns unified Phase 10 Decision Intelligence:
    - 9-Dimension Exposure Model
    - Primary Dependency Chain
    - Cross-Clause Conflicts with Dual Excerpts
    - What-If Multi-Scenario Matrix
    - 9-Question Executive Decision Brief
    - Health Score Breakdown with Primary Deterioration Driver
    - Two-Tier Forward Risk & Anomaly Detector
    """
    try:
        data = compute_contract_decision_intelligence(doc_id)
        if "error" in data:
            return jsonify(data), data.get("status", 404)
        return jsonify(data), 200
    except Exception as e:
        print(f"[Decision Intelligence Error] Failed to compute for doc {doc_id}: {e}")
        return jsonify({"error": str(e) or "Failed to compute decision intelligence"}), 500

@intelligence_bp.route('/<doc_id>/decision-intelligence/scenarios', methods=['POST'])
def evaluate_decision_scenarios(doc_id):
    """
    POST /api/documents/<doc_id>/decision-intelligence/scenarios
    Evaluates scenario comparisons against the document baseline.
    """
    try:
        data = compute_contract_decision_intelligence(doc_id)
        if "error" in data:
            return jsonify(data), data.get("status", 404)
        return jsonify({
            "documentId": doc_id,
            "exposureScore": data.get("exposureScore"),
            "whatIfScenarios": data.get("whatIfScenarios", []),
            "disclaimer": data.get("disclaimer")
        }), 200
    except Exception as e:
        print(f"[Decision Scenarios Error] Failed for doc {doc_id}: {e}")
        return jsonify({"error": str(e) or "Failed to evaluate decision scenarios"}), 500

@intelligence_bp.route('/<doc_id>/intelligence', methods=['GET'])
def get_document_intelligence(doc_id):
    """
    GET /api/documents/<doc_id>/intelligence
    Returns deterministically calculated executive contract intelligence,
    prioritized action center items, conflict detections, health score, and provenance.
    """
    try:
        data = compute_contract_intelligence(doc_id)
        if "error" in data:
            return jsonify(data), data.get("status", 404)
        return jsonify(data), 200
    except Exception as e:
        print(f"[Intelligence Error] Failed to compute intelligence for doc {doc_id}: {e}")
        return jsonify({"error": str(e) or "Failed to compute contract intelligence"}), 500

@intelligence_bp.route('/<doc_id>/intelligence/refresh', methods=['POST'])
def refresh_document_intelligence(doc_id):
    """
    POST /api/documents/<doc_id>/intelligence/refresh
    Forces re-evaluation of contract intelligence.
    """
    try:
        data = compute_contract_intelligence(doc_id)
        if "error" in data:
            return jsonify(data), data.get("status", 404)
        return jsonify(data), 200
    except Exception as e:
        print(f"[Intelligence Refresh Error] Failed to refresh intelligence for doc {doc_id}: {e}")
        return jsonify({"error": str(e) or "Failed to refresh contract intelligence"}), 500

@intelligence_bp.route('/<doc_id>/monitoring/evaluate', methods=['GET', 'POST'])
def evaluate_document_monitoring(doc_id):
    """
    Evaluates Phase 11 Continuous Monitoring for a contract:
    - Evidence-grounded lifecycle states & upcoming deadlines
    - Deterministic change detection against previous version/snapshot
    - Attention priority calculation and risk delta computation
    """
    try:
        from datetime import datetime, timezone
        body = request.get_json(silent=True) or {}

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, user_id, filename, extracted_text, version_group, version_number FROM documents WHERE id = %s;", (doc_id,))
        doc_row = cur.fetchone()
        if not doc_row:
            cur.close()
            conn.close()
            return jsonify({"error": f"Document {doc_id} not found"}), 404

        curr_text = body.get("current_text") or doc_row.get("extracted_text") or ""

        if doc_row.get("version_group"):
            cur.execute("""
                SELECT id, executive_summary, health_score, exposure_score, decision_intelligence_json, created_at 
                FROM contract_intelligence 
                WHERE document_id IN (
                    SELECT id FROM documents 
                    WHERE version_group = %s AND version_number <= %s
                )
                ORDER BY created_at DESC 
                LIMIT 2;
            """, (doc_row["version_group"], doc_row.get("version_number", 1)))
        else:
            cur.execute("""
                SELECT id, executive_summary, health_score, exposure_score, decision_intelligence_json, created_at 
                FROM contract_intelligence 
                WHERE document_id = %s 
                ORDER BY created_at DESC 
                LIMIT 2;
            """, (doc_id,))
        snapshots = cur.fetchall()

        prev_text = body.get("previous_text")
        if not prev_text and doc_row.get("version_group") and doc_row.get("version_number", 1) > 1:
            cur.execute("""
                SELECT extracted_text FROM documents 
                WHERE version_group = %s AND version_number < %s 
                ORDER BY version_number DESC LIMIT 1;
            """, (doc_row["version_group"], doc_row["version_number"]))
            prev_doc = cur.fetchone()
            if prev_doc:
                prev_text = prev_doc.get("extracted_text")

        cur.close()
        conn.close()

        curr_intel = None
        prev_intel = None
        if snapshots:
            curr_intel = snapshots[0]
            if len(snapshots) > 1:
                prev_intel = snapshots[1]

        lifecycle = evaluate_lifecycle_events(doc_id, curr_text)

        changes = detect_contract_changes(
            prev_text=prev_text,
            curr_text=curr_text,
            prev_intelligence=prev_intel,
            curr_intelligence=curr_intel,
            document_id=doc_id
        )

        for chg in changes:
            urg = "LOW"
            if lifecycle.get("state") == "NOTICE_WINDOW_OPEN":
                urg = "IMMEDIATE"
            elif lifecycle.get("state") == "RENEWAL_APPROACHING":
                urg = "APPROACHING"

            mag = "MAJOR" if abs(chg.get("risk_delta", 0)) >= 20 or chg.get("event_type") == "LIABILITY_CHANGE" else "MODERATE"
            p_calc = calculate_attention_priority(
                severity_level=chg.get("severity", "MEDIUM"),
                relevance_level="HIGH",
                urgency_level=urg,
                magnitude_level=mag
            )
            chg["priority_score"] = p_calc["priority_score"]
            chg["priority_rank"] = p_calc["priority_rank"]
            chg["priority_factors"] = p_calc["factors"]

        return jsonify({
            "documentId": doc_id,
            "filename": doc_row.get("filename"),
            "lifecycle": lifecycle,
            "detectedChanges": changes,
            "changeCount": len(changes),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    except Exception as e:
        print(f"[Monitoring Evaluation Error] Failed for doc {doc_id}: {e}")
        return jsonify({"error": str(e) or "Failed to evaluate contract monitoring"}), 500

