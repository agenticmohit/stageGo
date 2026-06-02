import os
import sqlite3
import logging
from werkzeug.security import generate_password_hash

DATABASE = 'events.db'

# Obtain standard module logger
logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Establish a connection to the SQLite database.
    Enables dictionaries-style column indexing via Row objects.
    """
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initialize SQLite database tables, run migrations if needed,
    and seed default system parameters and concert events.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create the user table first so events table can reference it
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    
    # Seed default test user if not already existing
    cursor.execute("SELECT COUNT(*) FROM user WHERE username = 'user'")
    user_exists = cursor.fetchone()[0] > 0
    if not user_exists:
        default_pwd_hash = generate_password_hash("password")
        cursor.execute('''
            INSERT INTO user (username, email, password_hash)
            VALUES ('user', 'user@stagego.com', ?)
        ''', (default_pwd_hash,))
        conn.commit()
        logger.info("Default test user seeded: username='user', password='password'")
    
    # Check if table events has column user_id (for schema auto-migration)
    cursor.execute("PRAGMA table_info(events)")
    columns = [row['name'] for row in cursor.fetchall()]
    if columns and 'user_id' not in columns:
        logger.info("Schema update: adding user_id foreign key constraint to events table.")
        cursor.execute("DROP TABLE IF EXISTS events")

    # Create the events table with user_id Foreign Key referencing user(id)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            venue TEXT NOT NULL,
            location TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            category TEXT NOT NULL,
            image TEXT NOT NULL,
            user_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES user(id)
        )
    ''')
    
    # Create the user_interests table to support event saving / interested functionality
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_interests (
            user_id INTEGER NOT NULL,
            event_id TEXT NOT NULL,
            PRIMARY KEY (user_id, event_id),
            FOREIGN KEY(user_id) REFERENCES user(id),
            FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
        )
    ''')
    
    # Check if we need to migrate/seed default data
    cursor.execute("SELECT COUNT(*) FROM events")
    count = cursor.fetchone()[0]
    
    if count == 0:
        logger.info("Database events table is empty. Initializing migration of default events...")
        default_events = [
            {
                "id": "evt-01",
                "name": "Retro Vibes: Classic Synth Night",
                "description": "A nostalgic journey through retro-futuristic synth-pop, warm analog synthesizers, and energetic basslines. Perfect for fans of vintage keyboards, nostalgic late-night grooves, and dance music lovers.",
                "venue": "The Downtown Warehouse",
                "location": "Arts & Theater District",
                "date": "June 12, 2026",
                "time": "22:00 - 04:00",
                "category": "synthwave",
                "image": "assets/synthwave.png"
            },
            {
                "id": "evt-02",
                "name": "Techno Warehouse Project: Late Night Sessions",
                "description": "A raw and authentic underground electronic music gathering inside an industrial warehouse space. Experience deep, hypnotic house and techno grooves under warm dim lights and custom sound systems.",
                "venue": "Ironworks Warehouse",
                "location": "Industrial Waterfront Area",
                "date": "June 20, 2026",
                "time": "23:30 - 06:00",
                "category": "electronic",
                "image": "assets/techno.png"
            },
            {
                "id": "evt-03",
                "name": "Sunset Indie Fest: Acoustic Sessions",
                "description": "A curated evening of twilight indie rock and warm acoustic soundscapes under a starry evening sky. Experience heartfelt guitar riffs, raw vocals, and atmospheric dream pop in the heart of the city.",
                "venue": "Oasis Rooftop Garden",
                "location": "Downtown Skyline Heights",
                "date": "July 04, 2026",
                "time": "18:00 - 23:00",
                "category": "rock",
                "image": "assets/indie.png"
            },
            {
                "id": "evt-04",
                "name": "Neon Dreams: Late Night Jazz Session",
                "description": "An exquisite jazz-fusion session blending soulful acoustic brass with beautiful electric keys and upright bass lines. The perfect intimate lounge experience for modern jazz lovers.",
                "venue": "Aether Velvet Lounge",
                "location": "Orion Heights District",
                "date": "July 15, 2026",
                "time": "20:00 - 01:00",
                "category": "jazz",
                "image": "assets/jazz.png"
            },
            {
                "id": "evt-05",
                "name": "Alternative Night: Sonic Echoes",
                "description": "An intimate showcase of dream-pop and indie rock bands. Melancholic guitar echoes, rich echoing reverb, and live acoustic drum sequences in a beautifully lit brick courtyard.",
                "venue": "Echo Courtyard Stage",
                "location": "Old Town Historic Quarter",
                "date": "July 28, 2026",
                "time": "19:00 - 00:00",
                "category": "rock",
                "image": "assets/indie.png"
            },
            {
                "id": "evt-06",
                "name": "Resonance: Live Modular Session",
                "description": "A premium night of live modular synth performances, featuring wall-to-wall hardware synthesizers and immersive warm reactive soundwave visualizations. Pure electronic sound exploration.",
                "venue": "The Hangar Stage",
                "location": "North Warehouse District",
                "date": "August 10, 2026",
                "time": "21:30 - 03:30",
                "category": "electronic",
                "image": "assets/techno.png"
            }
        ]
        
        # Populate SQLite table
        for event in default_events:
            cursor.execute('''
                INSERT INTO events (id, name, description, venue, location, date, time, category, image, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
            ''', (
                event["id"],
                event["name"],
                event["description"],
                event["venue"],
                event["location"],
                event["date"],
                event["time"],
                event["category"],
                event["image"]
            ))
        conn.commit()
        logger.info(f"Successfully migrated {len(default_events)} default events into SQLite events table!")
    
    conn.close()
