import os
from flask import Blueprint, request, jsonify

try:
    from backend.services.negotiation_service import (
        generate_clause_negotiation,
        get_document_negotiation_opportunities,
        VALID_NEGOTIATION_MODES
    )
    from backend.services.database import get_db_connection
except ImportError:
    from services.negotiation_service import (
        generate_clause_negotiation,
        get_document_negotiation_opportunities,
        VALID_NEGOTIATION_MODES
    )
    from services.database import get_db_connection

negotiation_bp = Blueprint('negotiation', __name__, url_prefix='/api/documents')

@negotiation_bp.route('/<doc_id>/negotiate', methods=['POST'])
def negotiate_clause(doc_id):
    """
    POST /api/documents/<doc_id>/negotiate
    Executes AI clause negotiation and redline generation.
    
    Payload: { "clauseId": "...", "clauseType": "...", "mode": "balanced" }
    """
    data = request.get_json(silent=True) or {}
    clause_id = data.get("clauseId")
    clause_type = data.get("clauseType")
    mode = data.get("mode", "balanced")

    if mode and mode not in VALID_NEGOTIATION_MODES:
        return jsonify({
            "error": f"Invalid negotiation mode '{mode}'. Must be one of: {', '.join(VALID_NEGOTIATION_MODES)}"
        }), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM documents WHERE id = %s;", (doc_id,))
        doc = cur.fetchone()
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        # Layer 2 Isolation: If clauseId provided, verify it belongs to this document
        if clause_id and not str(clause_id).startswith("seg-"):
            cur.execute("SELECT id FROM document_clauses WHERE id = %s AND document_id = %s;", (clause_id, doc_id))
            clause = cur.fetchone()
            if not clause:
                return jsonify({"error": "Clause not found in specified document"}), 404
    finally:
        cur.close()
        conn.close()

    result = generate_clause_negotiation(
        document_id=doc_id,
        clause_id=clause_id,
        clause_type=clause_type,
        mode=mode
    )

    if result.get("error"):
        return jsonify(result), result.get("status", 400)

    return jsonify(result), 200

@negotiation_bp.route('/<doc_id>/negotiation-suggestions', methods=['GET'])
def get_negotiation_suggestions(doc_id):
    """
    GET /api/documents/<doc_id>/negotiation-suggestions
    Returns all negotiation candidate clauses found in the document.
    """
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

    opportunities = get_document_negotiation_opportunities(doc_id)
    return jsonify({
        "documentId": doc_id,
        "opportunities": opportunities,
        "count": len(opportunities)
    }), 200
