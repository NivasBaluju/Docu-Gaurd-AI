from typing import List, Dict, Any

STANDARD_CONTRACT_CHECKLIST = [
    {"type": "CONFIDENTIALITY", "name": "Confidentiality & Non-Disclosure", "severity": "HIGH", "baseRiskPoints": 10},
    {"type": "TERMINATION", "name": "Termination & Notice Rights", "severity": "HIGH", "baseRiskPoints": 12},
    {"type": "PAYMENT", "name": "Payment & Consideration Terms", "severity": "MEDIUM", "baseRiskPoints": 8},
    {"type": "LIABILITY", "name": "Limitation of Liability", "severity": "HIGH", "baseRiskPoints": 15},
    {"type": "INDEMNIFICATION", "name": "Indemnification & Hold Harmless", "severity": "HIGH", "baseRiskPoints": 12},
    {"type": "GOVERNING_LAW", "name": "Governing Law & Jurisdiction", "severity": "MEDIUM", "baseRiskPoints": 8},
    {"type": "DISPUTE_RESOLUTION", "name": "Dispute Resolution & Arbitration", "severity": "MEDIUM", "baseRiskPoints": 6},
    {"type": "DATA_PRIVACY", "name": "Data Privacy & Protection", "severity": "LOW", "baseRiskPoints": 4}
]

def detect_missing_clauses(detected_clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates detected clauses against institutional legal checklist using a 4-tier confidence model:
      - DETECTED (Confidence >= 0.80)
      - LIKELY_PRESENT (0.50 <= Confidence < 0.80)
      - UNCERTAIN (0.30 <= Confidence < 0.50) -> Flag for review
      - NOT_DETECTED (Absent from rule/ML detection)
    """
    # Map each detected clause type to its highest confidence
    type_conf_map = {}
    for c in detected_clauses:
        ctype = c["clauseType"]
        conf = float(c.get("confidence", 0.0))
        if ctype not in type_conf_map or conf > type_conf_map[ctype]:
            type_conf_map[ctype] = conf

    audit_items = []
    missing = []
    missing_risk_points = 0

    for item in STANDARD_CONTRACT_CHECKLIST:
        ctype = item["type"]
        conf = type_conf_map.get(ctype, 0.0)

        if conf >= 0.80:
            status = "DETECTED"
            risk_points = 0
            reason = f"{item['name']} is confirmed present in document."
        elif conf >= 0.50:
            status = "LIKELY_PRESENT"
            risk_points = 0
            reason = f"{item['name']} is likely present."
        elif conf >= 0.30:
            status = "UNCERTAIN"
            risk_points = 3
            reason = f"{item['name']} may be present with atypical wording (flagged for review)."
            missing.append({
                "type": ctype,
                "name": item["name"],
                "status": status,
                "severity": "LOW",
                "riskPoints": risk_points,
                "reason": reason
            })
            missing_risk_points += risk_points
        else:
            status = "NOT_DETECTED"
            risk_points = item["baseRiskPoints"]
            reason = f"{item['name']} not detected in current clauses."
            missing.append({
                "type": ctype,
                "name": item["name"],
                "status": status,
                "severity": item["severity"],
                "riskPoints": risk_points,
                "reason": reason
            })
            missing_risk_points += risk_points

        audit_items.append({
            "type": ctype,
            "name": item["name"],
            "status": status,
            "confidence": conf,
            "riskPoints": risk_points
        })

    detected_types = [item["type"] for item in audit_items if item["status"] in ["DETECTED", "LIKELY_PRESENT"]]
    checklist_score = round((len(detected_types) / len(STANDARD_CONTRACT_CHECKLIST)) * 100)

    return {
        "auditItems": audit_items,
        "detected": detected_types,
        "missing": missing,
        "missingTypes": [m["type"] for m in missing],
        "missingRiskPoints": missing_risk_points,
        "checklistScore": checklist_score
    }
