import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Map, CheckCircle2, Circle, Cpu, Loader2, Plus, X } from "lucide-react";
import { getApiBaseUrl } from "../utils/apiConfig";
import GeofenceEditor from "../components/GeofenceEditor";
import GpsStatusPanel from "../components/GpsStatusPanel";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [geofenceSaved, setGeofenceSaved] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [hwId, setHwId] = useState("");
  const [addingDevice, setAddingDevice] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState([]);
  const [disconnecting, setDisconnecting] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`${getApiBaseUrl()}/api/devices/my?user_id=${user.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.devices) setLinkedDevices(data.devices); })
      .catch(() => {});
  }, [user?.id]);

  const handleAddDevice = async () => {
    if (!hwId.trim()) { toast.error("Enter a hardware ID"); return; }
    setAddingDevice(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/devices/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hw_id: hwId.trim(), user_id: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Device ${hwId.trim()} linked!`);
      setLinkedDevices((prev) => {
        if (prev.some((d) => d.hw_id === hwId.trim())) return prev;
        return [{ hw_id: hwId.trim(), linked_at: new Date().toISOString() }, ...prev];
      });
      setHwId("");
    } catch (err) {
      toast.error(err.message || "Failed to add device");
    } finally {
      setAddingDevice(false);
    }
  };

  const handleDisconnect = async (targetHwId) => {
    setDisconnecting(targetHwId);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/devices/disconnect`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, hw_id: targetHwId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Device ${targetHwId} disconnected`);
      setLinkedDevices((prev) => prev.filter((d) => d.hw_id !== targetHwId));
    } catch (err) {
      toast.error(err.message || "Failed to disconnect device");
    } finally {
      setDisconnecting(null);
    }
  };

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

      {/* ── add device card ── */}
      <motion.div
        variants={cardVariants}
        className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 space-y-3"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Register Device</p>
            <p className="text-xs text-gray-400">Enter the hardware ID printed on your ESP32</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={hwId}
              onChange={(e) => setHwId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDevice()}
              placeholder="Hardware ID"
              className="w-40 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleAddDevice}
              disabled={addingDevice}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {addingDevice ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </div>
        </div>

        {linkedDevices.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Linked Devices</p>
            {linkedDevices.map((device) => (
              <div
                key={device.hw_id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Cpu size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{device.hw_id}</p>
                    <p className="text-xs text-gray-400">
                      Linked {new Date(device.linked_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(device.hw_id)}
                  disabled={disconnecting === device.hw_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
                >
                  {disconnecting === device.hw_id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <X size={12} strokeWidth={2.5} />}
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
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
