import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Map, CheckCircle2, Circle } from "lucide-react";
import GeofenceEditor from "../components/GeofenceEditor";
import GpsStatusPanel from "../components/GpsStatusPanel";
import toast from "react-hot-toast";

// ── animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// ── GeofencePage ─────────────────────────────────────────────────────────────

const GeofencePage = () => {
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [geofenceSaved, setGeofenceSaved] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Stable reference — prevents GeofenceEditor re-render on GPS updates
  const handleGeofenceUpdate = useCallback((coords) => {
    setCoordinates(coords);
    if (!coords) setGeofenceSaved(false); // cleared via Reset
  }, []);

  const handleReset = useCallback(() => {
    setCoordinates(null);
    setGeofenceSaved(false);
  }, []);

  // WebSocket — live GPS feed
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let isMounted = true;

    const getWsBase = () => {
      const envApi = import.meta.env.VITE_API_BASE_URL;
      if (envApi && !envApi.includes("localhost")) return envApi.replace(/^http/, "ws");
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.hostname}:3001`;
    };

    const connect = () => {
      ws = new WebSocket(`${getWsBase()}/mqtt`);
      ws.onopen = () => { if (isMounted) setWsConnected(true); };
      ws.onerror = () => { if (isMounted) setWsConnected(false); };
      ws.onclose = () => {
        if (isMounted) {
          setWsConnected(false);
          reconnectTimeout = setTimeout(() => { if (isMounted) connect(); }, 3000);
        }
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== "gps_status") return;
          if (isMounted) {
            setGpsStatus({
              lat: data.lat,
              lng: data.lng,
              inside: data.inside,
              lastUpdated: new Date(data.timestamp),
            });
          }
        } catch { /* ignore non-JSON */ }
      };
    };

    connect();
    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws?.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  const handleSave = async () => {
    if (!coordinates) { toast.error("Please draw a geofence first"); return; }

    const getApiBaseUrl = () => {
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      if (envUrl && !envUrl.includes("localhost")) return envUrl;
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    };

    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/geofence/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates, timestamp: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to save geofence");
      setGeofenceSaved(true);
      toast.success("Geofence saved — GPS monitoring active!");
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step states
  const steps = [
    { label: "Draw boundary", done: !!coordinates },
    { label: "Save geofence", done: geofenceSaved },
    { label: "GPS monitoring", done: wsConnected && !!gpsStatus },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* ── page header ── */}
      <motion.div variants={cardVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Geofence Monitor</h1>
            <p className="text-sm text-gray-500">Draw boundaries · Track live GPS</p>
          </div>
        </div>

        {/* step progress pills */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
          {steps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-1.5">
                {step.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  : <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                <span className={`text-xs font-medium ${step.done ? "text-green-600" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px mx-1 ${steps[i + 1].done ? "bg-green-300" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* ── main content: 70/30 grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-stretch">

        {/* map card */}
        <motion.div variants={cardVariants} className="min-h-[540px]">
          <GeofenceEditor
            onGeofenceUpdate={handleGeofenceUpdate}
            onSave={handleSave}
            onReset={handleReset}
            loading={loading}
            geofenceSaved={geofenceSaved}
            gpsMarker={
              gpsStatus
                ? { lat: gpsStatus.lat, lng: gpsStatus.lng, inside: gpsStatus.inside }
                : null
            }
          />
        </motion.div>

        {/* status panel */}
        <motion.div variants={cardVariants} className="min-h-[540px]">
          <GpsStatusPanel
            gpsStatus={gpsStatus}
            wsConnected={wsConnected}
            geofenceCoords={coordinates}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default GeofencePage;
