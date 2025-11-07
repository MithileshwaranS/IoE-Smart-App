import { promises as fsPromises } from "fs";
import fs from "fs";
import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing required environment variables for Supabase");
}

if (!process.env.GEOFENCE_SERVER_URL) {
  throw new Error("Missing GEOFENCE_SERVER_URL environment variable");
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const GEOFENCE_SERVER_URL = process.env.GEOFENCE_SERVER_URL;
const FLASK_SERVER_URL = process.env.FLASK_SERVER_URL;

// Add this after your other imports
// Update with your Flask server URL

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = "uploads/";
    try {
      await fsPromises.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `crop-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed!"), false);
  },
});

// Disease prediction endpoint
app.post("/api/predict", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const cropType = req.body.cropType || "wheat"; // Get crop type from request, default to wheat
    console.log("Received image for crop type:", cropType);
    console.log("Received image:", req.file.filename);

    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("cropType", cropType);

    const MLServerUrl = "http://host.docker.internal:8001/predict";

    try {
      const response = await axios.post(MLServerUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });

      await fsPromises.unlink(req.file.path);
      res.json(response.data);
    } catch (mlError) {
      console.error("ML Server Error:", mlError.message);

      await fsPromises.unlink(req.file.path);

      const errorResponses = {
        ECONNREFUSED: {
          status: 503,
          message: "ML prediction service is currently unavailable",
          details: "Please ensure the Python ML server is running",
        },
        ENOTFOUND: {
          status: 503,
          message: "ML prediction service is currently unavailable",
          details: "Please ensure the Python ML server is running",
        },
        ECONNABORTED: {
          status: 408,
          message: "Prediction request timed out",
          details: "The ML server took too long to respond",
        },
      };

      const errorResponse = errorResponses[mlError.code] || {
        status: 500,
        message: "Error processing prediction",
        details: mlError.response?.data?.error || mlError.message,
      };

      return res.status(errorResponse.status).json({
        error: errorResponse.message,
        details: errorResponse.details,
      });
    }
  } catch (error) {
    console.error("Server Error:", error);

    if (req.file) {
      await fsPromises
        .unlink(req.file.path)
        .catch((err) => console.error("Error deleting file:", err));
    }

    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large. Maximum size is 10MB.",
    });
  }

  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Something went wrong!" });
});

let latestGeofence = null;

// Update the geofence save endpoint
const gpsServerUrl = "http://host.docker.internal:8000/api/geofence/save";

app.post("/api/geofence/save", async (req, res) => {
  try {
    const { coordinates } = req.body;

    // Validate input
    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({
        error: "Invalid coordinates format. Expected array of coordinates.",
      });
    }

    // Format data for Python server
    const pythonPayload = {
      coordinates: coordinates,
    };

    console.log("Sending to Python server:", pythonPayload);

    try {
      const response = await axios.post(gpsServerUrl, pythonPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      });

      // Update local reference
      latestGeofence = { coordinates };

      res.json({
        message: "Geofence saved successfully",
        data: response.data,
      });
    } catch (networkError) {
      console.error("Python Server Response:", {
        status: networkError.response?.status,
        data: networkError.response?.data,
        message: networkError.message,
      });

      throw new Error(
        `Python server error: ${
          networkError.response?.data?.error || networkError.message
        }`
      );
    }
  } catch (error) {
    console.error("Geofence save error:", error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to save geofence",
      details: error.message,
    });
  }
});

app.get("/api/geofence/latest", (req, res) => {
  if (!latestGeofence) {
    return res.status(404).json({ error: "No geofence saved yet" });
  }
  res.json(latestGeofence);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
