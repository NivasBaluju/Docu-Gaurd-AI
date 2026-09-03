import os
from flask import Blueprint, request, jsonify

try:
    from backend.services.simulation_service import simulate_contract_scenario
    from backend.services.database import get_db_connection
except ImportError:
    from services.simulation_service import simulate_contract_scenario
    from services.database import get_db_connection

simulation_bp = Blueprint('simulation', __name__, url_prefix='/api/documents')

@simulation_bp.route('/<doc_id>/simulate', methods=['POST'])
def simulate_scenario(doc_id):
    """
    POST /api/documents/<doc_id>/simulate
    Executes Contract Risk Simulation & What-If Scenario Analysis.
    """
    data = request.get_json(silent=True) or {}
    scenario = (data.get("scenario") or "").strip()

    if not scenario:
        return jsonify({"error": "Scenario text is required for risk simulation"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM documents WHERE id = %s;", (doc_id,))
        doc = cur.fetchone()
        if not doc:
            return jsonify({"error": "Document not found"}), 404
    finally:
        cur.close()
        conn.close()

    result = simulate_contract_scenario(document_id=doc_id, scenario=scenario)
    if result.get("error"):
        return jsonify(result), result.get("status", 400)

    return jsonify(result), 200
