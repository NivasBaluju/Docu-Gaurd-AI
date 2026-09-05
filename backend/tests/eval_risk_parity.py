import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.services.analysis.risk_scoring import calculate_document_risk

if __name__ == '__main__':
    try:
        raw = sys.stdin.read()
        if not raw:
            print(json.dumps({"error": "No input received"}))
            sys.exit(0)
        payload = json.loads(raw)
        text = payload.get('text', '')
        omissions = payload.get('missing', [])
        res = calculate_document_risk(text, [], {'missing': omissions})
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
