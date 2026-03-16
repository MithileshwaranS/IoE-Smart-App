// Integration Guide - Adding Auction Routes to server.js

// This file shows how to integrate the auction routes into the main Express server

import auctionRoutes from "./routes/auctionRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import AuctionWebSocketManager from "./services/auctionWebSocketManager.js";

// Add these imports to your server.js file at the top

// ============================================
// 1. Add middleware for token verification
// ============================================

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
    req.userToken = token;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ============================================
// 2. Register Auction API Routes
// ============================================

// Get all auctions (no auth required)
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

    if (sortBy === "end_time") {
      query = query.order("end_time", { ascending: true });
    } else if (sortBy === "price") {
      query = query.order("current_price", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    res.json({ auctions: data, total: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get auction details
app.get("/api/auctions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", id)
      .single();

    if (auctionError) throw auctionError;

    const { data: bids, error: bidsError } = await supabase
      .from("bids")
      .select("*")
      .eq("auction_id", id)
      .order("bid_amount", { ascending: false })
      .limit(50);

    if (bidsError) throw bidsError;

    res.json({ auction, bids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new auction (requires auth)
app.post("/api/auctions", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
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

    if (!cropName || !basePrice || !quantity || !durationHours) {
      return res.status(400).json({ error: "Missing required fields" });
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

    if (error) throw error;
    res.status(201).json({ auction: data?.[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's auctions
app.get("/api/auctions/user/my-auctions", verifyToken, async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from("auctions")
      .select("*", { count: "exact" })
      .eq("seller_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ auctions: data, total: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 3. Register Bid API Routes
// ============================================

// Place a bid
app.post("/api/bids", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { auctionId, bidAmount } = req.body;

    if (!auctionId || !bidAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (auctionError) throw auctionError;

    // Validation
    if (auction.status !== "ACTIVE") {
      return res.status(400).json({ error: "Auction is not active" });
    }

    const endTime = new Date(auction.end_time);
    if (endTime <= new Date()) {
      return res.status(400).json({ error: "Auction has ended" });
    }

    if (auction.seller_id === userId) {
      return res
        .status(400)
        .json({ error: "Sellers cannot bid on their own auctions" });
    }

    const numBidAmount = parseFloat(bidAmount);
    if (numBidAmount <= auction.current_price) {
      return res.status(400).json({
        error: `Bid amount must be higher than current price (${auction.current_price})`,
      });
    }

    // Update previous bid to OUTBID
    if (auction.highest_bidder_id) {
      await supabase
        .from("bids")
        .update({ status: "OUTBID" })
        .eq("auction_id", auctionId)
        .eq("status", "ACTIVE");
    }

    // Create new bid
    const { data: bid, error: bidError } = await supabase.from("bids").insert({
      auction_id: auctionId,
      bidder_id: userId,
      bid_amount: numBidAmount,
      status: "ACTIVE",
    });

    if (bidError) throw bidError;

    // Update auction
    const { data: updatedAuction, error: updateError } = await supabase
      .from("auctions")
      .update({
        current_price: numBidAmount,
        highest_bidder_id: userId,
      })
      .eq("id", auctionId)
      .select();

    if (updateError) throw updateError;

    // Broadcast via WebSocket if manager exists
    if (wsManager) {
      wsManager.broadcastToAuction(auctionId, {
        type: "BID_PLACED",
        auctionId,
        bidderId: userId,
        bidAmount: numBidAmount,
        timestamp: new Date().toISOString(),
        message: `New bid placed: ${numBidAmount}`,
      });
    }

    res.status(201).json({
      bid: bid?.[0],
      auction: updatedAuction?.[0],
      message: "Bid placed successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bid history for auction
app.get("/api/auctions/:auctionId/bids", async (req, res) => {
  try {
    const { auctionId } = req.params;

    const { data, error, count } = await supabase
      .from("bids")
      .select("*", { count: "exact" })
      .eq("auction_id", auctionId)
      .order("bid_time", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ bids: data, total: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's bids
app.get("/api/user/my-bids", verifyToken, async (req, res) => {
  try {
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
      .eq("bidder_id", req.userId)
      .order("bid_time", { ascending: false });

    if (error) throw error;
    res.json({ bids: data, total: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept bid
app.post(
  "/api/auctions/:auctionId/accept-bid",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { auctionId } = req.params;

      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auctionId)
        .single();

      if (auctionError) throw auctionError;

      if (auction.seller_id !== userId) {
        return res.status(403).json({ error: "Only seller can accept bids" });
      }

      if (auction.status === "SOLD") {
        return res.status(400).json({ error: "Bid already accepted" });
      }

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

      const { data: settlement, error: settlementError } = await supabase
        .from("auction_settlements")
        .insert({
          auction_id: auctionId,
          winning_bid_id: winningBid.id,
          seller_id: auction.seller_id,
          buyer_id: auction.highest_bidder_id,
          final_price: auction.current_price,
          settlement_status: "ACCEPTED",
        });

      if (settlementError) throw settlementError;

      const { data: updatedAuction, error: updateError } = await supabase
        .from("auctions")
        .update({ status: "SOLD" })
        .eq("id", auctionId)
        .select();

      if (updateError) throw updateError;

      // Broadcast auction sold via WebSocket
      if (wsManager) {
        wsManager.broadcastAuctionSold(auctionId, updatedAuction?.[0]);
      }

      res.json({
        message: "Bid accepted successfully",
        settlement: settlement?.[0],
        auction: updatedAuction?.[0],
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ============================================
// 4. Setup WebSocket Manager
// ============================================

// Add this after your express server initialization:

import AuctionWebSocketManager from "./services/auctionWebSocketManager.js";

const server = http.createServer(app);
const wsManager = new AuctionWebSocketManager(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// ============================================
// 5. Environment Variables Required
// ============================================

// Add to .env:
// JWT_SECRET=your-secret-key
// SUPABASE_URL=your-supabase-url
// SUPABASE_ANON_KEY=your-anon-key

// ============================================
// 6. Error Handling Middleware
// ============================================

app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(500).json({
    error: error.message || "Internal server error",
  });
});

// ============================================
// 7. Test Endpoints
// ============================================

// GET all auctions
// curl http://localhost:3001/api/auctions

// GET specific auction
// curl http://localhost:3001/api/auctions/<auction-id>

// POST new auction (requires token)
// curl -X POST http://localhost:3001/api/auctions \
//   -H "Authorization: Bearer <token>" \
//   -H "Content-Type: application/json" \
//   -d '{"cropName":"Wheat","quantity":100,"unit":"kg","basePrice":2500,"durationHours":24}'

// POST bid (requires token)
// curl -X POST http://localhost:3001/api/bids \
//   -H "Authorization: Bearer <token>" \
//   -H "Content-Type: application/json" \
//   -d '{"auctionId":"<auction-id>","bidAmount":2700}'
