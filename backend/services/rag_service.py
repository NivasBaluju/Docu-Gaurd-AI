import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List

try:
    from backend.services.retrieval_service import retrieve_relevant_segments
except ImportError:
    from services.retrieval_service import retrieve_relevant_segments

UNGROUNDED_RESPONSE = "I could not find sufficient information in this document to answer that question."

def format_grounded_prompt(question: str, sources: List[Dict[str, Any]]) -> str:
    """
    Constructs a strictly bounded RAG prompt with numbered source context blocks.
    """
    context_blocks = []
    for s in sources:
        section = s.get("section", f"Segment {s.get('segmentIndex', 0) + 1}")
        seg_idx = s.get("segmentIndex", 0)
        text = s.get("fullText", s.get("excerpt", ""))
        context_blocks.append(f"[Source {s.get('rank', 1)}]\nSection: {section}\nSegment Index: {seg_idx}\n{text}\n")

    context_str = "\n".join(context_blocks)

    return f"""You are DocuGuard AI, an institutional contract document assistant.
Answer ONLY using the provided document context.

Strict Rules:
1. Do not use external knowledge.
2. Do not invent facts, parties, dates, or legal liabilities.
3. Do not infer information not reasonably supported by the retrieved segments.
4. If the context is insufficient, respond strictly with: "{UNGROUNDED_RESPONSE}"
5. Do not claim something exists in the document unless it appears in the provided context.
6. Reference the relevant section or segment when answering.

DOCUMENT CONTEXT:
{context_str}

USER QUESTION:
{question}

GROUNDED ANSWER:"""

def call_gemini_api(prompt: str, api_key: str) -> str:
    """
    Calls Google Gemini REST API using standard urllib.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 600
        }
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=12) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        candidates = res_data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "").strip()
    return ""

def synthesize_extractive_answer(question: str, sources: List[Dict[str, Any]]) -> str:
    """
    Deterministic extractive legal synthesiser used when external LLM API is unavailable.
    Provides precise, grounded summaries directly from top-ranked segments.
    """
    if not sources:
        return UNGROUNDED_RESPONSE

    top_source = sources[0]
    section = top_source.get("section", "the document")
    full_text = top_source.get("fullText", top_source.get("excerpt", "")).strip()

    # Extract clean sentence summaries
    sentences = [s.strip() for s in full_text.split(".") if len(s.strip()) > 15]
    if sentences:
        core_summary = ". ".join(sentences[:3]) + "."
    else:
        core_summary = full_text[:250] + "..."

    return f"According to {section}, {core_summary}"

def answer_document_question(document_id: str, question: str) -> Dict[str, Any]:
    """
    Executes the complete Phase 6.1 Document RAG pipeline:
      1. Retrieval of existing PostgreSQL segments (isolated by document_id)
      2. Grounding Guard evaluation (similarity threshold check)
      3. Bounded LLM generation or deterministic grounded synthesis
      4. Returns structured answer + citations
    """
    q = (question or "").strip()
    if not q:
        return {
            "documentId": document_id,
            "answer": "Please provide a valid question.",
            "grounded": False,
            "confidence": 0.0,
            "sources": []
        }

    # Step 1: Retrieval
    sources, meta = retrieve_relevant_segments(document_id, q)

    # Step 2: Grounding Guard 🛡️
    if not meta.get("grounded") or not sources:
        return {
            "documentId": document_id,
            "answer": UNGROUNDED_RESPONSE,
            "grounded": False,
            "confidence": 0.0,
            "sources": []
        }

    # Prepare sanitized source citations (remove fullText for network compactness)
    clean_sources = [
        {
            "segmentId": s["segmentId"],
            "segmentIndex": s["segmentIndex"],
            "section": s["section"],
            "excerpt": s["excerpt"],
            "similarity": s["similarity"],
            "rank": s["rank"]
        }
        for s in sources
    ]

    # Step 3: Bounded Generation
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    answer_text = ""

    if gemini_key:
        try:
            prompt = format_grounded_prompt(q, sources)
            answer_text = call_gemini_api(prompt, gemini_key)
        except Exception as e:
            # Fallback to deterministic synthesis if API quota or network error occurs
            answer_text = synthesize_extractive_answer(q, sources)
    else:
        answer_text = synthesize_extractive_answer(q, sources)

    if not answer_text or answer_text.strip() == UNGROUNDED_RESPONSE:
        return {
            "documentId": document_id,
            "answer": UNGROUNDED_RESPONSE,
            "grounded": False,
            "confidence": 0.0,
            "sources": []
        }

    return {
        "documentId": document_id,
        "answer": answer_text,
        "grounded": True,
        "confidence": meta.get("topScore", 0.0),
        "sources": clean_sources
    }
