import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

// Fix for marker icons in React
const icon = L.icon({
  iconSize: [25, 41],
  iconAnchor: [10, 41],
  popupAnchor: [2, -40],
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
L.Marker.prototype.options.icon = icon;

// Draw control component compatible with React 18
const DrawControl = ({ onCreate }) => {
  const map = useMap();
  const featureGroupRef = useRef(null);

  useEffect(() => {
    // Initialize the FeatureGroup for the DrawControl
    featureGroupRef.current = new L.FeatureGroup();
    map.addLayer(featureGroupRef.current);

    // Initialize the DrawControl
    const drawControl = new L.Control.Draw({
      draw: {
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          drawError: {
            color: "#e1e4e8",
            message: "Cannot draw intersecting edges!",
          },
          shapeOptions: {
            color: "#00a36c",
          },
        },
      },
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true,
      },
    });

    map.addControl(drawControl);

    // Add the draw created event handler
    map.on(L.Draw.Event.CREATED, (e) => {
      featureGroupRef.current.addLayer(e.layer);
      if (onCreate) onCreate(e);
    });

    // Cleanup
    return () => {
      map.removeControl(drawControl);
      map.removeLayer(featureGroupRef.current);
      map.off(L.Draw.Event.CREATED);
    };
  }, [map, onCreate]);

  return null;
};

const GeofenceEditor = ({ onGeofenceUpdate }) => {
  const [geofence, setGeofence] = useState(null);
  const [loading, setLoading] = useState(false);
  const featureGroupRef = useRef();

  const handleCreate = async (e) => {
    const layer = e.layer;
    const coords = layer.getLatLngs()[0].map((ll) => [ll.lat, ll.lng]);

    if (onGeofenceUpdate) {
      onGeofenceUpdate(coords);
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/geofence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ polygon: coords }),
      });

      const data = await response.json();
      setGeofence(coords);

      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers(); // Clear existing layers
        featureGroupRef.current.addLayer(layer);
      }
    } catch (error) {
      console.error("Error saving geofence:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch("http://localhost:3001/api/geofence", { method: "DELETE" });
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
      setGeofence(null);
      if (onGeofenceUpdate) {
        onGeofenceUpdate(null); // Reset parent state
      }
    } catch (error) {
      console.error("Error deleting geofence:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          disabled={loading || !geofence}
        >
          Reset Geofence
        </button>
      </div>

      <div className="h-[600px] rounded-xl overflow-hidden shadow-lg border border-gray-200">
        <MapContainer
          center={[10.9008, 76.9046]}
          zoom={18}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <FeatureGroup ref={featureGroupRef}>
            <DrawControl onCreate={handleCreate} />
          </FeatureGroup>
        </MapContainer>
      </div>

      {geofence && (
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Geofence Coordinates</h3>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(geofence, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default GeofenceEditor;
