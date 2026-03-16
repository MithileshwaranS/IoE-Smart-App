import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { getApiBaseUrl, getWebSocketUrl } from "../utils/apiConfig";
import {
  Clock,
  TrendingUp,
  User,
  MessageCircle,
  Share2,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

const AuctionDetails = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [ws, setWs] = useState(null);
  const [liveBidders, setLiveBidders] = useState(0);

  const wsRef = useRef(null);

  useEffect(() => {
    fetchAuctionDetails();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [auctionId]);

  useEffect(() => {
    const timer = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  const fetchAuctionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/auctions/${auctionId}`,
      );

      if (!response.ok) {
        toast.error("Auction not found");
        navigate("/auction-listing");
        return;
      }

      const data = await response.json();
      setAuction(data.auction);
      setBids(data.bids || []);
    } catch (error) {
      console.error("Error fetching auction:", error);
      toast.error("Failed to load auction details");
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        console.log("WebSocket connected");
        // Subscribe to auction updates
        if (user?.token) {
          ws.send(
            JSON.stringify({
              type: "SUBSCRIBE",
              auctionId,
              token: user.token,
            }),
          );
        }
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
    }
  };

  const handleWebSocketMessage = (message) => {
    if (message.type === "BID_PLACED") {
      // Update bid in real-time
      const newBid = {
        id: Date.now().toString(),
        bid_amount: message.bidAmount,
        bidder_id: message.bidderId,
        bid_time: message.timestamp,
        status: "ACTIVE",
      };
      setBids((prev) => [newBid, ...prev]);

      // Update auction current price
      setAuction((prev) => ({
        ...prev,
        current_price: message.bidAmount,
        highest_bidder_id: message.bidderId,
      }));

      toast.success(`New bid: ₹${message.bidAmount}`);
    } else if (message.type === "BIDDER_JOINED") {
      setLiveBidders((prev) => prev + 1);
    } else if (message.type === "AUCTION_ENDED") {
      toast.info("Auction has ended");
      setAuction((prev) => ({ ...prev, status: "ENDED" }));
    } else if (message.type === "AUCTION_SOLD") {
      toast.success("Auction sold!");
      setAuction((prev) => ({ ...prev, status: "SOLD" }));
    }
  };

  const updateTimeRemaining = () => {
    if (!auction) return;

    const now = new Date();
    const end = new Date(auction.end_time.endsWith('Z') ? auction.end_time : auction.end_time + 'Z');
    const diff = end - now;

    if (diff <= 0) {
      setTimeRemaining("Auction Ended");
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to place a bid");
      navigate("/login");
      return;
    }

    if (user.id === auction.seller_id) {
      toast.error("You cannot bid on your own auction");
      return;
    }

    const bidValue = parseFloat(bidAmount);
    if (!bidAmount || bidValue <= auction.current_price) {
      toast.error(`Bid must be higher than ₹${auction.current_price}`);
      return;
    }

    setPlacing(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          auctionId,
          bidAmount: bidValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to place bid");
        return;
      }

      const data = await response.json();
      toast.success("Bid placed successfully!");
      setBidAmount("");

      // Broadcast bid via WebSocket
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(
          JSON.stringify({
            type: "BID_PLACED",
            auctionId,
            bidAmount: bidValue,
            token: user.token,
          }),
        );
      }
    } catch (error) {
      console.error("Error placing bid:", error);
      toast.error("Failed to place bid");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading auction details...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Auction not found</p>
          <button
            onClick={() => navigate("/auction-listing")}
            className="bg-green-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Auctions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate("/auction-listing")}
          className="flex items-center gap-2 text-green-600 mb-6 hover:text-green-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Auctions
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Auction Details */}
          <div className="lg:col-span-2">
            {/* Crop Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden mb-6"
            >
              <div className="relative h-96 bg-gradient-to-br from-green-100 to-blue-100">
                {auction.crop_image_url ? (
                  <img
                    src={auction.crop_image_url}
                    alt={auction.crop_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-6xl">🌾</span>
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      auction.status === "ACTIVE"
                        ? "bg-green-500 text-white"
                        : auction.status === "ENDED"
                          ? "bg-gray-500 text-white"
                          : "bg-blue-500 text-white"
                    }`}
                  >
                    {auction.status}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {auction.crop_name}
                </h1>
                {auction.crop_variety && (
                  <p className="text-lg text-gray-600 mb-4">
                    Variety: {auction.crop_variety}
                  </p>
                )}

                {auction.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Description
                    </h3>
                    <p className="text-gray-600">{auction.description}</p>
                  </div>
                )}

                {/* Specifications */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quantity</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {auction.quantity} {auction.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Base Price</p>
                    <p className="text-lg font-semibold text-gray-800">
                      ₹{auction.base_price}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bid History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Bid History ({bids.length})
              </h3>

              {bids.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bids.map((bid, index) => (
                    <motion.div
                      key={bid.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          ₹{bid.bid_amount}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(bid.bid_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {index === 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                            Highest
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No bids yet. Be the first to bid!
                </p>
              )}
            </motion.div>
          </div>

          {/* Right: Bidding Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            {/* Current Bid */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <p className="text-xs text-gray-500 mb-2">CURRENT BID</p>
              <div className="text-4xl font-bold text-green-600 mb-4">
                ₹{auction.current_price}
              </div>

              {/* Time Remaining */}
              <div className="bg-orange-50 p-4 rounded-lg mb-6 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <p className="text-sm font-semibold text-orange-600">
                    Time Remaining
                  </p>
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {timeRemaining}
                </p>
              </div>

              {/* Live Bidders */}
              <div className="flex items-center gap-2 text-sm mb-4">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span className="text-gray-600">
                  {liveBidders} live bidder{liveBidders !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Bidding Form */}
            {auction.status === "ACTIVE" && (
              <motion.form
                onSubmit={handlePlaceBid}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 mb-6 border border-green-200"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Place Your Bid
                </h3>

                {!user ? (
                  <p className="text-sm text-gray-600 mb-4">
                    Please login to place a bid
                  </p>
                ) : user.id === auction.seller_id ? (
                  <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                    You cannot bid on your own auction
                  </p>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bid Amount (minimum ₹{auction.current_price + 1})
                      </label>
                      <input
                        type="number"
                        placeholder={`Min: ₹${auction.current_price + 1}`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={auction.current_price + 1}
                        step="0.01"
                        className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        disabled={placing}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={placing || !bidAmount}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {placing ? "Placing Bid..." : "Place Bid"}
                    </button>
                  </>
                )}
              </motion.form>
            )}

            {auction.status !== "ACTIVE" && (
              <div className="bg-gray-100 rounded-xl p-6 mb-6 text-center">
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  Auction {auction.status.toLowerCase()}
                </p>
                <p className="text-sm text-gray-600">
                  {auction.status === "SOLD"
                    ? "Congratulations to the winning bidder!"
                    : "No more bids accepted"}
                </p>
              </div>
            )}

            {/* Seller Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">Seller Details</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xl">
                  👨‍🌾
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    Farmer ID: {auction.seller_id.substring(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">Verified Farmer</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetails;
