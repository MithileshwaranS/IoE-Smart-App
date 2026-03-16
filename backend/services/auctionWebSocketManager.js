// WebSocket Manager for Real-time Auction Bidding
// Handles live bid updates, auction status changes, and client notifications

import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

class AuctionWebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.auctionRooms = new Map(); // Maps auction IDs to set of connected clients
    this.clientConnections = new Map(); // Maps client ws to user info
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on("connection", (ws) => {
      console.log("New WebSocket connection");

      // Handle incoming messages
      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error("WebSocket message error:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            }),
          );
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  async handleMessage(ws, message) {
    const { type, auctionId, token, bidAmount } = message;

    if (!token) {
      ws.send(
        JSON.stringify({ type: "error", message: "Authentication required" }),
      );
      return;
    }

    // Verify token and extract user info
    let userId;
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      );
      userId = decoded.sub || decoded.id;
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid authentication token",
        }),
      );
      return;
    }

    this.clientConnections.set(ws, { userId, auctionId });

    if (type === "SUBSCRIBE") {
      this.handleSubscribe(ws, auctionId, userId);
    } else if (type === "UNSUBSCRIBE") {
      this.handleUnsubscribe(ws, auctionId);
    } else if (type === "BID_PLACED") {
      this.handleBidPlaced(ws, auctionId, userId, bidAmount, message);
    } else if (type === "PING") {
      ws.send(JSON.stringify({ type: "PONG" }));
    }
  }

  handleSubscribe(ws, auctionId, userId) {
    // Create auction room if it doesn't exist
    if (!this.auctionRooms.has(auctionId)) {
      this.auctionRooms.set(auctionId, new Set());
    }

    // Add client to room
    this.auctionRooms.get(auctionId).add(ws);

    // Confirm subscription
    ws.send(
      JSON.stringify({
        type: "SUBSCRIBED",
        auctionId,
        message: `Subscribed to auction ${auctionId}`,
      }),
    );

    // Notify other clients
    this.broadcastToAuction(auctionId, {
      type: "BIDDER_JOINED",
      auctionId,
      message: "A bidder has joined the auction",
    });

    console.log(`User ${userId} subscribed to auction ${auctionId}`);
  }

  handleUnsubscribe(ws, auctionId) {
    if (this.auctionRooms.has(auctionId)) {
      this.auctionRooms.get(auctionId).delete(ws);

      // Clean up empty rooms
      if (this.auctionRooms.get(auctionId).size === 0) {
        this.auctionRooms.delete(auctionId);
      }
    }

    this.clientConnections.delete(ws);
  }

  handleBidPlaced(ws, auctionId, userId, bidAmount, fullMessage) {
    // Broadcast bid to all subscribers
    this.broadcastToAuction(auctionId, {
      type: "BID_PLACED",
      auctionId,
      bidderId: userId,
      bidAmount,
      timestamp: new Date().toISOString(),
      message: `New bid placed: ${bidAmount}`,
    });

    console.log(
      `Bid placed on auction ${auctionId}: ${bidAmount} by user ${userId}`,
    );
  }

  broadcastToAuction(auctionId, message) {
    if (!this.auctionRooms.has(auctionId)) {
      return;
    }

    const clients = this.auctionRooms.get(auctionId);
    const payload = JSON.stringify(message);

    clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(payload);
      }
    });
  }

  broadcastAuctionEnded(auctionId, auctionData) {
    this.broadcastToAuction(auctionId, {
      type: "AUCTION_ENDED",
      auctionId,
      auctionData,
      message: "Auction has ended",
      timestamp: new Date().toISOString(),
    });

    // Clean up room
    if (this.auctionRooms.has(auctionId)) {
      this.auctionRooms.delete(auctionId);
    }
  }

  broadcastAuctionSold(auctionId, auctionData) {
    this.broadcastToAuction(auctionId, {
      type: "AUCTION_SOLD",
      auctionId,
      auctionData,
      message: "Auction sold! Congratulations to the winning bidder",
      timestamp: new Date().toISOString(),
    });

    // Clean up room
    if (this.auctionRooms.has(auctionId)) {
      this.auctionRooms.delete(auctionId);
    }
  }

  handleDisconnect(ws) {
    const clientInfo = this.clientConnections.get(ws);
    if (clientInfo) {
      const { auctionId, userId } = clientInfo;
      this.handleUnsubscribe(ws, auctionId);
      console.log(`User ${userId} disconnected from auction ${auctionId}`);
    }
    this.clientConnections.delete(ws);
  }

  // Get connected bidders count for an auction
  getBiddersCount(auctionId) {
    return this.auctionRooms.has(auctionId)
      ? this.auctionRooms.get(auctionId).size
      : 0;
  }

  // Get all active auctions with bidders
  getActiveAuctions() {
    return Array.from(this.auctionRooms.keys());
  }
}

export default AuctionWebSocketManager;
