import React, { useState } from "react";
import { motion } from "framer-motion";
import { Map, Save, Loader } from "lucide-react";
import GeofenceEditor from "../components/GeofenceEditor";
import toast from "react-hot-toast";

const GeofencePage = () => {
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState(null);

  const handleGeofenceUpdate = (coords) => {
    setCoordinates(coords);
  };

  const handleSave = async () => {
    if (!coordinates) {
      toast.error("Please draw a geofence first");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/geofence/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save geofence");
      }

      const data = await response.json();
      toast.success("Geofence saved successfully!");
      console.log("Saved geofence:", data);
    } catch (error) {
      console.error("Error saving geofence:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Geofence Editor
              </h1>
              <p className="text-gray-500">
                Define field boundaries by drawing polygons
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading || !coordinates}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              loading || !coordinates
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Geofence</span>
              </>
            )}
          </button>
        </div>

        <GeofenceEditor onGeofenceUpdate={handleGeofenceUpdate} />
      </div>
    </motion.div>
  );
};

export default GeofencePage;
