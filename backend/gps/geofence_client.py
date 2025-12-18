# gps_geofence_client.py
import os
import time
import folium
import threading
import subprocess
from shapely.geometry import Point, Polygon
import socketio

SERVER_BASE = os.getenv("GEOFENCE_SERVER_URL", "http://localhost:8000")
MAP_FILE = "gps/gps_map.html"

sio = socketio.Client()
boundary_latlng = []
polygon = None
coords = []  # history of gps points
prev_inside = None
map_lock = threading.Lock()

def play_alert_sound():
    # mac: afplay, linux: aplay or paplay, fallback print
    try:
        subprocess.run(["afplay", "/System/Library/Sounds/Glass.aiff"], check=False)
    except Exception:
        try:
            subprocess.run(["paplay", "/usr/share/sounds/freedesktop/stereo/message.oga"], check=False)
        except Exception:
            print("ALERT!")

def update_map_file(lat, lon):
    with map_lock:
        # center map on latest position
        m = folium.Map(location=[lat, lon], zoom_start=18)
        if boundary_latlng:
            folium.Polygon(boundary_latlng, color="green", fill=False).add_to(m)
        if coords:
            folium.PolyLine(coords).add_to(m)
        folium.Marker([lat, lon], popup="Device").add_to(m)
        m.save(MAP_FILE)

@sio.on("connect")
def on_connect():
    print("Connected to server")

@sio.on("disconnect")
def on_disconnect():
    print("Disconnected from server")

@sio.on("geofence_updated")
def on_geofence_update(data):
    global boundary_latlng, polygon
    coords_in = data.get("coordinates", [])
    print("🔄 Geofence updated:", coords_in)
    if coords_in:
        # folium expects list of [lat, lon]
        boundary_latlng = [(float(a), float(b)) for a, b in coords_in]
        # shapely wants (lon, lat)
        polygon = Polygon([(b, a) for a, b in boundary_latlng])

@sio.on("gps_update")
def on_gps_update(data):
    global coords, prev_inside
    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
    except Exception:
        print("Bad gps_update payload", data)
        return

    coords.append((lat, lon))
    inside = True
    if polygon is not None:
        inside = polygon.contains(Point(lon, lat))

    state = "Inside" if inside else "Outside"
    print(f"{lat:.6f},{lon:.6f} -> {state}")

    if prev_inside is None:
        prev_inside = inside

    if prev_inside and not inside:
        print("⚠️ ALERT: Device exited geofence!")
        # play sound in thread to avoid blocking
        threading.Thread(target=play_alert_sound, daemon=True).start()

    prev_inside = inside
    update_map_file(lat, lon)

def main():
    # connect and block
    try:
        sio.connect(SERVER_BASE)
        print("Listening for GPS and geofence updates. Map saved to", MAP_FILE)
        sio.wait()
    except KeyboardInterrupt:
        print("Stopping client...")
    except Exception as e:
        print("Connection error:", e)

if __name__ == "__main__":
    main()
