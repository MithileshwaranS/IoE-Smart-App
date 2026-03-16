import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    req.userId = decoded.sub || decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Helper to get authenticated Supabase client
const getAuthenticatedSupabase = (token, supabase) => {
  return supabase;
};

// GET /api/auctions - List all active auctions with filters
export const getAuctions = async (req, res, supabase) => {
  return async (request, response) => {
    try {
      const {
        status = "ACTIVE",
        sortBy = "end_time",
        limit = 20,
        offset = 0,
      } = request.query;

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
        return response.status(400).json({ error: error.message });
      }

      return response.json({ auctions: data, total: count });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// GET /api/auctions/:id - Get auction details with bid history
export const getAuctionDetails = async (req, res, supabase) => {
  return async (request, response) => {
    try {
      const { id } = request.params;

      // Get auction details
      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", id)
        .single();

      if (auctionError) {
        return response.status(404).json({ error: "Auction not found" });
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
        return response.status(400).json({ error: bidsError.message });
      }

      return response.json({ auction, bids });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// POST /api/auctions - Create new auction (farmers only)
export const createAuction = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      if (!userId) {
        return response.status(401).json({ error: "Unauthorized" });
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
      } = request.body;

      // Validate inputs
      if (!cropName || !basePrice || !quantity || !durationHours) {
        return response.status(400).json({ error: "Missing required fields" });
      }

      const endTime = new Date();
      endTime.setHours(endTime.getHours() + parseInt(durationHours));

      const { data, error } = await supabase.from("auctions").insert({
        seller_id: userId,
        crop_name: cropName,
        crop_variety: cropVariety,
        crop_image_url: cropImageUrl,
        description,
        quantity: parseFloat(quantity),
        unit,
        base_price: parseFloat(basePrice),
        current_price: parseFloat(basePrice),
        end_time: endTime.toISOString(),
        status: "ACTIVE",
      });

      if (error) {
        return response.status(400).json({ error: error.message });
      }

      return response.status(201).json({ auction: data?.[0] });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// PUT /api/auctions/:id - Update auction (seller only)
export const updateAuction = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      const { id } = request.params;
      const { status, durationHours } = request.body;

      // Verify seller
      const { data: auction, error: fetchError } = await supabase
        .from("auctions")
        .select("seller_id, status")
        .eq("id", id)
        .single();

      if (fetchError) {
        return response.status(404).json({ error: "Auction not found" });
      }

      if (auction.seller_id !== userId) {
        return response.status(403).json({ error: "Unauthorized" });
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
        return response.status(400).json({ error: error.message });
      }

      return response.json({ auction: data?.[0] });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// DELETE /api/auctions/:id - Cancel auction (seller only)
export const cancelAuction = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      const { id } = request.params;

      // Verify seller and check status
      const { data: auction, error: fetchError } = await supabase
        .from("auctions")
        .select("seller_id, status")
        .eq("id", id)
        .single();

      if (fetchError) {
        return response.status(404).json({ error: "Auction not found" });
      }

      if (auction.seller_id !== userId) {
        return response.status(403).json({ error: "Unauthorized" });
      }

      if (auction.status !== "ACTIVE") {
        return response
          .status(400)
          .json({ error: "Can only cancel active auctions" });
      }

      const { data, error } = await supabase
        .from("auctions")
        .update({ status: "CANCELLED" })
        .eq("id", id)
        .select();

      if (error) {
        return response.status(400).json({ error: error.message });
      }

      return response.json({
        message: "Auction cancelled",
        auction: data?.[0],
      });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// GET /api/auctions/seller/:sellerId - Get all auctions by a seller
export const getSellerAuctions = (supabase) => {
  return async (request, response) => {
    try {
      const { sellerId } = request.params;

      const { data, error, count } = await supabase
        .from("auctions")
        .select("*", { count: "exact" })
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) {
        return response.status(400).json({ error: error.message });
      }

      return response.json({ auctions: data, total: count });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// GET /api/auctions/user/my-auctions - Get current user's auctions
export const getMyAuctions = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      if (!userId) {
        return response.status(401).json({ error: "Unauthorized" });
      }

      const { data, error, count } = await supabase
        .from("auctions")
        .select("*", { count: "exact" })
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return response.status(400).json({ error: error.message });
      }

      return response.json({ auctions: data, total: count });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};
