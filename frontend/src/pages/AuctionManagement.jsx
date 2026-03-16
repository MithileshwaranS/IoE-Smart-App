import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { getApiBaseUrl } from "../utils/apiConfig";
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
} from "lucide-react";

const AuctionManagement = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [formData, setFormData] = useState({
    cropName: "",
    cropVariety: "",
    cropImageUrl: "",
    description: "",
    quantity: "",
    unit: "kg",
    basePrice: "",
    durationHours: "24",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "farmer") {
      toast.error("Only farmers can create auctions");
      navigate("/");
      return;
    }

    fetchMyAuctions();
  }, [user, navigate]);

  const fetchMyAuctions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/auctions/user/my-auctions`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      if (response.status === 401 || response.status === 403) {
        logout();
        navigate("/login");
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch auctions");

      const data = await response.json();
      setAuctions(data.auctions || []);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      toast.error("Failed to load your auctions");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAuction = async (e) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.cropName ||
      !formData.basePrice ||
      !formData.quantity ||
      !formData.durationHours
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auctions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...formData,
          basePrice: parseFloat(formData.basePrice),
          quantity: parseFloat(formData.quantity),
          durationHours: parseInt(formData.durationHours),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to create auction");
        return;
      }

      toast.success("Auction created successfully!");
      setFormData({
        cropName: "",
        cropVariety: "",
        cropImageUrl: "",
        description: "",
        quantity: "",
        unit: "kg",
        basePrice: "",
        durationHours: "24",
      });
      setShowCreateForm(false);
      fetchMyAuctions();
    } catch (error) {
      console.error("Error creating auction:", error);
      toast.error("Failed to create auction");
    }
  };

  const handleDeleteAuction = async (auctionId) => {
    if (!window.confirm("Are you sure you want to cancel this auction?")) {
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/auctions/${auctionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to cancel auction");
        return;
      }

      toast.success("Auction cancelled");
      fetchMyAuctions();
    } catch (error) {
      console.error("Error cancelling auction:", error);
      toast.error("Failed to cancel auction");
    }
  };

  const handleAcceptBid = async (auctionId) => {
    if (
      !window.confirm(
        "Are you sure you want to accept the highest bid for this auction?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/auctions/${auctionId}/accept-bid`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to accept bid");
        return;
      }

      toast.success("Bid accepted successfully!");
      fetchMyAuctions();
    } catch (error) {
      console.error("Error accepting bid:", error);
      toast.error("Failed to accept bid");
    }
  };

  const getTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime.endsWith('Z') ? endTime : endTime + 'Z');
    const diff = end - now;

    if (diff <= 0) return "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const AuctionRow = ({ auction }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-green-500"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Crop Info */}
        <div>
          <p className="text-xs text-gray-500 mb-1">CROP</p>
          <h4 className="font-bold text-gray-800">{auction.crop_name}</h4>
          {auction.crop_variety && (
            <p className="text-xs text-gray-500">{auction.crop_variety}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            {auction.quantity} {auction.unit}
          </p>
        </div>

        {/* Pricing Info */}
        <div>
          <p className="text-xs text-gray-500 mb-1">PRICING</p>
          <p className="font-bold text-gray-800">₹{auction.current_price}</p>
          <p className="text-xs text-gray-500">Base: ₹{auction.base_price}</p>
        </div>

        {/* Status & Time */}
        <div>
          <p className="text-xs text-gray-500 mb-1">STATUS</p>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                auction.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : auction.status === "ENDED"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {auction.status}
            </span>
          </div>
          {auction.status === "ACTIVE" && (
            <p className="text-xs text-orange-600 font-semibold mt-2">
              ⏱️ {getTimeRemaining(auction.end_time)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end items-start pt-4">
          <button
            onClick={() => navigate(`/auction/${auction.id}`)}
            className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
            title="View Details"
          >
            <Eye className="w-5 h-5" />
          </button>

          {auction.status === "ENDED" && auction.highest_bidder_id && (
            <button
              onClick={() => handleAcceptBid(auction.id)}
              className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 transition"
              title="Accept Bid"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}

          {auction.status === "ACTIVE" && (
            <button
              onClick={() => handleDeleteAuction(auction.id)}
              className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
              title="Cancel Auction"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                🌾 My Auctions
              </h1>
              <p className="text-gray-600">Manage your crop auctions</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create Auction
            </button>
          </div>
        </motion.div>

        {/* Create Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Create New Auction
            </h2>

            <form onSubmit={handleCreateAuction} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Crop Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Crop Name *
                  </label>
                  <input
                    type="text"
                    name="cropName"
                    placeholder="e.g., Wheat, Rice, Cotton"
                    value={formData.cropName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    required
                  />
                </div>

                {/* Crop Variety */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Crop Variety
                  </label>
                  <input
                    type="text"
                    name="cropVariety"
                    placeholder="e.g., Basmati, Jasmine"
                    value={formData.cropVariety}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="quantity"
                      placeholder="Amount"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      step="0.01"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      required
                    />
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    >
                      <option>kg</option>
                      <option>tonnes</option>
                      <option>bags</option>
                      <option>liters</option>
                    </select>
                  </div>
                </div>

                {/* Base Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    name="basePrice"
                    placeholder="Starting price"
                    value={formData.basePrice}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    required
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Auction Duration (hours) *
                  </label>
                  <select
                    name="durationHours"
                    value={formData.durationHours}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    required
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours</option>
                    <option value="48">48 hours</option>
                    <option value="72">72 hours</option>
                  </select>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    name="cropImageUrl"
                    placeholder="https://..."
                    value={formData.cropImageUrl}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Describe the crop quality, origin, certification, etc."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Create Auction
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Auctions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 mt-4">Loading your auctions...</p>
          </div>
        ) : auctions.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Your Auctions ({auctions.length})
            </h2>
            {auctions.map((auction) => (
              <AuctionRow key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-xl"
          >
            <div className="text-4xl mb-3">🌾</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Auctions Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start by creating your first auction to reach buyers!
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create First Auction
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AuctionManagement;
