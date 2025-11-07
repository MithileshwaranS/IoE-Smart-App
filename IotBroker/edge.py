import json, csv, os
from datetime import datetime
from paho.mqtt import client as mqtt
from supabase import create_client, Client

# ----------------- Config -----------------
BROKER = "10.199.99.244"
PORT = 1883
TOPIC = "farm/+/telemetry"
CSV = "telemetry.csv"

SUPABASE_URL = "https://odymelxqynvyoatqfypd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9keW1lbHhxeW52eW9hdHFmeXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODUyNDMsImV4cCI6MjA3Mzk2MTI0M30.NbdF0T9A4-KS3ODn2axk2bsu8xfiZ13S8R29PhSEVyo"  # ⚠️ Don't hardcode real keys; use env vars
sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ----------------- CSV Setup -----------------
if not os.path.exists(CSV):
    with open(CSV, "w", newline="") as f:
        csv.writer(f).writerow(["ts_iso", "nodeid", "temp", "hum", "soil", "raw"])

# ----------------- MQTT Callbacks -----------------
def on_connect(client, userdata, flags, reason_code, properties=None):
    print("Connected with reason_code:", reason_code)
    ok = (reason_code == 0) or getattr(reason_code, "is_success", False)
    if ok:
        client.subscribe(TOPIC, qos=1)
        print(f"Subscribed to topic: {TOPIC}")
    else:
        print("Connection failed:", reason_code)

def save_row(row_csv, row_db):
    # CSV log
    with open(CSV, "a", newline="") as f:
        csv.writer(f).writerow([
            row_csv["ts_iso"], row_csv["nodeid"],
            row_csv["temp"], row_csv["hum"],
            row_csv["soil"], row_csv["raw"]
        ])

    # Supabase insert (only existing columns)
    try:
        res = sb.table("telemetry").insert(row_db).execute()
        if getattr(res, "error", None):
            print("⚠️ Supabase insert failed:", res.error)
        else:
            print("→ Saved to Supabase")
    except Exception as e:
        print("⚠️ Supabase insert failed:", e)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        row_csv = {
            "ts_iso": datetime.utcnow().isoformat(),
            "nodeid": data.get("nodeId"),
            "temp": data.get("temp"),
            "hum": data.get("hum"),
            "soil": data.get("soil"),
            "raw": data.get("raw"),
        }
        # Match DB table columns
        row_db = {
            "nodeid": row_csv["nodeid"],
            "temp": row_csv["temp"],
            "hum": row_csv["hum"],
            "soil": row_csv["soil"],
            "raw": row_csv["raw"],
        }

        print("→ Logged:", row_csv)
        save_row(row_csv, row_db)
    except Exception as e:
        print("⚠️ Bad message:", e, msg.payload)

# ----------------- MQTT Client -----------------
cli = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="edge-subscriber")
cli.on_connect = on_connect
cli.on_message = on_message

print(f"Connecting to broker {BROKER}:{PORT} ...")
cli.connect(BROKER, PORT, keepalive=60)
cli.loop_forever()
