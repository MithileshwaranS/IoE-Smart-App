import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CropPrediction from "./pages/CropPrediction";
import CropDiseasePrediction from "./pages/CropDiseasePrediction";
import SensorReadings from "./pages/SensorReadings";
import WaterLevel from "./pages/WaterLevel";
import WaterControl from "./pages/WaterControl";
import GeofencePage from "./pages/GeofencePage";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Layout>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/crop-prediction" element={<CropPrediction />} />
              <Route
                path="/crop-disease-prediction"
                element={<CropDiseasePrediction />}
              />
              <Route path="/sensor-readings" element={<SensorReadings />} />
              <Route path="/water-level" element={<WaterLevel />} />
              <Route path="/water-control" element={<WaterControl />} />
              <Route path="/geofence-map" element={<GeofencePage />} />
            </Routes>
          </AnimatePresence>
        </Layout>
      </Router>
    </>
  );
}

export default App;
