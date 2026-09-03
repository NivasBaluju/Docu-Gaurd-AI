from flask import Blueprint, jsonify, request
try:
    from backend.services.intelligence_service import compute_contract_intelligence
except ImportError:
    from services.intelligence_service import compute_contract_intelligence

intelligence_bp = Blueprint('intelligence', __name__, url_prefix='/api/documents')

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
