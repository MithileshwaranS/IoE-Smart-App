import pandas as pd
import json
import time
import paho.mqtt.client as mqtt

# MQTT Configuration
import os

BROKER = os.getenv("MQTT_BROKER_HOST", "localhost")
PORT = 1883
TOPIC = "environment/data"

import os

path = "data.csv"
print("Exists:", os.path.exists(path))
print("Size (bytes):", os.path.getsize(path))


# Load Excel file
df = pd.read_csv("data.csv")
print(df.head())


# MQTT Client
client = mqtt.Client()
client.connect(BROKER, PORT, 60)

print("MQTT Publisher started (random data every 10 seconds)")

try:
    while True:
        # Pick ONE random row
        row = df.sample(n=1).iloc[0]

        payload = row.to_dict()
        payload["timestamp"] = int(time.time())  # recommended

        payload_json = json.dumps(payload)

        client.publish(TOPIC, payload_json, qos=1)
        print(f"Published: {payload_json}")

        time.sleep(10)  # 1 minute interval

except KeyboardInterrupt:
    print("Stopping publisher...")

finally:
    client.disconnect()
