import os
import sys

# Ensure root directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

try:
    from backend.routes.documents import documents_bp
    from backend.routes.chat_routes import chat_bp
    from backend.routes.negotiation_routes import negotiation_bp
    from backend.routes.simulation_routes import simulation_bp
    from backend.routes.intelligence_routes import intelligence_bp
    from backend.services.database import test_connection
except ImportError:
    from routes.documents import documents_bp
    from routes.chat_routes import chat_bp
    from routes.negotiation_routes import negotiation_bp
    from routes.simulation_routes import simulation_bp
    from routes.intelligence_routes import intelligence_bp
    from services.database import test_connection

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register routes
    app.register_blueprint(documents_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(negotiation_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(intelligence_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_ok, db_msg = test_connection()
        return jsonify({
            "status": "online",
            "service": "DocuGuard Flask Backend",
            "postgres": {
                "connected": db_ok,
                "message": db_msg
            }
        }), (200 if db_ok else 500)

    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            "message": "DocuGuard AI Flask Backend API",
            "endpoints": [
                "/api/health",
                "/api/documents"
            ]
        })

    return app

if __name__ == '__main__':
    port = int(os.getenv("FLASK_PORT", 5001))
    app = create_app()
    print(f">> DocuGuard Flask Server starting on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
