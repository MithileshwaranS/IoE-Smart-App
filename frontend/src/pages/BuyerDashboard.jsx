import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Calendar,
  AlertCircle,
  Search,
  Download,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const BuyerDashboard = () => {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("all"); // 'all' | '30' | '90'

  const API_URL = "http://localhost:3001";

  // Redirect to marketplace if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/marketplace");
    }
  }, [user, navigate]);

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user || !getToken()) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/marketplace/transactions`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        setTransactions(data.transactions || []);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        toast.error("Failed to load purchase history");
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, getToken]);

  // Get user's transactions
  const userTransactions = transactions;

  // Calculate holdings (current inventory)
  const holdings = {};
  userTransactions.forEach((transaction) => {
    const key = `${transaction.crop_name}_${transaction.farmer_name}`;
    if (!holdings[key]) {
      holdings[key] = {
        cropName: transaction.crop_name,
        farmerName: transaction.farmer_name,
        unit: transaction.unit,
        totalQuantity: 0,
        totalSpent: 0,
        lastPurchased: transaction.created_at,
        transactions: [],
      };
    }
    holdings[key].totalQuantity += transaction.quantity;
    holdings[key].totalSpent += parseFloat(transaction.total_price);
    holdings[key].lastPurchased = transaction.created_at;
    holdings[key].transactions.push(transaction);
  });

  const holdingsArray = Object.values(holdings);

  // Summary stats
  const totalSpent = userTransactions.reduce(
    (sum, t) => sum + parseFloat(t.total_price || 0),
    0,
  );
  const totalQuantity = userTransactions.reduce(
    (sum, t) => sum + (t.quantity || 0),
    0,
  );
  const uniqueFarmers = new Set(userTransactions.map((t) => t.farmer_name))
    .size;

  // Date-range filter baseline
  const dateFiltered = React.useMemo(() => {
    if (dateRange === "all") return userTransactions;
    const days = dateRange === "30" ? 30 : 90;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return userTransactions.filter((t) => {
      const d = new Date(t.created_at);
      return d >= threshold;
    });
  }, [userTransactions, dateRange]);

  // Build crop filters with counts (respecting date filter)
  const countsByCrop = dateFiltered.reduce((acc, t) => {
    const key = t.crop_name || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const cropFilters = ["all", ...Object.keys(countsByCrop)];

  // Apply crop filter and search query
  const filteredTransactions = React.useMemo(() => {
    const base =
      filter === "all"
        ? dateFiltered
        : dateFiltered.filter((t) => t.crop_name === filter);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (t) =>
        (t.crop_name || "").toLowerCase().includes(q) ||
        (t.farmer_name || "").toLowerCase().includes(q),
    );
  }, [dateFiltered, filter, query]);

  // Export CSV helper
  const handleExportCSV = () => {
    if (!filteredTransactions.length) {
      toast.error("No transactions to export");
      return;
    }
    const headers = [
      "crop_name",
      "farmer_name",
      "quantity",
      "unit",
      "price_per_unit",
      "total_price",
      "created_at",
    ];
    const rows = filteredTransactions.map((t) => [
      t.crop_name,
      t.farmer_name,
      t.quantity,
      t.unit,
      t.price_per_unit,
      t.total_price,
      t.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6 sm:p-8 max-w-7xl mx-auto"
    >
      <div className="mb-8 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-1">
              📊 Purchase Dashboard
            </h1>
            <p className="text-green-100">Manage your purchases and holdings</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-2 bg-green-500/30 backdrop-blur rounded-full px-3 py-1 text-sm">
                <ShoppingBag size={16} /> ₹{totalSpent.toFixed(2)} spent
              </span>
              <span className="inline-flex items-center gap-2 bg-green-500/30 backdrop-blur rounded-full px-3 py-1 text-sm">
                <TrendingUp size={16} /> {userTransactions.length} purchases
              </span>
            </div>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
            {/* Date range chips */}

            {/* Export */}

            {/* Go to marketplace */}
            <button
              onClick={() => navigate("/marketplace")}
              className="inline-flex items-center justify-center gap-2 bg-green-500/40 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-500/60 transition"
            >
              Go to Marketplace <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Skeleton for summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse"
              >
                <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          {/* Skeleton for table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="divide-y">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-6 gap-4 p-4 animate-pulse"
                >
                  {[...Array(6)].map((__, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Spent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    Total Spent
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    ₹{totalSpent.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Total Quantity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    Total Quantity
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {totalQuantity.toFixed(1)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Purchases Count */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    Purchases
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {userTransactions.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Farmers Count */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    Farmers
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {uniqueFarmers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Holdings Section */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🏪 Your Holdings
            </h2>
            {holdingsArray.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No holdings yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Start purchasing from the marketplace to build your holdings
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {holdingsArray.map((holding, index) => (
                  <motion.div
                    key={`${holding.cropName}_${holding.farmerName}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          {holding.cropName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          From: {holding.farmerName}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-green-500" />
                    </div>

                    <div className="space-y-3 mb-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">
                          Total Quantity:
                        </span>
                        <span className="font-bold text-lg text-gray-800">
                          {holding.totalQuantity} {holding.unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">
                          Total Spent:
                        </span>
                        <span className="font-bold text-lg text-green-600">
                          ₹{holding.totalSpent.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">
                          Avg Price:
                        </span>
                        <span className="font-semibold text-gray-800">
                          ₹
                          {(holding.totalSpent / holding.totalQuantity).toFixed(
                            2,
                          )}
                          /{holding.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={14} />
                      Last purchased:{" "}
                      {new Date(holding.lastPurchased).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📋 Transaction History
            </h2>

            {userTransactions.length > 0 && (
              <div className="mb-4 flex flex-col gap-3">
                {/* View toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <div className="inline-flex rounded-lg overflow-hidden border border-gray-200">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`px-3 py-1.5 text-sm font-medium ${
                        viewMode === "table"
                          ? "bg-green-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode("cards")}
                      className={`px-3 py-1.5 text-sm font-medium ${
                        viewMode === "cards"
                          ? "bg-green-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cards
                    </button>
                  </div>
                </div>

                {/* Filters with counts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {cropFilters.map((crop) => (
                    <button
                      key={crop}
                      onClick={() => setFilter(crop)}
                      className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition ${
                        filter === crop
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {crop === "all"
                        ? `All (${userTransactions.length})`
                        : `${crop} (${countsByCrop[crop] || 0})`}
                    </button>
                  ))}
                  {filter !== "all" && (
                    <button
                      onClick={() => setFilter("all")}
                      className="px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredTransactions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No transactions found</p>
                <p className="text-gray-500 text-sm mt-2">
                  Your purchase history will appear here
                </p>
              </div>
            ) : viewMode === "table" ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Crop Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Farmer
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Quantity
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Price/Unit
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Total Price
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTransactions.map((transaction, index) => (
                        <motion.tr
                          key={transaction.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-gray-50 transition odd:bg-white even:bg-gray-50"
                        >
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-800">
                              {transaction.crop_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {transaction.farmer_name}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {transaction.quantity} {transaction.unit}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            ₹{parseFloat(transaction.price_per_unit).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-semibold text-green-600">
                            ₹{parseFloat(transaction.total_price).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(
                              transaction.created_at,
                            ).toLocaleDateString()}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Cards view
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTransactions.map((t, index) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {t.crop_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Farmer: {t.farmer_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm font-medium text-gray-700">
                          {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {t.quantity} {t.unit}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Price/Unit</p>
                        <p className="text-sm font-semibold text-gray-800">
                          ₹{parseFloat(t.price_per_unit).toFixed(2)}
                        </p>
                      </div>
                      <div className="col-span-2 bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-700">Total</p>
                        <p className="text-base font-bold text-green-700">
                          ₹{parseFloat(t.total_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default BuyerDashboard;
