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
import { WebSocketServer } from "ws";
import mqtt from "mqtt";
import bcrypt from "bcrypt";

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

// Initialize Supabase client (anon key — subject to RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);
console.log("URL:", process.env.SUPABASE_URL);
console.log("KEY exists:", !!process.env.SUPABASE_ANON_KEY);
try {
  const res = await fetch("https://odymelxqynvyoatqfypd.supabase.co");
  console.log("Direct status:", res.status);
} catch (err) {
  console.log("Direct fetch error:", err);
}

const FLASK_SERVER_URL = process.env.FLASK_SERVER_URL;

// Helper function to create authenticated Supabase client
const getAuthenticatedSupabase = (token) => {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

// Auth middleware: reads user ID directly from Authorization header
// The client sends: Authorization: Bearer <user-uuid>
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const authMiddleware = (req, res, next) => {
  const userId = req.headers.authorization?.split(" ")[1];
  if (!userId || !UUID_RE.test(userId)) return res.status(401).json({ error: "Unauthorized" });
  req.user = { id: userId };
  next();
};

// Add this after your other imports
// Update with your Flask server URL

// Middleware
app.use(
  cors({
    origin: true, // reflect any origin — allows all IPs on the local network
    credentials: true,
  }),
);
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

app.get("/api/dashboard", authMiddleware, (req, res) => {
  res.json({ message: "Welcome", user: req.user });
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

    const MLServerUrl =
      process.env.ML_SERVER_URL || "http://mlserver:8001/predict";

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

// Crop yield prediction endpoint
app.post("/api/crop-yield/predict", async (req, res) => {
  try {
    const {
      state,
      district,
      year,
      season,
      crop,
      area,
      rainfall_mm,
      temperature_c,
      humidity,
      wind_speed,
      solar_radiation,
      soil_moisture,
      n_avg,
      p_avg,
      k_avg,
    } = req.body;

    // Validate required fields
    if (
      !state ||
      !district ||
      !year ||
      !season ||
      !crop ||
      area === undefined ||
      rainfall_mm === undefined ||
      temperature_c === undefined ||
      humidity === undefined ||
      wind_speed === undefined ||
      solar_radiation === undefined ||
      soil_moisture === undefined ||
      n_avg === undefined ||
      p_avg === undefined ||
      k_avg === undefined
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "All fields are required for yield prediction",
      });
    }

    // Prepare request payload
    const payload = {
      state: state.toLowerCase().trim(),
      district: district.toLowerCase().trim(),
      year: parseInt(year),
      season: season.toLowerCase().trim(),
      crop: crop.toLowerCase().trim(),
      area: parseFloat(area),
      rainfall_mm: parseFloat(rainfall_mm),
      temperature_c: parseFloat(temperature_c),
      humidity: parseFloat(humidity),
      wind_speed: parseFloat(wind_speed),
      solar_radiation: parseFloat(solar_radiation),
      soil_moisture: parseFloat(soil_moisture),
      n_avg: parseFloat(n_avg),
      p_avg: parseFloat(p_avg),
      k_avg: parseFloat(k_avg),
    };

    // Call Python ML service
    const yieldServerUrl =
      process.env.YIELD_SERVER_URL || "http://cropprediction:8002/predict";

    try {
      const response = await axios.post(yieldServerUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });

      res.json(response.data);
    } catch (mlError) {
      console.error("Yield Prediction Server Error:", mlError.message);

      const errorResponses = {
        ECONNREFUSED: {
          status: 503,
          message: "Yield prediction service is currently unavailable",
          details:
            "Please ensure the Python yield prediction server is running on port 8002",
        },
        ENOTFOUND: {
          status: 503,
          message: "Yield prediction service is currently unavailable",
          details:
            "Please ensure the Python yield prediction server is running on port 8002",
        },
        ECONNABORTED: {
          status: 408,
          message: "Prediction request timed out",
          details: "The yield prediction server took too long to respond",
        },
      };

      const errorResponse = errorResponses[mlError.code] || {
        status: 500,
        message: "Error processing yield prediction",
        details: mlError.response?.data?.error || mlError.message,
      };

      return res.status(errorResponse.status).json({
        error: errorResponse.message,
        details: errorResponse.details,
      });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
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

function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function parseGpsPayload(payload) {
  try {
    const lat = payload.lat ?? payload.latitude ?? null;
    const lng = payload.lng ?? payload.lon ?? payload.longitude ?? null;
    if (lat === null || lng === null) return null;
    const latF = parseFloat(lat),
      lngF = parseFloat(lng);
    if (isNaN(latF) || isNaN(lngF)) return null;
    return { lat: latF, lng: lngF };
  } catch {
    return null;
  }
}

// Convert Leaflet [lat,lng][] → GeoJSON Polygon (closes the ring, swaps to [lng,lat])
function toGeoJsonPolygon(coordinates) {
  const ring = coordinates.map(([lat, lng]) => [lng, lat]);
  const first = ring[0], last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  return { type: "Polygon", coordinates: [ring] };
}

// Convert GeoJSON ring [[lng,lat],...] → Leaflet [[lat,lng],...]  (drops closing point)
function fromGeoJsonPolygon(geoJson) {
  const ring = geoJson.coordinates[0];
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

async function loadLatestGeofence() {
  try {
    const { data, error } = await supabase
      .from("geofencesnew")
      .select("polygon, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log("No saved geofence found in DB");
      return;
    }

    const coordinates = fromGeoJsonPolygon(data.polygon);
    latestGeofence = { coordinates };
    console.log(`Geofence loaded from DB: ${coordinates.length} points (saved ${data.created_at})`);
  } catch (err) {
    console.error("Failed to load geofence from DB:", err.message);
  }
}

app.post("/api/geofence/save", async (req, res) => {
  const { coordinates } = req.body;

  if (!coordinates || !Array.isArray(coordinates)) {
    return res.status(400).json({
      error: "Invalid coordinates format. Expected array of coordinates.",
    });
  }

  // Update in-memory immediately so GPS checks work right away
  latestGeofence = { coordinates };
  console.log(`Geofence saved in memory: ${coordinates.length} points`);

  // Persist to Supabase (won't fail the request if DB write fails)
  try {
    const { error } = await supabase.from("geofencesnew").insert({
      polygon: toGeoJsonPolygon(coordinates),
      metadata: {
        pointCount: coordinates.length,
        savedAt: new Date().toISOString(),
      },
    });
    if (error) console.error("Supabase geofence insert error:", error.message);
    else console.log("Geofence persisted to Supabase");
  } catch (err) {
    console.error("Supabase geofence insert failed:", err.message);
  }

  res.json({ message: "Geofence saved successfully" });
});

app.get("/api/geofence/latest", (req, res) => {
  if (!latestGeofence) {
    return res.status(404).json({ error: "No geofence saved yet" });
  }
  res.json(latestGeofence);
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // 2. Fetch user from DB
    const { data: users, error } = await supabase
      .from("users")
      .select("id, first_name, email, password_hash, role")
      .eq("email", email)
      .limit(1);

    if (error || users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 4. Send response — user ID is the identifier, no token needed
    res.status(200).json({
      message: "Login successful",
      token: user.id,
      user: {
        id: user.id,
        firstName: user.first_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/register", async (req, res) => {
  const { firstName, email, password, role } = req.body;
  console.log(req.body);

  if (!firstName || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("users").insert([
      {
        first_name: firstName,
        email,
        password_hash: passwordHash,
        role,
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: "Account created successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Profile endpoint to verify authentication
app.get("/api/profile", authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, first_name, email, role")
      .eq("id", req.user.id)
      .limit(1);

    if (error || user.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user[0].id,
        firstName: user[0].first_name,
        email: user[0].email,
        role: user[0].role,
      },
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Marketplace API Endpoints

// Get all marketplace listings
app.get("/api/marketplace/listings", async (req, res) => {
  try {
    const { data: listings, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ listings });
  } catch (err) {
    console.error("Get listings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's listings (Farmer only)
app.get("/api/marketplace/my-listings", authMiddleware, async (req, res) => {
  try {
    const { data: listings, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("farmer_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ listings });
  } catch (err) {
    console.error("Get my listings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new listing (Farmer only)
app.post("/api/marketplace/listings", authMiddleware, async (req, res) => {
  const { cropName, pricePerUnit, quantity, unit, description } = req.body;

  if (!cropName || !pricePerUnit || !quantity || !unit) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Get farmer name from users table
    const { data: farmer, error: farmerError } = await supabase
      .from("users")
      .select("first_name")
      .eq("id", req.user.id)
      .single();

    if (farmerError) {
      console.error("Farmer lookup error:", farmerError);
      return res.status(401).json({ error: "Farmer not found" });
    }

    const { data: listing, error } = await supabase
      .from("marketplace_listings")
      .insert([
        {
          farmer_id: req.user.id,
          farmer_name: farmer?.first_name || req.user.name || "Unknown Farmer",
          crop_name: cropName,
          price_per_unit: parseFloat(pricePerUnit),
          quantity: parseInt(quantity),
          unit: unit,
          description: description || "",
          status: "available",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: "Listing created successfully",
      listing: listing[0],
    });
  } catch (err) {
    console.error("Create listing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update listing (Farmer only)
app.put(
  "/api/marketplace/listings/:listingId",
  authMiddleware,
  async (req, res) => {
    const { listingId } = req.params;
    const { cropName, pricePerUnit, quantity, unit, description } = req.body;

    try {
      // Verify ownership
      const { data: listing, error: fetchError } = await supabase
        .from("marketplace_listings")
        .select("farmer_id")
        .eq("id", listingId)
        .single();

      if (fetchError || !listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (listing.farmer_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { data: updatedListing, error } = await supabase
        .from("marketplace_listings")
        .update({
          crop_name: cropName,
          price_per_unit: parseFloat(pricePerUnit),
          quantity: parseInt(quantity),
          unit: unit,
          description: description || "",
        })
        .eq("id", listingId)
        .select();

      if (error) throw error;

      res.status(200).json({
        message: "Listing updated successfully",
        listing: updatedListing[0],
      });
    } catch (err) {
      console.error("Update listing error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Delete listing (Farmer only)
app.delete(
  "/api/marketplace/listings/:listingId",
  authMiddleware,
  async (req, res) => {
    const { listingId } = req.params;

    try {
      // Verify ownership
      const { data: listing, error: fetchError } = await supabase
        .from("marketplace_listings")
        .select("farmer_id")
        .eq("id", listingId)
        .single();

      if (fetchError || !listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (listing.farmer_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", listingId);

      if (error) throw error;

      res.status(200).json({ message: "Listing deleted successfully" });
    } catch (err) {
      console.error("Delete listing error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Purchase listing (Buyer only)
app.post("/api/marketplace/purchase", authMiddleware, async (req, res) => {
  const { listingId, quantity } = req.body;

  if (!listingId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid purchase data" });
  }

  try {
    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const listingData = listing;

    if (listingData.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough quantity available. Only ${listingData.quantity} ${listingData.unit} available.`,
      });
    }

    // Get buyer info
    const { data: buyer, error: buyerError } = await supabase
      .from("users")
      .select("first_name, email")
      .eq("id", req.user.id)
      .single();

    if (buyerError || !buyer) {
      return res.status(401).json({ error: "Buyer not found" });
    }

    // Create transaction record
    const { data: transaction, error: transError } = await supabase
      .from("marketplace_transactions")
      .insert([
        {
          listing_id: listingId,
          buyer_id: req.user.id,
          buyer_name: buyer.first_name,
          buyer_email: buyer.email,
          crop_name: listingData.crop_name,
          farmer_name: listingData.farmer_name,
          farmer_id: listingData.farmer_id,
          quantity: parseInt(quantity),
          unit: listingData.unit,
          price_per_unit: listingData.price_per_unit,
          total_price: listingData.price_per_unit * parseInt(quantity),
          status: "completed",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (transError) throw transError;

    // Update listing quantity
    const newQuantity = listingData.quantity - quantity;
    const newStatus = newQuantity === 0 ? "sold_out" : "available";

    const { data: updatedListing, error: updateError } = await supabase
      .from("marketplace_listings")
      .update({
        quantity: newQuantity,
        status: newStatus,
      })
      .eq("id", listingId)
      .select();

    if (updateError) throw updateError;

    res.status(201).json({
      message: "Purchase successful",
      transaction: transaction[0],
      listing: updatedListing[0],
    });
  } catch (err) {
    console.error("Purchase error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's purchase history
app.get("/api/marketplace/transactions", authMiddleware, async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from("marketplace_transactions")
      .select("*")
      .eq("buyer_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ transactions });
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// AUCTION ROUTES
// ============================================

// GET /api/auctions - List all active auctions with filters
app.get("/api/auctions", async (req, res) => {
  try {
    const {
      status = "ACTIVE",
      sortBy = "end_time",
      limit = 20,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("auctions")
      .select(
        `
        id,
        crop_name,
        crop_variety,
        crop_image_url,
        description,
        quantity,
        unit,
        base_price,
        current_price,
        status,
        start_time,
        end_time,
        seller_id,
        highest_bidder_id,
        created_at
      `,
        { count: "exact" },
      )
      .eq("status", status);

    // Add sorting
    if (sortBy === "end_time") {
      query = query.order("end_time", { ascending: true });
    } else if (sortBy === "price") {
      query = query.order("current_price", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ auctions: data, total: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/auctions/:id - Get auction details with bid history
app.get("/api/auctions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", id)
      .single();

    if (auctionError) {
      return res.status(404).json({ error: "Auction not found" });
    }

    // Get bid history (latest bids first)
    const { data: bids, error: bidsError } = await supabase
      .from("bids")
      .select(
        `
        id,
        bid_amount,
        bidder_id,
        bid_time,
        status
      `,
      )
      .eq("auction_id", id)
      .order("bid_amount", { ascending: false })
      .limit(50);

    if (bidsError) {
      return res.status(400).json({ error: bidsError.message });
    }

    return res.json({ auction, bids });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/auctions - Create new auction (farmers only)
app.post("/api/auctions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      cropName,
      cropVariety,
      cropImageUrl,
      description,
      quantity,
      unit,
      basePrice,
      durationHours,
    } = req.body;

    // Validate inputs
    if (!cropName || !basePrice || !quantity || !durationHours) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + parseInt(durationHours));

    const { data, error } = await supabase
      .from("auctions")
      .insert({
        seller_id: userId,
        crop_name: cropName,
        crop_variety: cropVariety,
        crop_image_url: cropImageUrl,
        description,
        quantity: parseFloat(quantity),
        unit: unit || "kg",
        base_price: parseFloat(basePrice),
        current_price: parseFloat(basePrice),
        end_time: endTime.toISOString(),
        status: "ACTIVE",
      })
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ auction: data?.[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/auctions/:id - Update auction (seller only)
app.put("/api/auctions/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, durationHours } = req.body;

    // Verify seller
    const { data: auction, error: fetchError } = await supabase
      .from("auctions")
      .select("seller_id, status")
      .eq("id", id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "Auction not found" });
    }

    if (auction.seller_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (durationHours) {
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + parseInt(durationHours));
      updateData.end_time = endTime.toISOString();
    }

    const { data, error } = await supabase
      .from("auctions")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ auction: data?.[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/auctions/:id - Cancel auction (seller only)
app.delete("/api/auctions/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify seller and check status
    const { data: auction, error: fetchError } = await supabase
      .from("auctions")
      .select("seller_id, status")
      .eq("id", id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "Auction not found" });
    }

    if (auction.seller_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (auction.status !== "ACTIVE") {
      return res.status(400).json({ error: "Can only cancel active auctions" });
    }

    const { data, error } = await supabase
      .from("auctions")
      .update({ status: "CANCELLED" })
      .eq("id", id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ message: "Auction cancelled", auction: data?.[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/auctions/seller/:sellerId - Get all auctions by a seller
app.get("/api/auctions/seller/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const { data, error, count } = await supabase
      .from("auctions")
      .select("*", { count: "exact" })
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ auctions: data, total: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/auctions/user/my-auctions - Get current user's auctions
app.get("/api/auctions/user/my-auctions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error, count } = await supabase
      .from("auctions")
      .select("*", { count: "exact" })
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ auctions: data, total: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================
// BID ROUTES
// ============================================

// POST /api/bids - Place a bid on an auction
app.post("/api/bids", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { auctionId, bidAmount } = req.body;

    if (!auctionId || !bidAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (auctionError) {
      return res.status(404).json({ error: "Auction not found" });
    }

    // Validate auction status
    if (auction.status !== "ACTIVE") {
      return res.status(400).json({ error: "Auction is not active" });
    }

    // Validate auction time
    const endTime = new Date(auction.end_time);
    if (endTime <= new Date()) {
      return res.status(400).json({ error: "Auction has ended" });
    }

    // Prevent self-bidding
    if (auction.seller_id === userId) {
      return res
        .status(400)
        .json({ error: "Sellers cannot bid on their own auctions" });
    }

    // Validate bid amount (must be higher than current price)
    const numBidAmount = parseFloat(bidAmount);
    if (numBidAmount <= auction.current_price) {
      return res.status(400).json({
        error: `Bid amount must be higher than current price (${auction.current_price})`,
      });
    }

    // Begin transaction: Create bid and update auction
    // First, mark previous highest bid as outbid
    if (auction.highest_bidder_id) {
      await supabase
        .from("bids")
        .update({ status: "OUTBID" })
        .eq("auction_id", auctionId)
        .eq("status", "ACTIVE")
        .neq("id", null);
    }

    // Create new bid
    const { data: bid, error: bidError } = await supabase
      .from("bids")
      .insert({
        auction_id: auctionId,
        bidder_id: userId,
        bid_amount: numBidAmount,
        status: "ACTIVE",
      })
      .select();

    if (bidError) {
      return res.status(400).json({ error: bidError.message });
    }

    // Update auction with new highest bidder and price
    const { data: updatedAuction, error: updateError } = await supabase
      .from("auctions")
      .update({
        current_price: numBidAmount,
        highest_bidder_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auctionId)
      .select();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(201).json({
      bid: bid?.[0],
      auction: updatedAuction?.[0],
      message: "Bid placed successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/auctions/:auctionId/bids - Get all bids for an auction
app.get("/api/auctions/:auctionId/bids", async (req, res) => {
  try {
    const { auctionId } = req.params;

    const { data, error, count } = await supabase
      .from("bids")
      .select("*", { count: "exact" })
      .eq("auction_id", auctionId)
      .order("bid_time", { ascending: false })
      .limit(100);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ bids: data, total: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/user/my-bids - Get all bids placed by current user
app.get("/api/user/my-bids", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error, count } = await supabase
      .from("bids")
      .select(
        `
        id,
        auction_id,
        bid_amount,
        status,
        bid_time,
        auctions:auction_id (
          id,
          crop_name,
          crop_variety,
          current_price,
          status,
          end_time
        )
      `,
        { count: "exact" },
      )
      .eq("bidder_id", userId)
      .order("bid_time", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ bids: data, total: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/auctions/:auctionId/accept-bid - Accept highest bid (seller only)
app.post(
  "/api/auctions/:auctionId/accept-bid",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { auctionId } = req.params;

      // Get auction
      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auctionId)
        .single();

      if (auctionError) {
        return res.status(404).json({ error: "Auction not found" });
      }

      // Verify seller
      if (auction.seller_id !== userId) {
        return res.status(403).json({ error: "Only seller can accept bids" });
      }

      if (auction.status === "SOLD") {
        return res.status(400).json({ error: "Bid already accepted" });
      }

      // Get winning bid
      const { data: winningBid, error: bidError } = await supabase
        .from("bids")
        .select("*")
        .eq("auction_id", auctionId)
        .eq("bidder_id", auction.highest_bidder_id)
        .eq("status", "ACTIVE")
        .single();

      if (bidError || !winningBid) {
        return res.status(400).json({ error: "No valid bids to accept" });
      }

      // Create settlement
      const { data: settlement, error: settlementError } = await supabase
        .from("auction_settlements")
        .insert({
          auction_id: auctionId,
          winning_bid_id: winningBid.id,
          seller_id: auction.seller_id,
          buyer_id: auction.highest_bidder_id,
          final_price: auction.current_price,
          settlement_status: "ACCEPTED",
        })
        .select();

      if (settlementError) {
        return res.status(400).json({ error: settlementError.message });
      }

      // Update auction status
      const { data: updatedAuction, error: updateError } = await supabase
        .from("auctions")
        .update({ status: "SOLD" })
        .eq("id", auctionId)
        .select();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      return res.json({
        message: "Bid accepted successfully",
        settlement: settlement?.[0],
        auction: updatedAuction?.[0],
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/auctions/:auctionId/reject-bid - Reject highest bid (seller only)
app.post(
  "/api/auctions/:auctionId/reject-bid",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { auctionId } = req.params;

      // Get auction
      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auctionId)
        .single();

      if (auctionError) {
        return res.status(404).json({ error: "Auction not found" });
      }

      // Verify seller
      if (auction.seller_id !== userId) {
        return res.status(403).json({ error: "Only seller can reject bids" });
      }

      // Reject current highest bid
      if (auction.highest_bidder_id) {
        const { error: rejectError } = await supabase
          .from("bids")
          .update({ status: "REJECTED" })
          .eq("auction_id", auctionId)
          .eq("bidder_id", auction.highest_bidder_id)
          .eq("status", "ACTIVE");

        if (rejectError) {
          return res.status(400).json({ error: rejectError.message });
        }
      }

      // Get next highest bid
      const { data: nextBid, error: nextBidError } = await supabase
        .from("bids")
        .select("*")
        .eq("auction_id", auctionId)
        .eq("status", "ACTIVE")
        .order("bid_amount", { ascending: false })
        .limit(1)
        .single();

      let updatedAuctionData = {
        highest_bidder_id: null,
        current_price: auction.base_price,
      };

      if (nextBid && !nextBidError) {
        updatedAuctionData = {
          highest_bidder_id: nextBid.bidder_id,
          current_price: nextBid.bid_amount,
        };
      }

      const { data: updatedAuction, error: updateError } = await supabase
        .from("auctions")
        .update(updatedAuctionData)
        .eq("id", auctionId)
        .select();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      return res.json({
        message: "Bid rejected successfully",
        auction: updatedAuction?.[0],
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
  loadLatestGeofence();
});

// WebSocket Server for MQTT Bridge
const wss = new WebSocketServer({ server, path: "/mqtt" });

// MQTT Client for bridging
const mqttClient = mqtt.connect(
  process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  {
    clientId: `bridge_${Math.random().toString(16).substr(2, 8)}`,
    reconnectPeriod: 5000,
  },
);

mqttClient.on("connect", () => {
  console.log("MQTT Bridge: Connected to MQTT broker");
  mqttClient.subscribe("environment/data", (err) => {
    if (err) {
      console.error("MQTT Bridge: Subscription error:", err);
    } else {
      console.log("MQTT Bridge: Subscribed to environment/data");
    }
  });
  mqttClient.subscribe("esp32/gps", (err) => {
    if (err) console.error("MQTT Bridge: esp32/gps subscription error:", err);
    else console.log("MQTT Bridge: Subscribed to esp32/gps");
  });
});

mqttClient.on("message", (topic, message) => {
  const raw = message.toString();

  if (topic === "esp32/gps") {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      console.warn("MQTT: esp32/gps invalid JSON:", raw);
      return;
    }

    const coords = parseGpsPayload(payload);
    if (!coords) {
      console.warn("MQTT: esp32/gps missing lat/lng:", payload);
      return;
    }

    const inside =
      latestGeofence && Array.isArray(latestGeofence.coordinates)
        ? pointInPolygon([coords.lat, coords.lng], latestGeofence.coordinates)
        : false;

    const gpsMessage = JSON.stringify({
      type: "gps_status",
      lat: coords.lat,
      lng: coords.lng,
      inside,
      timestamp: new Date().toISOString(),
    });

    wss.clients.forEach((c) => {
      if (c.readyState === 1) c.send(gpsMessage);
    });
    // console.log(`GPS [${coords.lat}, ${coords.lng}] – ${inside ? "INSIDE" : "OUTSIDE"}`);
    return;
  }

  // Default: broadcast raw message (environment/data and any other topics)
  wss.clients.forEach((c) => {
    if (c.readyState === 1) c.send(raw);
  });
});

mqttClient.on("error", (error) => {
  console.error("MQTT Bridge: Error:", error);
});

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("MQTT Bridge: WebSocket client connected");

  ws.on("close", () => {
    console.log("MQTT Bridge: WebSocket client disconnected");
  });

  ws.on("error", (error) => {
    console.error("MQTT Bridge: WebSocket error:", error);
  });
});
