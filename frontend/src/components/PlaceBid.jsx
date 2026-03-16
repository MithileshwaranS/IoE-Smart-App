import React, { useState } from "react";
import { Gavel, ExternalLink, Loader, CheckCircle, XCircle } from "lucide-react";

/**
 * PlaceBid lets a buyer submit a bid on an existing on-chain sale.
 * Bid must exceed the current highest bid (enforced by the contract).
 * Calls contract.placeBid(saleId, bidAmount).
 */
const PlaceBid = ({ contract, onSuccess }) => {
  const [form, setForm] = useState({ saleId: "", bidAmount: "" });
  const [status, setStatus] = useState("idle"); // idle | pending | success | error
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Input validation ---
    if (form.saleId === "" || Number(form.saleId) < 0) {
      setErrorMsg("Please enter a valid Sale ID (0 or greater).");
      setStatus("error");
      return;
    }
    if (!form.bidAmount || Number(form.bidAmount) <= 0) {
      setErrorMsg("Bid amount must be a positive number.");
      setStatus("error");
      return;
    }

    setStatus("pending");
    setTxHash(null);
    setErrorMsg("");

    try {
      // --- Send transaction to blockchain ---
      // saleId is array index (uint), bidAmount is uint256 — both passed as BigInt
      const tx = await contract.placeBid(
        BigInt(Math.round(Number(form.saleId))),
        BigInt(Math.round(Number(form.bidAmount)))
      );

      // --- Wait for on-chain confirmation ---
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus("success");

      // Reset form and notify parent to refresh list
      setForm({ saleId: "", bidAmount: "" });
      onSuccess();
    } catch (err) {
      console.error("placeBid failed:", err);

      // Surface contract revert reason (e.g., "Bid too low", "Sale already confirmed")
      const reason =
        err?.reason ||
        err?.data?.message ||
        err?.shortMessage ||
        err?.message ||
        "Transaction failed.";

      setErrorMsg(reason);
      setStatus("error");
    }
  };

  const resetStatus = () => {
    setStatus("idle");
    setTxHash(null);
    setErrorMsg("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Gavel className="w-5 h-5 text-blue-600" />
        Place a Bid
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale ID
            </label>
            <input
              type="number"
              name="saleId"
              value={form.saleId}
              onChange={handleChange}
              placeholder="e.g., 0"
              min="0"
              disabled={status === "pending"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              From the sales list above
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bid Amount (₹)
            </label>
            <input
              type="number"
              name="bidAmount"
              value={form.bidAmount}
              onChange={handleChange}
              placeholder="e.g., 2500"
              min="1"
              disabled={status === "pending"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Must exceed current highest bid
            </p>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === "pending"}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-semibold transition"
        >
          {status === "pending" ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Submitting bid...
            </>
          ) : (
            <>
              <Gavel className="w-4 h-4" />
              Place Bid
            </>
          )}
        </button>
      </form>

      {/* Pending state notice */}
      {status === "pending" && (
        <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>⏳ Bid submitted. Waiting for Sepolia confirmation...</span>
        </div>
      )}

      {/* Success state */}
      {status === "success" && txHash && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
            <CheckCircle className="w-4 h-4" />
            ✅ Bid placed successfully!
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-mono text-xs break-all"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-8)}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          <button
            onClick={resetStatus}
            className="ml-4 text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
            <XCircle className="w-4 h-4" />
            ❌ Transaction failed
          </div>
          <p className="text-red-600 text-xs">{errorMsg}</p>
          <button
            onClick={resetStatus}
            className="mt-1 text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default PlaceBid;
