import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import cors from "cors";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

    console.log("Received image:", req.file.filename);

    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const pythonServerUrl = "http://10.136.46.248:5000/predict";

    try {
      const response = await axios.post(pythonServerUrl, formData, {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
