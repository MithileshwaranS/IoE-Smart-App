# gps_sender.py
import time
import requests
import serial  # pyserial
import sys

# CONFIG
import os

SERVER_BASE = os.getenv("GEOFENCE_SERVER_URL", "http://localhost:8000")
GPS_POST_URL = f"{SERVER_BASE}/api/gps"
SERIAL_PORT = "/dev/tty.usbserial-0001"   # change to your port
BAUD = 115200
READ_TIMEOUT = 1

def send_gps(lat, lon):
    try:
        r = requests.post(GPS_POST_URL, json={"lat": lat, "lon": lon}, timeout=5)
        if r.status_code == 200:
            print("→ Sent:", lat, lon)
        else:
            print("! Server error:", r.status_code, r.text)
    except Exception as e:
        print("! Error sending GPS:", e)

def read_loop():
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD, timeout=READ_TIMEOUT)
    except Exception as e:
        print("❌ Could not open serial:", e)
        sys.exit(1)

    print("Reading GPS from", SERIAL_PORT)
    while True:
        try:
            line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                time.sleep(0.2)
                continue
            # Expect "lat,lon"
            if "," in line:
                try:
                    lat_str, lon_str = line.split(",")
                    lat = float(lat_str.strip())
                    lon = float(lon_str.strip())
                    send_gps(lat, lon)
                except Exception as e:
                    print("! Bad GPS line:", line, e)
            else:
                # optionally handle NMEA or other formats here
                print("· Raw:", line)
            time.sleep(0.2)
        except KeyboardInterrupt:
            print("Stopping.")
            break
        except Exception as e:
            print("! Read loop exception:", e)
            time.sleep(1)

if __name__ == "__main__":
    read_loop()
