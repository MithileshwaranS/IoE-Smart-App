# geofence_server.py
import json
import sqlite3
import time
from datetime import datetime
from flask import Flask, request, jsonify, g
from flask_socketio import SocketIO, emit

DB_PATH = "geofence.db"
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# --- Database helpers ---
def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH, check_same_thread=False)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS geofences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coords_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS gps_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        received_at TEXT NOT NULL
    )
    """)
    db.commit()

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

def save_geofence_to_db(coords):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO geofences (coords_json, created_at) VALUES (?, ?)",
        (json.dumps(coords), datetime.utcnow().isoformat())
    )
    db.commit()
    return cur.lastrowid

def get_latest_geofence():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT coords_json, created_at FROM geofences ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    if not row:
        return None
    return json.loads(row["coords_json"])

def save_gps_log(lat, lon):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO gps_logs (lat, lon, received_at) VALUES (?, ?, ?)",
        (lat, lon, datetime.utcnow().isoformat())
    )
    db.commit()
    return cur.lastrowid

# --- Routes ---
@app.route("/api/geofence/save", methods=["POST"])
def save_geofence():
    data = request.get_json(silent=True)
    if not data or "coordinates" not in data:
        return jsonify(error="Invalid JSON, expected { 'coordinates': [[lat,lng], ...] }"), 400

    coords = data["coordinates"]
    if not isinstance(coords, list) or len(coords) == 0:
        return jsonify(error="Coordinates must be a non-empty list"), 400

    # Normalize to list of [lat, lon] floats
    try:
        coords = [[float(a), float(b)] for a, b in coords]
    except Exception:
        return jsonify(error="Coordinates must be numeric pairs"), 400

    save_geofence_to_db(coords)

    # broadcast
    socketio.emit("geofence_updated", {"coordinates": coords})
    print("✅ Geofence saved and broadcasted:", coords)
    return jsonify(ok=True, received=coords)

@app.route("/api/geofence", methods=["GET"])
def get_geofence():
    coords = get_latest_geofence()
    if not coords:
        return jsonify(error="No geofence saved yet"), 404
    return jsonify(coordinates=coords)

@app.route("/api/gps", methods=["POST"])
def receive_gps():
    data = request.get_json(silent=True)
    if not data or "lat" not in data or "lon" not in data:
        return jsonify(error="Invalid JSON, expected { 'lat': <float>, 'lon': <float> }"), 400
    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
    except Exception:
        return jsonify(error="lat and lon must be numbers"), 400

    save_gps_log(lat, lon)

    # Broadcast via socket to any clients
    payload = {"lat": lat, "lon": lon, "ts": datetime.utcnow().isoformat()}
    socketio.emit("gps_update", payload)
    return jsonify(ok=True, received=payload)

# socket connection debug (optional)
@socketio.on("connect")
def on_connect():
    print("Client connected")
    # send latest geofence to the newly connected client if available
    coords = get_latest_geofence()
    if coords:
        emit("geofence_updated", {"coordinates": coords})

@socketio.on("disconnect")
def on_disconnect():
    print("Client disconnected")

if __name__ == "__main__":
    # initialize DB and start
    with app.app_context():
        init_db()
    print("Starting server on 0.0.0.0:8000")
    # eventlet recommended for Flask-SocketIO
    socketio.run(app, host="0.0.0.0", port=8000, allow_unsafe_werkzeug=True)
