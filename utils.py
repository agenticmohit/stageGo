import time
from functools import wraps
from flask import jsonify, request, current_app

# --- Simple In-Memory Rate Limiter (Production Hardening) ---
RATE_LIMIT_STORAGE = {}

def rate_limit(limit=60, period=60):
    """
    Simple in-memory rate limiter decorator.
    limit: max allowed requests in window
    period: time window in seconds
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Bypass rate limit check during automated testing
            if current_app.testing:
                return f(*args, **kwargs)
                
            # Resolve remote IP address gracefully, checking for proxy headers
            ip = request.headers.get("X-Forwarded-For", request.remote_addr)
            if ip and "," in ip:
                ip = ip.split(",")[0].strip()
            
            now = time.time()
            if ip not in RATE_LIMIT_STORAGE:
                RATE_LIMIT_STORAGE[ip] = []
            
            # Prune obsolete request timestamps
            RATE_LIMIT_STORAGE[ip] = [t for t in RATE_LIMIT_STORAGE[ip] if now - t < period]
            
            # Check threshold
            if len(RATE_LIMIT_STORAGE[ip]) >= limit:
                return jsonify({"error": "Too many requests. Please slow down and try again."}), 429
            
            RATE_LIMIT_STORAGE[ip].append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator
