import React, { useState, useEffect } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";

/**
 * SalesList fetches and displays all on-chain sales from the PredictionRecord contract.
 * Re-fetches whenever `refreshTrigger` changes (incremented after write transactions).
 */
const SalesList = ({ contract, refreshTrigger }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalSales, setTotalSales] = useState(0);

  // Truncate Ethereum address for display
  const truncateAddress = (addr) => {
    if (!addr || addr === "0x0000000000000000000000000000000000000000")
      return "—";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Fetch all sales from the contract
  const fetchSales = async () => {
    if (!contract) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Get total number of sales on-chain
      const total = await contract.getTotalSales();
      const count = Number(total); // Convert BigInt to JS number
      setTotalSales(count);

      if (count === 0) {
        setSales([]);
        return;
      }

      // 2. Fetch each sale by index
      const salePromises = [];
      for (let i = 0; i < count; i++) {
        salePromises.push(contract.getSale(i));
      }

      const rawSales = await Promise.all(salePromises);

      // 3. Map tuple return values to named objects
      // getSale returns: (batchId, quantity, basePrice, highestBid, farmer, highestBidder, confirmed)
      const mapped = rawSales.map((s, idx) => ({
        id: idx,
        batchId: s[0],
        quantity: Number(s[1]),
        basePrice: Number(s[2]),
        highestBid: Number(s[3]),
        farmer: s[4],
        highestBidder: s[5],
        confirmed: s[6],
      }));

      setSales(mapped);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
      setError("Failed to load sales from blockchain.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever contract is ready or a transaction completes
  useEffect(() => {
    fetchSales();
  }, [contract, refreshTrigger]);

  if (!contract) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
        Connect your wallet to view on-chain sales.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin text-green-500" />
          <span>Loading sales from blockchain...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-800">
          On-Chain Sales{" "}
          <span className="text-sm font-normal text-gray-500">
            ({totalSales} total)
          </span>
        </h3>
        <button
          onClick={fetchSales}
          className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Empty state */}
      {sales.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium">No on-chain sales yet.</p>
          <p className="text-sm mt-1 text-gray-400">
            Farmers can create the first sale below.
          </p>
        </div>
      ) : (
        /* Sales table — horizontally scrollable on mobile */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Batch ID</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Base Price</th>
                <th className="px-4 py-3 text-right">Highest Bid</th>
                <th className="px-4 py-3 text-left">Farmer</th>
                <th className="px-4 py-3 text-left">Highest Bidder</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-gray-500">
                    #{sale.id}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {sale.batchId || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {sale.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {sale.basePrice}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">
                    {sale.highestBid > 0 ? sale.highestBid : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    <a
                      href={`https://sepolia.etherscan.io/address/${sale.farmer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600 transition inline-flex items-center gap-1"
                    >
                      {truncateAddress(sale.farmer)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {sale.highestBidder &&
                    sale.highestBidder !==
                      "0x0000000000000000000000000000000000000000" ? (
                      <a
                        href={`https://sepolia.etherscan.io/address/${sale.highestBidder}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-indigo-600 transition inline-flex items-center gap-1"
                      >
                        {truncateAddress(sale.highestBidder)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sale.confirmed ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                        ✅ Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded-full">
                        ⏳ Open
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesList;
