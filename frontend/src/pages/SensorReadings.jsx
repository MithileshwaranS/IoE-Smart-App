import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Activity,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import toast from "react-hot-toast";

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SensorReadings = () => {
  const [latestReadings, setLatestReadings] = useState(null);
  const [readingHistory, setReadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSensorData = async () => {
    try {
      // Fetch latest reading
      const { data: latest, error: latestError } = await supabase
        .from("telemetry")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (latestError) throw latestError;

      // Fetch last 5 readings for history
      const { data: history, error: historyError } = await supabase
        .from("telemetry")
        .select("*")
        .order("id", { ascending: false })
        .limit(5);

      if (historyError) throw historyError;

      setLatestReadings(latest);
      setReadingHistory(history);
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      toast.error("Failed to fetch sensor readings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSensorData();

    // Set up real-time subscription with immediate updates
    const channel = supabase.channel("telemetry_changes");

    const subscription = channel
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "telemetry",
        },
        async (payload) => {
          console.log("Received real-time update:", payload);

          // Fetch latest data to ensure we have the most recent state
          const { data: latest, error: latestError } = await supabase
            .from("telemetry")
            .select("*")
            .order("id", { ascending: false })
            .limit(1)
            .single();

          if (!latestError && latest) {
            setLatestReadings(latest);
          }

          // Update history
          const { data: history, error: historyError } = await supabase
            .from("telemetry")
            .select("*")
            .order("id", { ascending: false })
            .limit(5);

          if (!historyError && history) {
            setReadingHistory(history);
          }

          // Show update notification
          toast.success("New sensor data received!", {
            duration: 2000,
            position: "bottom-right",
            style: {
              background: "#10B981",
              color: "white",
            },
          });
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log("Cleaning up subscription");
      if (subscription) {
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty dependency array since we want this to run once on mount

  const sensors = latestReadings
    ? [
        {
          id: "temp",
          name: "Temperature",
          value: `${latestReadings.temp.toFixed(1)}°C`,
          status: getTemperatureStatus(latestReadings.temp),
          icon: Thermometer,
          color: "text-orange-600",
          bg: "bg-orange-50",
        },
        {
          id: "humidity",
          name: "Humidity",
          value: `${latestReadings.hum.toFixed(1)}%`,
          status: getHumidityStatus(latestReadings.hum),
          icon: Droplets,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          id: "soilMoisture",
          name: "Soil Moisture",
          value: `${latestReadings.soil}%`,
          status: getSoilMoistureStatus(latestReadings.soil),
          icon: Droplets,
          color: "text-cyan-600",
          bg: "bg-cyan-50",
        },
        // {
        //   id: "raw",
        //   name: "Raw Reading",
        //   value: latestReadings.raw.toString(),
        //   status: "normal",
        //   icon: Activity,
        //   color: "text-purple-600",
        //   bg: "bg-purple-50",
        // },
      ]
    : [];

  // Helper functions to determine sensor status
  function getTemperatureStatus(temp) {
    if (temp < 18) return "low";
    if (temp > 30) return "high";
    return "normal";
  }

  function getHumidityStatus(hum) {
    if (hum < 30) return "low";
    if (hum > 70) return "high";
    return "normal";
  }

  function getSoilMoistureStatus(soil) {
    if (soil < 30) return "low";
    if (soil > 70) return "high";
    return "normal";
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "normal":
        return "text-green-600";
      case "low":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800";
      case "low":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchSensorData();
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from("telemetry")
        .select("*")
        .order("id", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Convert to CSV
      const csv = [
        ["Time", "Node ID", "Temperature", "Humidity", "Soil Moisture", "Raw"],
        ...data.map((row) => [
          new Date(row.created_at).toLocaleString(),
          row.nodeId,
          row.temp,
          row.hum,
          row.soil,
          row.raw,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sensor_readings_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  // Add these utility functions near your other helper functions
  const getTemperaturePercentage = (temp) => {
    // Assuming range: 0-50°C
    return Math.min(Math.max((temp / 50) * 100, 0), 100);
  };

  const getHumidityPercentage = (hum) => {
    // Humidity is already in percentage (0-100)
    return Math.min(Math.max(hum, 0), 100);
  };

  const getSoilMoisturePercentage = (soil) => {
    // Soil moisture is already in percentage (0-100)
    return Math.min(Math.max(soil, 0), 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Gauge className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Sensor Readings
            </h1>
            <p className="text-gray-500">Real-time environmental monitoring</p>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {sensors.map((sensor, index) => {
          const Icon = sensor.icon;
          // Calculate the percentage based on sensor type
          const percentage = (() => {
            switch (sensor.id) {
              case "temp":
                return getTemperaturePercentage(latestReadings.temp);
              case "humidity":
                return getHumidityPercentage(latestReadings.hum);
              case "soilMoisture":
                return getSoilMoisturePercentage(latestReadings.soil);
              default:
                return 0;
            }
          })();

          return (
            <motion.div
              key={sensor.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 ${sensor.bg} rounded-xl flex items-center justify-center`}
                >
                  <Icon className={`w-6 h-6 ${sensor.color}`} />
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                    sensor.status
                  )}`}
                >
                  {sensor.status.toUpperCase()}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {sensor.name}
              </h3>
              <p
                className={`text-3xl font-bold ${getStatusColor(
                  sensor.status
                )} mb-2`}
              >
                {sensor.value}
              </p>

              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    sensor.status === "normal"
                      ? "bg-green-500"
                      : sensor.status === "low"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 text-right">
                {percentage.toFixed(0)}%
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Sensor History */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Sensor History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-gray-600 font-semibold">Node ID</th>
                <th className="pb-3 text-gray-600 font-semibold">
                  Temperature
                </th>
                <th className="pb-3 text-gray-600 font-semibold">Humidity</th>
                <th className="pb-3 text-gray-600 font-semibold">
                  Soil Moisture
                </th>
                {/* <th className="pb-3 text-gray-600 font-semibold">Raw</th> */}
              </tr>
            </thead>
            <tbody>
              {readingHistory.map((reading, index) => (
                <motion.tr
                  key={reading.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 text-gray-800 font-medium">
                    {reading.nodeId}
                  </td>
                  <td className="py-3 text-gray-600">
                    {reading.temp.toFixed(1)}°C
                  </td>
                  <td className="py-3 text-gray-600">
                    {reading.hum.toFixed(1)}%
                  </td>
                  <td className="py-3 text-gray-600">{reading.soil}%</td>
                  {/* <td className="py-3 text-gray-600">{reading.raw}</td> */}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          onClick={handleRefresh}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Refresh Readings
        </motion.button>
        <motion.button
          onClick={handleExport}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
        >
          Export Data
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SensorReadings;
