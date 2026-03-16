import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── helpers ─────────────────────────────────────────────────────────────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return null;
  let min = Infinity;
  for (const [vLat, vLng] of polygon) {
    const d = haversineDistance(lat, lng, vLat, vLng);
    if (d < min) min = d;
  }
  return min;
}

function formatDistance(meters) {
  if (meters == null) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function signalBars(secondsAgo) {
  if (secondsAgo == null) return 0;
  if (secondsAgo < 5) return 4;
  if (secondsAgo < 15) return 3;
  if (secondsAgo < 30) return 2;
  if (secondsAgo < 60) return 1;
  return 0;
}

function formatSecondsAgo(seconds) {
  if (seconds == null) return "—";
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${seconds % 60}s ago`;
}

// ── SignalIcon ───────────────────────────────────────────────────────────────

const SignalIcon = ({ bars }) => {
  const heights = [4, 7, 10, 14];
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" className="inline-block">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 5}
          y={16 - h}
          width="3"
          height={h}
          rx="1"
          className={i < bars ? "fill-green-400" : "fill-gray-600"}
        />
      ))}
    </svg>
  );
};

// ── GpsStatusPanel ───────────────────────────────────────────────────────────

const GpsStatusPanel = ({ gpsStatus, wsConnected, geofenceCoords }) => {
  const [secondsAgo, setSecondsAgo] = useState(null);

  useEffect(() => {
    if (!gpsStatus) { setSecondsAgo(null); return; }
    const tick = () =>
      setSecondsAgo(Math.floor((Date.now() - gpsStatus.lastUpdated) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gpsStatus]);

  const distance =
    gpsStatus && geofenceCoords
      ? distanceToPolygon(gpsStatus.lat, gpsStatus.lng, geofenceCoords)
      : null;

  const bars = signalBars(secondsAgo);

  const isInside = gpsStatus?.inside ?? false;

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full min-h-[520px]">
      {/* ── top bar ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Live Tracker
        </span>
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs text-green-400 font-medium">Connected</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-500">Reconnecting…</span>
            </>
          )}
        </div>
      </div>

      {/* ── body ── */}
      <div className="flex-1 flex flex-col px-5 py-5 gap-4">
        <AnimatePresence mode="wait">
          {!gpsStatus ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400">Waiting for GPS signal</p>
              <p className="text-xs text-gray-600 leading-relaxed max-w-[180px]">
                Save a geofence and ensure the ESP32 is publishing to{" "}
                <code className="text-gray-500 bg-gray-800 px-1 rounded">esp32/gps</code>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-4"
            >
              {/* hero badge */}
              <div className="flex flex-col items-center py-5">
                <motion.div
                  key={isInside ? "inside" : "outside"}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className={`relative flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 ${
                    isInside
                      ? "border-green-500 bg-green-950 shadow-[0_0_40px_rgba(34,197,94,0.25)]"
                      : "border-red-500 bg-red-950 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isInside ? "text-green-400" : "text-red-400"}`}>
                    {isInside ? "Inside" : "Outside"}
                  </span>
                  <span className={`text-2xl ${isInside ? "text-green-300" : "text-red-300"}`}>
                    {isInside ? "✓" : "✕"}
                  </span>
                  <span className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider">Geofence</span>
                  {/* pulse ring */}
                  <span className={`absolute inset-0 rounded-full animate-ping opacity-10 ${isInside ? "bg-green-500" : "bg-red-500"}`} />
                </motion.div>
              </div>

              {/* coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Latitude</p>
                  <p className="text-sm font-mono font-semibold text-white tabular-nums">
                    {gpsStatus.lat.toFixed(6)}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Longitude</p>
                  <p className="text-sm font-mono font-semibold text-white tabular-nums">
                    {gpsStatus.lng.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* distance + signal row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    {isInside ? "Nearest edge" : "Distance"}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {distance != null ? (
                      <>
                        <span className="font-mono">{formatDistance(distance)}</span>
                        {isInside && (
                          <span className="ml-1 text-[10px] text-green-500">from boundary</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500 text-xs">No geofence</span>
                    )}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Signal</p>
                  <div className="flex items-center gap-1.5">
                    <SignalIcon bars={bars} />
                    <span className="text-xs text-gray-400">{bars}/4</span>
                  </div>
                </div>
              </div>

              {/* last updated */}
              <div className="bg-gray-800/50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-gray-600">Last update</span>
                <span className="text-xs font-mono text-gray-400 tabular-nums">
                  {formatSecondsAgo(secondsAgo)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── footer ── */}
      <div className="px-5 pb-4 pt-0">
        <p className="text-[10px] text-center text-gray-700 tracking-wide uppercase">
          ESP32 · MQTT · esp32/gps
        </p>
      </div>
    </div>
  );
};

export default GpsStatusPanel;
