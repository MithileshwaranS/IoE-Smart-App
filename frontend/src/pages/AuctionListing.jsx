import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { getApiBaseUrl } from "../utils/apiConfig";
import {
  Search,
  Filter,
  TrendingUp,
  Clock,
  MapPin,
  Eye,
  Heart,
  Share2,
} from "lucide-react";

const AuctionListing = () => {
  const [auctions, setAuctions] = useState([]);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("end_time");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const { user } = useAuth();

  useEffect(() => {
    fetchAuctions();
  }, [filterStatus, sortBy]);

  useEffect(() => {
    filterAuctions();
  }, [searchTerm, auctions]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/auctions?status=${filterStatus}&sortBy=${sortBy}`,
      );

      if (!response.ok) throw new Error("Failed to fetch auctions");

      const data = await response.json();
      setAuctions(data.auctions || []);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      toast.error("Failed to load auctions");
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAuctions = () => {
    let filtered = auctions;

    if (searchTerm) {
      filtered = filtered.filter(
        (auction) =>
          auction.crop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          auction.crop_variety
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          auction.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredAuctions(filtered);
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

  const AuctionCard = ({ auction }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
    >
      {/* Crop Image */}
      <div className="relative h-48 bg-gradient-to-br from-green-100 to-blue-100 overflow-hidden">
        {auction.crop_image_url ? (
          <img
            src={auction.crop_image_url}
            alt={auction.crop_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-400 text-4xl">🌾</span>
          </div>
        )}
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
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

      {/* Content */}
      <div className="p-4">
        {/* Crop Title */}
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          {auction.crop_name}
        </h3>
        {auction.crop_variety && (
          <p className="text-xs text-gray-500 mb-3">{auction.crop_variety}</p>
        )}

        {/* Description */}
        {auction.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {auction.description}
          </p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-500 text-xs">Quantity</p>
            <p className="font-semibold text-gray-800">
              {auction.quantity} {auction.unit}
            </p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-500 text-xs">Base Price</p>
            <p className="font-semibold text-gray-800">₹{auction.base_price}</p>
          </div>
        </div>

        {/* Current Bid */}
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-gray-600 mb-1">Current Bid</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{auction.current_price}
          </p>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center mb-4 text-sm">
          <Clock className="w-4 h-4 mr-2 text-orange-500" />
          <span className="font-semibold text-orange-600">
            {getTimeRemaining(auction.end_time)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            to={`/auction/${auction.id}`}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition text-center"
          >
            View & Bid
          </Link>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Heart className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🌾 Crop Auctions Marketplace
          </h1>
          <p className="text-gray-600">
            Real-time bidding on fresh farm produce from local farmers
          </p>
        </motion.div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search crops, varieties, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
            />
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
            >
              <option value="end_time">Ending Soon</option>
              <option value="price">Price: Low to High</option>
              <option value="created_at">Newest</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-3 mb-8">
          {["ACTIVE", "ENDED", "SOLD"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-2 rounded-full font-semibold transition ${
                filterStatus === status
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-green-500"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Auctions Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 mt-4">Loading auctions...</p>
          </div>
        ) : filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
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
              No Auctions Found
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? "Try adjusting your search filters"
                : "Check back soon for new auctions!"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AuctionListing;
