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
// import WaterControl from "./pages/WaterControl";
import GeofencePage from "./pages/GeofencePage";
import Login from "./pages/Login";
import Marketplace from "./pages/Marketplace";
import BuyerDashboard from "./pages/BuyerDashboard";
import AuctionListing from "./pages/AuctionListing";
import AuctionDetails from "./pages/AuctionDetails";
import AuctionManagement from "./pages/AuctionManagement";
import BlockchainSales from "./pages/BlockchainSales";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        <Router>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Home />} />
                <Route path="/crop-prediction" element={<CropPrediction />} />
                <Route
                  path="/crop-disease-prediction"
                  element={<CropDiseasePrediction />}
                />
                <Route path="/sensor-readings" element={<SensorReadings />} />
                <Route path="/water-level" element={<WaterLevel />} />
                <Route path="/geofence-map" element={<GeofencePage />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
                <Route path="/auction-listing" element={<AuctionListing />} />
                <Route
                  path="/auction/:auctionId"
                  element={<AuctionDetails />}
                />
                <Route
                  path="/auction-management"
                  element={<AuctionManagement />}
                />
                <Route
                  path="/blockchain-sales"
                  element={<BlockchainSales />}
                />
              </Route>
            </Routes>
          </AnimatePresence>
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;
