import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Wheat,
  TrendingUp,
  Calendar,
  MapPin,
  Thermometer,
  Droplets,
} from "lucide-react";

const CropPrediction = () => {
  const [selectedCrop, setSelectedCrop] = useState("wheat");
  const [predictionData, setPredictionData] = useState({
    yield: "4.2 tons/hectare",
    confidence: "92%",
    harvestDate: "2024-09-15",
    recommendation: "Excellent conditions for high yield",
  });

  const crops = [
    { id: "wheat", name: "Wheat", icon: "🌾" },
    { id: "corn", name: "Corn", icon: "🌽" },
    { id: "rice", name: "Rice", icon: "🌾" },
    { id: "tomato", name: "Tomato", icon: "🍅" },
  ];

  const environmentalFactors = [
    {
      label: "Temperature",
      value: "24°C",
      icon: Thermometer,
      color: "text-orange-600",
    },
    { label: "Humidity", value: "65%", icon: Droplets, color: "text-blue-600" },
    { label: "Soil pH", value: "6.8", icon: MapPin, color: "text-green-600" },
    {
      label: "Rainfall",
      value: "45mm",
      icon: Droplets,
      color: "text-cyan-600",
    },
  ];

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
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <Wheat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Crop Yield Prediction
            </h1>
            <p className="text-gray-500">AI-powered yield forecasting</p>
          </div>
        </div>
      </div>

      {/* Crop Selection */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Select Crop Type
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {crops.map((crop) => (
            <motion.button
              key={crop.id}
              onClick={() => setSelectedCrop(crop.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedCrop === crop.id
                  ? "border-green-500 bg-green-50 shadow-lg"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl sm:text-3xl mb-2">{crop.icon}</div>
              <p className="font-medium text-gray-800 text-sm sm:text-base">
                {crop.name}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Prediction Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Prediction Results
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Expected Yield</p>
                  <p className="text-2xl font-bold text-green-600">
                    {predictionData.yield}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Confidence</p>
                <p className="text-xl font-bold text-green-600">
                  {predictionData.confidence}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Optimal Harvest Date</p>
                <p className="text-lg font-semibold text-blue-600">
                  {predictionData.harvestDate}
                </p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Recommendation</p>
              <p className="text-gray-800 font-medium">
                {predictionData.recommendation}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Environmental Factors
          </h2>
          <div className="space-y-4">
            {environmentalFactors.map((factor, index) => {
              const Icon = factor.icon;
              return (
                <motion.div
                  key={factor.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-6 h-6 ${factor.color}`} />
                    <span className="text-gray-700">{factor.label}</span>
                  </div>
                  <span className="font-semibold text-gray-800">
                    {factor.value}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Generate New Prediction
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
        >
          Export Report
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CropPrediction;
