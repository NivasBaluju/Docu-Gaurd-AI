import os
import re
import json
import urllib.request
from typing import Dict, Any, List

try:
    from backend.services.retrieval_service import retrieve_relevant_segments
    from backend.services.database import get_db_connection
except ImportError:
    from services.retrieval_service import retrieve_relevant_segments
    from services.database import get_db_connection

DISCLAIMER_TEXT = "This is a hypothetical scenario analysis based on provisions identified in the document. It does not constitute formal legal advice."

# Stop words to filter out when checking topical overlap
BASIC_STOP_WORDS = {
    "what", "happens", "if", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "could", "should", "would", "may", "might", "must", "can", "this", "that", "these", "those",
    "party", "contract", "agreement", "case", "situation", "scenario"
}

def extract_scenario_keywords(scenario: str) -> List[str]:
    """Extracts non-trivial keywords from the user scenario."""
    tokens = re.findall(r'\b[a-zA-Z]{3,}\b', (scenario or "").lower())
    return [t for t in tokens if t not in BASIC_STOP_WORDS]

def synthesize_hypothetical_impact(scenario: str, evidence_text: str, risk_context: List[str]) -> Dict[str, Any]:
    """
    Deterministic, context-bounded scenario impact synthesizer used when LLM API is unavailable.
    Produces structured scenario consequences grounded in the retrieved contract excerpt.
    """
    sc_lower = (scenario or "").lower()
    ev_lower = (evidence_text or "").lower()

    if "pay" in sc_lower or "invoice" in sc_lower or "late" in sc_lower or "fee" in sc_lower:
        # Payment scenario
        days_match = re.search(r'(\d+)\s*days?', sc_lower)
        days_str = days_match.group(1) if days_match else "delayed"
        
        # Check if contract specifies payment timeline
        contract_days_match = re.search(r'(\d+)\s*(?:\([^\)]+\))?\s*days?', ev_lower)
        contract_timeline = contract_days_match.group(0) if contract_days_match else "the contractual due date"

        return {
            "potentialImpact": f"If payment is delayed beyond {contract_timeline}, the paying party enters default status under the identified payment terms, which may trigger late interest or contractual remedies.",
            "riskLevel": "HIGH" if (days_match and int(days_match.group(1)) > 30) else "MEDIUM",
            "affectedAreas": ["Payment Terms", "Commercial Remedies", "Default Provisions"],
            "possibleConsequences": [
                f"The paying party is in technical breach once payment exceeds {contract_timeline}.",
                "The performing party may withhold further deliverables or suspend performance subject to notice requirements.",
                "Accrual of statutory or contractually specified late interest fees."
            ],
            "recommendedNextSteps": [
                "Issue a formal written notice of overdue invoice referencing the specific payment clause.",
                "Review whether a cure period or dispute notification procedure exists before initiating collection.",
                "Propose a structured payment cure schedule to preserve the commercial relationship."
            ],
            "disclaimer": DISCLAIMER_TEXT
        }

    elif "terminat" in sc_lower or "cancel" in sc_lower or "exit" in sc_lower:
        # Termination scenario
        has_notice = "without notice" in sc_lower or "immediately" in sc_lower
        return {
            "potentialImpact": "An immediate or unnotified termination creates significant exposure to breach of contract claims unless expressly authorized under the termination or default provisions.",
            "riskLevel": "HIGH",
            "affectedAreas": ["Termination Provisions", "Notice Requirements", "Liability for Wrongful Termination"],
            "possibleConsequences": [
                "Attempting immediate termination without required contractual notice constitutes wrongful repudiation.",
                "The counterparty may seek damages for lost profits or unamortized service costs.",
                "Termination triggers post-termination survival clauses including confidentiality and return of materials."
            ],
            "recommendedNextSteps": [
                "Audit the contract for mandatory written notice periods and cure windows before issuing termination notices.",
                "Document all material defaults with timestamped evidentiary records.",
                "Consult legal counsel to deliver formal notice adhering strictly to the contract's notice delivery clause."
            ],
            "disclaimer": DISCLAIMER_TEXT
        }

    elif "confidential" in sc_lower or "disclos" in sc_lower or "leak" in sc_lower or "trade secret" in sc_lower:
        # Confidentiality breach scenario
        return {
            "potentialImpact": "Unauthorized disclosure of confidential materials violates core non-disclosure obligations, potentially entitling the non-breaching party to immediate injunctive relief and uncapped damages.",
            "riskLevel": "HIGH",
            "affectedAreas": ["Confidentiality", "Injunctive Relief", "Indemnification Obligations"],
            "possibleConsequences": [
                "The non-breaching party is likely entitled to seek emergency restraining orders or preliminary injunctions.",
                "Liability caps frequently exclude breaches of confidentiality, creating unbounded financial exposure.",
                "Possible mandatory indemnity for third-party claims arising from the disclosure."
            ],
            "recommendedNextSteps": [
                "Immediately enact containment procedures to prevent further dissemination of disclosed materials.",
                "Provide prompt written notice to the disclosing party describing the incident and mitigation actions.",
                "Conduct an internal forensic audit to document how the disclosure occurred."
            ],
            "disclaimer": DISCLAIMER_TEXT
        }

    elif "liab" in sc_lower or "damage" in sc_lower or "indemn" in sc_lower or "sue" in sc_lower:
        # Liability scenario
        return {
            "potentialImpact": "Damages arising under this scenario will be governed by the contract's liability limitations and mutual exclusion of consequential damages.",
            "riskLevel": "HIGH" if "unlimited" in ev_lower else "MEDIUM",
            "affectedAreas": ["Limitation of Liability", "Consequential Damages Carve-outs", "Indemnification"],
            "possibleConsequences": [
                "Recovery may be strictly capped at fees paid over the preceding 6 to 12 months if a cap is in place.",
                "Claims for indirect or lost profits will be excluded if standard mutual waivers apply.",
                "Indemnification claims may require the indemnifying party to assume defense costs."
            ],
            "recommendedNextSteps": [
                "Determine whether the claim falls within any express exceptions to the liability cap.",
                "Verify whether timely tender of defense is required under indemnification provisions.",
                "Notify commercial liability insurance carriers promptly upon assertion of claims."
            ],
            "disclaimer": DISCLAIMER_TEXT
        }

    # General scenario fallback
    return {
        "potentialImpact": "The hypothetical scenario triggers the rights and obligations specified in the retrieved contract provisions.",
        "riskLevel": "MEDIUM",
        "affectedAreas": ["Contractual Obligations", "Operational Compliance"],
        "possibleConsequences": [
            "The scenario requires strict compliance with contractual timelines and performance metrics.",
            "Failure to follow procedural requirements may waive contractual defense rights."
        ],
        "recommendedNextSteps": [
            "Review the full section in the executed contract.",
            "Seek written clarification from the counterparty regarding operational expectations."
        ],
        "disclaimer": DISCLAIMER_TEXT
    }

def simulate_contract_scenario(document_id: str, scenario: str) -> Dict[str, Any]:
    """
    Executes Phase 6.3 Contract Risk Simulation & What-If Analysis:
      1. Isolated Retrieval: Retrieves relevant segments strictly for document_id
      2. Grounding Guard 🛡️: Refuses without LLM invocation if evidence is insufficient
      3. Gathers associated risk context
      4. Synthesizes structured hypothetical impact assessment
    """
    scenario_clean = (scenario or "").strip()
    if not scenario_clean:
        return {
            "error": "Scenario text is required for risk simulation.",
            "status": 400
        }

    # Step 1: Retrieval via Phase 6.1 TF-IDF Cosine Similarity Engine
    sources, meta = retrieve_relevant_segments(
        document_id=document_id,
        query=scenario_clean,
        top_k=3,
        min_similarity=0.15
    )
    
    # Step 2: Strengthened Grounding Guard 🛡️
    # Validate both similarity score and keyword / subject overlap
    scenario_keywords = extract_scenario_keywords(scenario_clean)
    has_topical_overlap = False

    if sources and meta.get("grounded"):
        combined_evidence_text = " ".join([s.get("excerpt", "") for s in sources]).lower()
        # Check if at least one core scenario keyword is present in the evidence
        if scenario_keywords:
            overlap_count = sum(1 for kw in scenario_keywords if kw in combined_evidence_text)
            if overlap_count > 0:
                has_topical_overlap = True
        else:
            has_topical_overlap = True

    if not sources or not meta.get("grounded") or not has_topical_overlap:
        # Grounding Guard Triggered: NO LLM CALL IS MADE
        return {
            "documentId": document_id,
            "scenario": scenario_clean,
            "grounded": False,
            "documentEvidence": [],
            "simulationAnalysis": {
                "potentialImpact": "I could not find sufficient contract provisions or evidence in this document to simulate this scenario.",
                "riskLevel": "UNKNOWN",
                "affectedAreas": [],
                "possibleConsequences": [],
                "recommendedNextSteps": [],
                "disclaimer": DISCLAIMER_TEXT
            },
            "confidence": 0.0,
            "sources": []
        }

    # Step 3: Format Document Evidence
    document_evidence = []
    for s in sources:
        document_evidence.append({
            "section": s.get("section", "Contract Provision"),
            "segmentIndex": s.get("segmentIndex", 0),
            "excerpt": s.get("excerpt", "")
        })

    # Gather associated risk factors from PostgreSQL
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT risk_type, reason, severity
            FROM document_risk_factors
            WHERE document_id = %s;
        """, (document_id,))
        risk_rows = cur.fetchall()
        risk_context = [f"{r['risk_type']} ({r['severity']}): {r['reason']}" for r in risk_rows]
    finally:
        cur.close()
        conn.close()

    # Step 4: Synthesize Simulation Impact (Gemini API or Contextual Synthesizer)
    combined_excerpts = "\n\n".join([f"[{s.get('section')}]: {s.get('excerpt')}" for s in sources])
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    sim_analysis = None

    if gemini_key:
        try:
            prompt = f"""You are Deciva, an expert contract risk simulation engine.
Analyze the following hypothetical scenario strictly based on the provided contract evidence.

HYPOTHETICAL SCENARIO:
"{scenario_clean}"

RELEVANT CONTRACT PROVISIONS (DOCUMENT EVIDENCE):
{combined_excerpts}

ASSOCIATED DOCUMENT RISKS:
{"; ".join(risk_context) if risk_context else "None"}

Perform a scenario risk simulation. Respond STRICTLY in JSON format with this schema:
{{
  "potentialImpact": "Concise summary of the legal, operational, and financial impact if this scenario occurs",
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "affectedAreas": ["Area 1", "Area 2"],
  "possibleConsequences": ["Consequence 1", "Consequence 2"],
  "recommendedNextSteps": ["Step 1", "Step 2"]
}}
"""
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            req = urllib.request.Request(
                url,
                data=json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2}}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                cand_text = res_data.get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "")
                clean_json = re.search(r'\{.*\}', cand_text, re.DOTALL)
                if clean_json:
                    parsed = json.loads(clean_json.group(0))
                    sim_analysis = {
                        "potentialImpact": parsed.get("potentialImpact", "Scenario analysis generated."),
                        "riskLevel": parsed.get("riskLevel", "MEDIUM"),
                        "affectedAreas": parsed.get("affectedAreas", ["Contract Terms"]),
                        "possibleConsequences": parsed.get("possibleConsequences", []),
                        "recommendedNextSteps": parsed.get("recommendedNextSteps", []),
                        "disclaimer": DISCLAIMER_TEXT
                    }
        except Exception:
            sim_analysis = None

    if not sim_analysis:
        sim_analysis = synthesize_hypothetical_impact(scenario_clean, combined_excerpts, risk_context)

    return {
        "documentId": document_id,
        "scenario": scenario_clean,
        "grounded": True,
        "documentEvidence": document_evidence,
        "simulationAnalysis": sim_analysis,
        "confidence": meta.get("topScore", 0.85),
        "sources": sources
    }
