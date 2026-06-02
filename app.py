import os
import logging
from flask import Flask, jsonify
from database import init_db
from routes import api_bp

# Configure production-ready standard logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)

# Initialize Flask application instance
app = Flask(__name__, static_folder='.', static_url_path='')

# Inject production-grade security headers on every response
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # Lock down CSP. Allow self, unsafe-inline for inline assets, Google Fonts, and FontAwesome CDNs.
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    )
    return response

# --- Serve Static Webpage ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

# --- Register Routes Blueprint ---
app.register_blueprint(api_bp)

# --- Global JSON Error Handlers (Production Hardening) ---
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(429)
def ratelimit_handler(error):
    return jsonify({"error": "Too many requests. Please slow down and try again."}), 429

@app.errorhandler(500)
def internal_server_error(error):
    app.logger.error(f"Internal Server Error: {str(error)}")
    return jsonify({"error": "An unexpected error occurred on the server. Please try again later."}), 500

if __name__ == '__main__':
    # Initialize SQLite database schema and seed default events
    init_db()
    
    # Read port from environment for Railway/cloud deployment, default to 5000
    port = int(os.environ.get("PORT", 5000))
    
    # Launch Flask server
    app.logger.info(f"Starting StageGo Server on http://0.0.0.0:{port} ...")
    app.run(debug=True, host='0.0.0.0', port=port)
