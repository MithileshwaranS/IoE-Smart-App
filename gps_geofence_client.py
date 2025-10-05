# gps_geofence_client.py
import os, time, folium, serial, requests, threading
from shapely.geometry import Point, Polygon
import socketio
import subprocess

# -------- settings --------
SERVER_BASE = "http://localhost:9000"
GEOFENCE_GET_URL = f"{SERVER_BASE}/api/geofence"
SERIAL_PORT = "/dev/tty.usbserial-0001"
BAUD = 115200
MAP_FILE = "gps_map.html"

# -------- socket setup --------
sio = socketio.Client()
boundary_latlng = []
polygon = None

def fetch_geofence():
    """Get current geofence on startup."""
    try:
        r = requests.get(GEOFENCE_GET_URL)
        if r.status_code == 200:
            data = r.json()
            return [(float(a), float(b)) for a, b in data["coordinates"]]
    except Exception as e:
        print("⚠️ Error fetching geofence:", e)
    return None

@sio.on("geofence_updated")
def on_geofence_update(data):
    """Handle push updates from Flask server."""
    global boundary_latlng, polygon
    coords = data.get("coordinates", [])
    print("🔄 Geofence updated:", coords)
    if coords:
        boundary_latlng = [(float(a), float(b)) for a, b in coords]
        polygon = Polygon([(b, a) for a, b in boundary_latlng])

def play_alert_sound():
    subprocess.run(["afplay", "/System/Library/Sounds/Glass.aiff"], check=False)

def main():
    global boundary_latlng, polygon
    sio.connect(SERVER_BASE)

    boundary_latlng = fetch_geofence()
    if not boundary_latlng:
        print("❌ No geofence available. Save first via /api/geofence/save.")
        return
    polygon = Polygon([(b, a) for a, b in boundary_latlng])
    print("✅ Using geofence:", boundary_latlng)

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD, timeout=1)
    except Exception as e:
        print("❌ Serial error:", e)
        return

    coords = []
    prev_inside = True
    print("Reading GPS data... Press Ctrl+C to stop.")

    while True:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if line and "," in line:
            try:
                lat, lon = map(float, line.split(","))
                coords.append((lat, lon))
                inside = polygon.contains(Point(lon, lat))
                print(f"{lat:.6f},{lon:.6f} → {'Inside' if inside else 'Outside'}")

                if prev_inside and not inside:
                    print("⚠️ ALERT: Device exited geofence!")
                    play_alert_sound()
                prev_inside = inside

                # Update map
                m = folium.Map(location=[lat, lon], zoom_start=18)
                folium.Polygon(boundary_latlng, color="green", fill=False).add_to(m)
                folium.PolyLine(coords).add_to(m)
                m.save(MAP_FILE)
            except:
                pass
        time.sleep(1)

if __name__ == "__main__":
    main()
