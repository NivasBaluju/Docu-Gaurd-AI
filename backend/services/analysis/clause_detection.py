import re
from typing import List, Dict, Any

CLAUSE_PATTERNS = {
    "CONFIDENTIALITY": {
        "keywords": ["confidential information", "non-disclosure", "confidentiality", "proprietary information", "trade secret", "disclosing party", "receiving party"],
        "weight": 0.92
    },
    "TERMINATION": {
        "keywords": ["termination", "terminate", "notice of termination", "early termination", "cure period", "material breach", "upon expiration"],
        "weight": 0.94
    },
    "PAYMENT": {
        "keywords": ["payment", "invoice", "fees", "compensation", "net 30", "due date", "interest on late", "remittance", "purchase price", "rent"],
        "weight": 0.90
    },
    "LIABILITY": {
        "keywords": ["limitation of liability", "indirect, incidental", "consequential damages", "aggregate liability", "maximum liability", "no liability", "in no event shall"],
        "weight": 0.95
    },
    "INDEMNIFICATION": {
        "keywords": ["indemnify", "indemnification", "hold harmless", "defend and hold", "third-party claim", "indemnitee", "indemnitor"],
        "weight": 0.93
    },
    "GOVERNING_LAW": {
        "keywords": ["governing law", "jurisdiction", "construed in accordance with", "courts of", "laws of the state", "venue", "applicable law"],
        "weight": 0.91
    },
    "DISPUTE_RESOLUTION": {
        "keywords": ["arbitration", "mediation", "dispute resolution", "american arbitration association", "jams", "binding arbitration", "litigation"],
        "weight": 0.89
    },
    "INTELLECTUAL_PROPERTY": {
        "keywords": ["intellectual property", "ownership of work", "work made for hire", "copyright", "patent", "trademarks", "moral rights", "assignment of rights"],
        "weight": 0.92
    },
    "FORCE_MAJEURE": {
        "keywords": ["force majeure", "act of god", "natural disaster", "war, terrorism", "unforeseeable circumstances", "beyond reasonable control"],
        "weight": 0.95
    },
    "DATA_PRIVACY": {
        "keywords": ["data protection", "gdpr", "personal data", "personally identifiable information", "pii", "security breach", "data processing"],
        "weight": 0.91
    }
}

def detect_clauses_in_segments(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Evaluates each document segment against standard legal clause taxonomy.
    """
    detected = []

    for seg in segments:
        text = seg.get("text", "")
        title = seg.get("title", "")
        combined = f"{title}\n{text}".lower()

        # Score against all clause types
        best_type = None
        best_conf = 0.0
        best_matches = []

        for clause_type, cfg in CLAUSE_PATTERNS.items():
            matches = [kw for kw in cfg["keywords"] if kw in combined]
            if matches:
                # Score confidence based on keyword matches and title presence
                title_boost = 0.15 if any(kw in title.lower() for kw in cfg["keywords"]) else 0.0
                density_score = min(0.35, len(matches) * 0.12)
                confidence = min(0.98, cfg["weight"] * 0.55 + density_score + title_boost)

                if confidence > best_conf:
                    best_conf = confidence
                    best_type = clause_type
                    best_matches = matches

        if best_type and best_conf >= 0.50:
            snippet = text[:250].strip() + ("..." if len(text) > 250 else "")
            detected.append({
                "segmentId": seg.get("id"),
                "position": seg.get("position"),
                "title": title,
                "clauseType": best_type,
                "confidence": round(best_conf, 2),
                "detectionMethod": "RULE_BASED",
                "matchedKeywords": best_matches,
                "snippet": snippet
            })

    return detected
