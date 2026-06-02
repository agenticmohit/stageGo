import sqlite3
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_connection
from utils import rate_limit

# Define the modular API routes Blueprint
api_bp = Blueprint('api', __name__)

# --- Events API Endpoints (CRUD) ---

@api_bp.route('/api/events', methods=['GET'])
@rate_limit(limit=120, period=60)
def get_events():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events")
        rows = cursor.fetchall()
        conn.close()
        
        events = []
        for row in rows:
            events.append(dict(row))
        return jsonify(events)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/events', methods=['POST'])
@rate_limit(limit=20, period=60)
def add_event():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing JSON data payload"}), 400
            
        # Extract fields
        event_id = data.get('id')
        name = data.get('name')
        description = data.get('description')
        venue = data.get('venue')
        location = data.get('location')
        date = data.get('date')
        time = data.get('time')
        category = data.get('category')
        image = data.get('image')
        user_id = data.get('user_id')

        # Validate mandatory items
        if not name or not description or not venue or not location or not date or not time or not category or not image:
            return jsonify({"error": "All fields are required to generate an event"}), 400
            
        if not user_id:
            return jsonify({"error": "Authentication required. User ID must be provided to create an event."}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO events (id, name, description, venue, location, date, time, category, image, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (event_id, name, description, venue, location, date, time, category, image, user_id))
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "id": event_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": f"An event with ID {data.get('id')} already exists."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing JSON data payload"}), 400

        name = data.get('name')
        description = data.get('description')
        venue = data.get('venue')
        location = data.get('location')
        date = data.get('date')
        time = data.get('time')
        category = data.get('category')
        image = data.get('image')
        user_id = data.get('user_id')

        # Validate mandatory items
        if not name or not description or not venue or not location or not date or not time or not category or not image:
            return jsonify({"error": "All fields are required to update an event"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify event ownership
        cursor.execute("SELECT user_id FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        if not event:
            conn.close()
            return jsonify({"error": f"No event found with ID {event_id}"}), 404
            
        if event['user_id'] is None or str(event['user_id']) != str(user_id):
            conn.close()
            return jsonify({"error": "Unauthorized. Only the event creator can modify this listing."}), 403

        cursor.execute('''
            UPDATE events 
            SET name = ?, description = ?, venue = ?, location = ?, date = ?, time = ?, category = ?, image = ?
            WHERE id = ?
        ''', (name, description, venue, location, date, time, category, image, event_id))
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "id": event_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "Authentication required. User ID query parameter is missing."}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify event ownership
        cursor.execute("SELECT user_id FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        if not event:
            conn.close()
            return jsonify({"error": f"No event found with ID {event_id}"}), 404
            
        if event['user_id'] is None or str(event['user_id']) != str(user_id):
            conn.close()
            return jsonify({"error": "Unauthorized. Only the event creator can delete this listing."}), 403

        cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "id": event_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- User Authentication API Endpoints ---

@api_bp.route('/api/auth/signup', methods=['POST'])
@rate_limit(limit=5, period=60)
def signup():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing JSON data payload"}), 400
            
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if username or email already exists
        cursor.execute("SELECT * FROM user WHERE username = ? OR email = ?", (username, email))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return jsonify({"error": "Username or Email is already registered."}), 400
            
        # Secure password hashing via Werkzeug's PBKDF2 algorithm
        password_hash = generate_password_hash(password)
        
        cursor.execute("INSERT INTO user (username, email, password_hash) VALUES (?, ?, ?)", (username, email, password_hash))
        conn.commit()
        conn.close()
        
        return jsonify({"status": "success", "message": "User registered successfully!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/auth/login', methods=['POST'])
@rate_limit(limit=10, period=60)
def login():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing JSON data payload"}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Username/Email and password are required"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        # Allow checking either email or username for login flexibility
        cursor.execute("SELECT * FROM user WHERE email = ? OR username = ?", (email, email))
        user = cursor.fetchone()
        conn.close()
        
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"error": "Invalid username/email address or password."}), 401
            
        return jsonify({
            "status": "success",
            "user": {
                "id": user['id'],
                "username": user['username'],
                "email": user['email']
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- User Interests API Endpoints ---

@api_bp.route('/api/users/<int:user_id>/interests', methods=['GET'])
def get_user_interests(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Query full event fields using an inner join on user_interests table
        cursor.execute('''
            SELECT e.* FROM events e
            JOIN user_interests ui ON e.id = ui.event_id
            WHERE ui.user_id = ?
        ''', (user_id,))
        rows = cursor.fetchall()
        conn.close()
        
        events = [dict(row) for row in rows]
        return jsonify(events), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/users/<int:user_id>/interests', methods=['POST'])
def add_user_interest(user_id):
    try:
        data = request.json
        if not data or 'event_id' not in data:
            return jsonify({"error": "Missing event_id in request body"}), 400
        event_id = data['event_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify the event actually exists
        cursor.execute("SELECT 1 FROM events WHERE id = ?", (event_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "Event not found"}), 404
            
        try:
            cursor.execute('''
                INSERT INTO user_interests (user_id, event_id)
                VALUES (?, ?)
            ''', (user_id, event_id))
            conn.commit()
        except sqlite3.IntegrityError:
            # Already added, ignore and treat as success
            pass
            
        conn.close()
        return jsonify({"status": "success", "message": "Event marked as interested"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/users/<int:user_id>/interests/<event_id>', methods=['DELETE'])
def remove_user_interest(user_id, event_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            DELETE FROM user_interests
            WHERE user_id = ? AND event_id = ?
        ''', (user_id, event_id))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Interest removed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
