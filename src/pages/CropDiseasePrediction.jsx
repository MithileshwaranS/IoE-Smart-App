import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Bug,
  Camera,
  AlertTriangle,
  CheckCircle,
  Upload,
  Scan,
  Loader2,
  X,
} from "lucide-react";

const CropDiseasePrediction = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState("wheat");
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const commonDiseases = [
    { name: "Leaf Blight", severity: "High", cases: 24 },
    { name: "Powdery Mildew", severity: "Medium", cases: 18 },
    { name: "Root Rot", severity: "Low", cases: 12 },
    { name: "Aphid Infestation", severity: "Medium", cases: 15 },
  ];

  const crops = [
    { id: "wheat", name: "Wheat", icon: "🌾" },
    { id: "corn", name: "Corn", icon: "🌽" },
    { id: "rice", name: "Rice", icon: "🌾" },
    { id: "tomato", name: "Tomato", icon: "🍅" },
  ];

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setError(null);
      setPredictionResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current.click();
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPredictionResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setError("Please select an image first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("http://localhost:3001/api/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get prediction");
      }

      setPredictionResult(data);
    } catch (err) {
      console.error("Prediction error:", err);
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (confidence) => {
    if (confidence >= 0.8) return "text-red-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-green-600";
  };

  const getSeverityBg = (confidence) => {
    if (confidence >= 0.8) return "bg-red-50";
    if (confidence >= 0.6) return "bg-yellow-50";
    return "bg-green-50";
  };

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
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
            <Bug className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Disease Prediction
            </h1>
            <p className="text-gray-500">AI-powered disease detection</p>
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

      {/* Image Upload/Capture */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Disease Detection
        </h2>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          className="hidden"
        />

        {!imagePreview ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">
              Upload an image of your crop or take a photo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={handleCameraCapture}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </motion.button>
              <motion.button
                onClick={handleFileUpload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Image</span>
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Selected crop"
                className="w-full max-w-md mx-auto rounded-xl shadow-lg"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center mt-4">
              <motion.button
                onClick={handleSubmit}
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.05 }}
                whileTap={{ scale: isLoading ? 1 : 0.95 }}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    <span>Analyze Image</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-xl"
          >
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-blue-600 font-medium">
              Analyzing your crop image...
            </p>
            <p className="text-blue-500 text-sm mt-2">
              This may take a few moments
            </p>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <p className="text-red-800 font-medium">Analysis Failed</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Prediction Results */}
      {predictionResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
        >
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Detection Results
            </h2>

            <div className="space-y-4">
              <div
                className={`flex items-center justify-between p-4 ${getSeverityBg(
                  predictionResult.confidence
                )} rounded-xl`}
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle
                    className={`w-8 h-8 ${getSeverityColor(
                      predictionResult.confidence
                    )}`}
                  />
                  <div>
                    <p className="text-sm text-gray-600">Detected Disease</p>
                    <p
                      className={`text-xl font-bold ${getSeverityColor(
                        predictionResult.confidence
                      )}`}
                    >
                      {predictionResult.disease}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Confidence</p>
                  <p
                    className={`text-lg font-bold ${getSeverityColor(
                      predictionResult.confidence
                    )}`}
                  >
                    {Math.round(predictionResult.confidence * 100)}%
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Description</p>
                    <p className="text-gray-800 font-medium">
                      {predictionResult.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Recommended Treatment
                    </p>
                    <p className="text-gray-800 font-medium">
                      {predictionResult.treatment}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Common Diseases
            </h2>
            <div className="space-y-3">
              {commonDiseases.map((disease, index) => (
                <motion.div
                  key={disease.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        disease.severity === "High"
                          ? "bg-red-500"
                          : disease.severity === "Medium"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="text-gray-700">{disease.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {disease.cases} cases
                    </p>
                    <p className="text-xs text-gray-400">{disease.severity}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          onClick={() => window.location.reload()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          New Analysis
        </motion.button>
        {/* <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
        >
          Save Report
        </motion.button> */}
      </div>
    </motion.div>
  );
};

export default CropDiseasePrediction;
