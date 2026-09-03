import os
from flask import Blueprint, request, jsonify

try:
    from backend.services.rag_service import answer_document_question
    from backend.services.database import get_db_connection
except ImportError:
    from services.rag_service import answer_document_question
    from services.database import get_db_connection

chat_bp = Blueprint('chat', __name__, url_prefix='/api/documents')

@chat_bp.route('/<doc_id>/chat', methods=['POST'])
def chat_with_document(doc_id):
    """
    POST /api/documents/<doc_id>/chat
    Executes Document AI Q&A via RAG pipeline.
    
    Payload: { "question": "..." }
    Response: {
      "documentId": "uuid",
      "answer": "...",
      "grounded": true/false,
      "confidence": 0.82,
      "sources": [ ... ]
    }
    """
    data = request.get_json(silent=True) or {}
    question = data.get("question")

    if not question or not str(question).strip():
        return jsonify({"error": "Question is required and cannot be empty"}), 400

    # Verify document exists in database
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

    # Execute grounded RAG pipeline
    result = answer_document_question(doc_id, str(question).strip())
    return jsonify(result), 200
