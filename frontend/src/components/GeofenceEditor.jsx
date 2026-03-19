import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X, Loader2, PenLine } from "lucide-react";
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

const makeColoredIcon = (color) =>
  L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        width:18px;
        height:18px;
        background:${color};
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 10px rgba(0,0,0,0.6);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
const GREEN_ICON = makeColoredIcon("#22c55e");
const RED_ICON = makeColoredIcon("#ef4444");

// Glass-style CSS for Leaflet draw controls
const LEAFLET_GLASS_CSS = `
  .leaflet-bar,
  .leaflet-draw-toolbar,
  .leaflet-draw-actions {
    border: none !important;
    border-radius: 12px !important;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08) !important;
  }
  .leaflet-bar a,
  .leaflet-draw-toolbar a {
    background-color: rgba(255,255,255,0.88) !important;
    backdrop-filter: blur(8px) !important;
    border-bottom: 1px solid rgba(0,0,0,0.06) !important;
    color: #374151 !important;
    font-size: 16px !important;
    width: 36px !important;
    height: 36px !important;
    line-height: 36px !important;
    transition: background-color 0.15s !important;
  }
  .leaflet-bar a:last-child,
  .leaflet-draw-toolbar a:last-child {
    border-bottom: none !important;
  }
  .leaflet-bar a:hover,
  .leaflet-draw-toolbar a:hover {
    background-color: rgba(255,255,255,1) !important;
  }
  .leaflet-draw-actions a {
    background-color: rgba(255,255,255,0.9) !important;
    color: #374151 !important;
    width: auto !important;
    padding: 0 10px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
  }
  .leaflet-control-attribution {
    background: rgba(255,255,255,0.7) !important;
    backdrop-filter: blur(4px) !important;
    border-radius: 6px 0 0 0 !important;
    font-size: 10px !important;
  }
  /* vertex dots while drawing / editing */
  .leaflet-div-icon {
    background: #16a34a !important;
    border: 2px solid #fff !important;
    border-radius: 3px !important;
    width: 12px !important;
    height: 12px !important;
    margin-left: -6px !important;
    margin-top: -6px !important;
    box-shadow: 0 0 0 2px rgba(22,163,74,0.4), 0 2px 6px rgba(0,0,0,0.3) !important;
  }
  .leaflet-touch-icon {
    background: #16a34a !important;
    border: 2px solid #fff !important;
    border-radius: 50% !important;
    box-shadow: 0 0 0 2px rgba(22,163,74,0.4), 0 2px 6px rgba(0,0,0,0.3) !important;
  }
  @media (max-width: 1023px) {
    .leaflet-top.leaflet-right,
    .leaflet-top.leaflet-left { top: 70px !important; }
  }
`;

// DrawControl — stable: onCreate stored in ref, effect only depends on [map]
const DrawControl = ({ onCreate }) => {
  const map = useMap();
  const featureGroupRef = useRef(null);
  const onCreateRef = useRef(onCreate);

  useEffect(() => {
    onCreateRef.current = onCreate;
  });

  useEffect(() => {
    featureGroupRef.current = new L.FeatureGroup();
    map.addLayer(featureGroupRef.current);

    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          drawError: { color: "#fca5a5", message: "Edges cannot intersect" },
          shapeOptions: { color: "#16a34a", weight: 2, fillOpacity: 0.08 },
        },
      },
      edit: { featureGroup: featureGroupRef.current, remove: true },
    });

    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      featureGroupRef.current.addLayer(e.layer);
      if (onCreateRef.current) onCreateRef.current(e);
    });

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(featureGroupRef.current);
      map.off(L.Draw.Event.CREATED);
    };
  }, [map]);

  return null;
};

// GPS marker layer — imperative, outside FeatureGroup so draw-delete can't remove it
const GpsMarkerLayer = ({ gpsMarker }) => {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!gpsMarker) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }
    const { lat, lng, inside } = gpsMarker;
    const markerIcon = inside ? GREEN_ICON : RED_ICON;
    const label = inside ? "ESP32 · Inside" : "ESP32 · Outside";
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: markerIcon })
        .bindPopup(label, { className: "text-xs" })
        .addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(markerIcon);
      markerRef.current.getPopup()?.setContent(label);
    }
  }, [gpsMarker, map]);

  useEffect(
    () => () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    },
    [map],
  );

  return null;
};

// ── GeofenceEditor ──────────────────────────────────────────────────────────

const GeofenceEditor = ({
  onGeofenceUpdate,
  gpsMarker,
  geofenceSaved,
  onSave,
  onReset,
  loading,
}) => {
  const [hasPolygon, setHasPolygon] = useState(false);
  const featureGroupRef = useRef();

  const handleCreate = (e) => {
    const layer = e.layer;
    const coords = layer.getLatLngs()[0].map((ll) => [ll.lat, ll.lng]);
    setHasPolygon(true);
    if (onGeofenceUpdate) onGeofenceUpdate(coords);
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);
    }
  };

  const handleReset = () => {
    if (featureGroupRef.current) featureGroupRef.current.clearLayers();
    setHasPolygon(false);
    if (onGeofenceUpdate) onGeofenceUpdate(null);
    if (onReset) onReset();
  };

  const showUnsavedBanner = hasPolygon && !geofenceSaved;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 h-full"
      style={{ minHeight: 520 }}
    >
      <style>{LEAFLET_GLASS_CSS}</style>

      {/* map */}
      <MapContainer
        center={[10.9008, 76.9046]}
        zoom={18}
        style={{ height: "100%", width: "100%", minHeight: 520 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={22}
        />

        {/* zoom control top-right */}
        <ZoomControlTopRight />

        <FeatureGroup ref={featureGroupRef}>
          <DrawControl onCreate={handleCreate} />
        </FeatureGroup>
        <GpsMarkerLayer gpsMarker={gpsMarker} />
      </MapContainer>

      {/* ── floating overlay ── */}

      {/* unsaved banner — top */}
      <AnimatePresence>
        {showUnsavedBanner && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-amber-50/90 border border-amber-300/60 shadow-lg text-amber-700 text-xs font-medium whitespace-nowrap pointer-events-none"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            Polygon drawn — save to activate monitoring
          </motion.div>
        )}
      </AnimatePresence>

      {/* saved confirmation — top */}
      <AnimatePresence>
        {geofenceSaved && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-green-50/90 border border-green-300/60 shadow-lg text-green-700 text-xs font-medium whitespace-nowrap pointer-events-none"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Geofence active — GPS monitoring enabled
          </motion.div>
        )}
      </AnimatePresence>

      {/* action buttons — bottom-right */}
      <div className="absolute bottom-6 right-4 z-[500] flex items-center gap-2">
        {hasPolygon && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md bg-white/80 border border-white/40 shadow-lg text-xs font-medium text-red-600 hover:bg-red-50/90 transition-colors"
          >
            <X size={14} strokeWidth={2} />
            Clear
          </motion.button>
        )}

        <button
          onClick={onSave}
          disabled={loading || !hasPolygon}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
            loading || !hasPolygon
              ? "backdrop-blur-md bg-white/60 border border-white/30 text-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white border border-green-400/30"
          }`}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} strokeWidth={2} />
          )}
          {loading ? "Saving…" : "Save Geofence"}
        </button>
      </div>

      {/* hint — bottom-left */}
      {!hasPolygon && (
        <div className="absolute bottom-6 left-4 z-[500] flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md bg-white/75 border border-white/40 shadow-md text-xs text-gray-500">
          <PenLine size={14} className="text-gray-400" strokeWidth={1.5} />
          Use the draw tool to outline your field
        </div>
      )}
    </div>
  );
};

// Custom zoom control placed top-right via react-leaflet hook
const ZoomControlTopRight = () => {
  const map = useMap();
  useEffect(() => {
    const ctrl = L.control.zoom({ position: "topright" });
    map.addControl(ctrl);
    return () => map.removeControl(ctrl);
  }, [map]);
  return null;
};

export default GeofenceEditor;
