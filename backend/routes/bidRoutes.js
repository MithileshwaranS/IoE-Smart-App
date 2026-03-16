import express from "express";

const router = express.Router();

// POST /api/bids - Place a bid on an auction
export const placeBid = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      if (!userId) {
        return response.status(401).json({ error: "Unauthorized" });
      }

      const { auctionId, bidAmount } = request.body;

      if (!auctionId || !bidAmount) {
        return response.status(400).json({ error: "Missing required fields" });
      }

      // Get auction details
      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auctionId)
        .single();

      if (auctionError) {
        return response.status(404).json({ error: "Auction not found" });
      }

      // Validate auction status
      if (auction.status !== "ACTIVE") {
        return response.status(400).json({ error: "Auction is not active" });
      }

      // Validate auction time
      const endTime = new Date(auction.end_time);
      if (endTime <= new Date()) {
        return response.status(400).json({ error: "Auction has ended" });
      }

      // Prevent self-bidding
      if (auction.seller_id === userId) {
        return response
          .status(400)
          .json({ error: "Sellers cannot bid on their own auctions" });
      }

      // Validate bid amount (must be higher than current price)
      const numBidAmount = parseFloat(bidAmount);
      if (numBidAmount <= auction.current_price) {
        return response.status(400).json({
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
        });

      if (bidError) {
        return response.status(400).json({ error: bidError.message });
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
        return response.status(400).json({ error: updateError.message });
      }

      return response.status(201).json({
        bid: bid?.[0],
        auction: updatedAuction?.[0],
        message: "Bid placed successfully",
      });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// GET /api/auctions/:auctionId/bids - Get all bids for an auction
export const getBids = (supabase) => {
  return async (request, response) => {
    try {
      const { auctionId } = request.params;

      const { data, error, count } = await supabase
        .from("bids")
        .select("*", { count: "exact" })
        .eq("auction_id", auctionId)
        .order("bid_time", { ascending: false })
        .limit(100);

      if (error) {
        return response.status(400).json({ error: error.message });
      }

      return response.json({ bids: data, total: count });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// GET /api/user/my-bids - Get all bids placed by current user
export const getMyBids = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      if (!userId) {
        return response.status(401).json({ error: "Unauthorized" });
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
        return response.status(400).json({ error: error.message });
      }

      return response.json({ bids: data, total: count });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// POST /api/auctions/:auctionId/accept-bid - Accept highest bid (seller only)
export const acceptBid = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      const { auctionId } = request.params;

      // Get auction
      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auctionId)
        .single();

      if (auctionError) {
        return response.status(404).json({ error: "Auction not found" });
      }

      // Verify seller
      if (auction.seller_id !== userId) {
        return response
          .status(403)
          .json({ error: "Only seller can accept bids" });
      }

      if (auction.status === "SOLD") {
        return response.status(400).json({ error: "Bid already accepted" });
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
        return response.status(400).json({ error: "No valid bids to accept" });
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
        });

      if (settlementError) {
        return response.status(400).json({ error: settlementError.message });
      }

      // Update auction status
      const { data: updatedAuction, error: updateError } = await supabase
        .from("auctions")
        .update({ status: "SOLD" })
        .eq("id", auctionId)
        .select();

      if (updateError) {
        return response.status(400).json({ error: updateError.message });
      }

      return response.json({
        message: "Bid accepted successfully",
        settlement: settlement?.[0],
        auction: updatedAuction?.[0],
      });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};

// POST /api/auctions/:auctionId/reject-bid - Reject highest bid (seller only)
export const rejectBid = (supabase) => {
  return async (request, response) => {
    try {
      const userId = request.userId;
      const { auctionId } = request.params;

      // Get auction
      const { data: auction, error: auctionError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auctionId)
        .single();

      if (auctionError) {
        return response.status(404).json({ error: "Auction not found" });
      }

      // Verify seller
      if (auction.seller_id !== userId) {
        return response
          .status(403)
          .json({ error: "Only seller can reject bids" });
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
          return response.status(400).json({ error: rejectError.message });
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
        return response.status(400).json({ error: updateError.message });
      }

      return response.json({
        message: "Bid rejected successfully",
        auction: updatedAuction?.[0],
      });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  };
};
