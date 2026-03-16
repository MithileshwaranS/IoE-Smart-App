import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MarketplaceCard from "../components/MarketplaceCard";
import toast from "react-hot-toast";
import { Edit2, Trash2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { getApiBaseUrl } from "../utils/apiConfig";

const Marketplace = () => {
  const { user, getToken, logout } = useAuth();
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    cropName: "",
    pricePerUnit: "",
    quantity: "",
    unit: "kg",
    description: "",
  });

  const API_URL = getApiBaseUrl();

  // Fetch all listings
  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/marketplace/listings`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setListings(data.listings || []);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  // Fetch farmer's listings
  const fetchMyListings = async () => {
    if (user?.role !== "farmer" || !getToken()) return;

    try {
      const response = await fetch(`${API_URL}/api/marketplace/my-listings`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setMyListings(data.listings || []);
    } catch (error) {
      console.error("Failed to fetch my listings:", error);
      toast.error("Failed to load your listings");
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (user?.role === "farmer") {
      fetchMyListings();
    }
  }, [user, getToken()]);

  const resetForm = () => {
    setFormData({
      cropName: "",
      pricePerUnit: "",
      quantity: "",
      unit: "kg",
      description: "",
    });
    setEditingId(null);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();

    if (!formData.cropName.trim()) {
      toast.error("Please enter crop name");
      return;
    }
    if (!formData.pricePerUnit || formData.pricePerUnit <= 0) {
      toast.error("Please enter valid price");
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/marketplace/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          cropName: formData.cropName,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          quantity: parseInt(formData.quantity),
          unit: formData.unit,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setMyListings((prev) => [data.listing, ...prev]);
      setListings((prev) => [data.listing, ...prev]);
      resetForm();
      setShowCreateForm(false);
      toast.success("Listing created successfully!");
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast.error(error.message || "Failed to create listing");
    }
  };

  const handleEditListing = async (e) => {
    e.preventDefault();

    if (!formData.cropName.trim()) {
      toast.error("Please enter crop name");
      return;
    }
    if (!formData.pricePerUnit || formData.pricePerUnit <= 0) {
      toast.error("Please enter valid price");
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/listings/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            cropName: formData.cropName,
            pricePerUnit: parseFloat(formData.pricePerUnit),
            quantity: parseInt(formData.quantity),
            unit: formData.unit,
            description: formData.description,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Update local state
      setMyListings((prev) =>
        prev.map((item) => (item.id === editingId ? data.listing : item)),
      );
      setListings((prev) =>
        prev.map((item) => (item.id === editingId ? data.listing : item)),
      );

      resetForm();
      setShowCreateForm(false);
      toast.success("Listing updated successfully!");
    } catch (error) {
      console.error("Failed to update listing:", error);
      toast.error(error.message || "Failed to update listing");
    }
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?"))
      return;

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/listings/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setMyListings((prev) => prev.filter((item) => item.id !== id));
      setListings((prev) => prev.filter((item) => item.id !== id));
      toast.success("Listing deleted successfully!");
    } catch (error) {
      console.error("Failed to delete listing:", error);
      toast.error(error.message || "Failed to delete listing");
    }
  };

  const startEdit = (listing) => {
    setFormData({
      cropName: listing.crop_name,
      pricePerUnit: listing.price_per_unit.toString(),
      quantity: listing.quantity.toString(),
      unit: listing.unit,
      description: listing.description || "",
    });
    setEditingId(listing.id);
    setShowCreateForm(true);
  };

  const filteredListings = listings.filter((l) => l.farmer_id !== user?.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 sm:p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">🌾 Agricultural Marketplace</h1>
        <p className="text-green-100 text-base">
          Buy and sell fresh crops directly from farmers
        </p>
      </div>

      {/* Create/Edit Listing Form - Farmer Only */}
      {user?.role === "farmer" && (
        <>
          {!showCreateForm && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg"
            >
              <Plus size={20} /> Create New Listing
            </motion.button>
          )}

          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100"
            >
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {editingId ? "Edit Listing" : "Create New Listing"}
              </h2>
              <form
                onSubmit={editingId ? handleEditListing : handleCreateListing}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={formData.cropName}
                    onChange={(e) =>
                      setFormData({ ...formData, cropName: e.target.value })
                    }
                    placeholder="Crop Name (e.g., Rice, Wheat, Corn)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, pricePerUnit: e.target.value })
                    }
                    placeholder="Price per Unit (₹)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="Total Quantity"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="quintal">Quintal</option>
                    <option value="ton">Metric Ton</option>
                    <option value="bags">Bags</option>
                    <option value="units">Units</option>
                  </select>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description (optional)"
                  rows="2"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-semibold transition"
                  >
                    {editingId ? "Update Listing" : "Create Listing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </>
      )}

      {/* My Listings Section - Farmer Only */}
      {user?.role === "farmer" && myListings.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            📋 My Listings ({myListings.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                  <h3 className="text-lg font-bold text-white">
                    {listing.crop_name}
                  </h3>
                </div>

                {/* Content */}
                <div className="p-4">
                  {listing.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {listing.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-gray-600 text-xs font-semibold">
                        Price
                      </p>
                      <p className="text-green-600 font-bold text-lg">
                        ₹{listing.price_per_unit.toFixed(2)}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        listing.quantity > 0 ? "bg-blue-50" : "bg-red-50"
                      }`}
                    >
                      <p className="text-gray-600 text-xs font-semibold">
                        Stock
                      </p>
                      <p
                        className={`font-bold text-lg ${
                          listing.quantity > 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        {listing.quantity}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs mb-4">
                    Status:{" "}
                    <span
                      className={
                        listing.status === "available"
                          ? "text-green-600 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {listing.status.toUpperCase()}
                    </span>
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(listing)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold transition"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteListing(listing.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Browse Listings Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          🏪 Available Listings ({filteredListings.length})
        </h2>
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <p className="text-gray-600 text-lg">Loading listings...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <p className="text-gray-600 text-lg">
              No listings available at the moment
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <MarketplaceCard
                  listing={listing}
                  onPurchase={async (quantity) => {
                    try {
                      const response = await fetch(
                        `${API_URL}/api/marketplace/purchase`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${getToken()}`,
                          },
                          body: JSON.stringify({
                            listingId: listing.id,
                            quantity: parseInt(quantity),
                          }),
                        },
                      );

                      const data = await response.json();

                      if (!response.ok) throw new Error(data.error);

                      // Update listings with new quantity
                      const updatedListing = data.listing;
                      setListings((prev) =>
                        prev.map((item) =>
                          item.id === listing.id ? updatedListing : item,
                        ),
                      );

                      // Remove if sold out
                      if (updatedListing.status === "sold_out") {
                        setListings((prev) =>
                          prev.filter((item) => item.id !== listing.id),
                        );
                      }

                      toast.success(
                        `Purchased ${quantity} ${listing.unit} of ${listing.crop_name}!`,
                      );
                    } catch (error) {
                      console.error("Purchase error:", error);
                      toast.error(
                        error.message || "Failed to complete purchase",
                      );
                    }
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Marketplace;
