import React, { useState } from "react";
import { PlusCircle, ExternalLink, Loader, CheckCircle, XCircle } from "lucide-react";

/**
 * CreateSale lets a farmer publish a new crop sale to the blockchain.
 * Calls contract.createSale(batchId, quantity, basePrice).
 * Calls onSuccess() after confirmation so the parent can refresh the sales list.
 */
const CreateSale = ({ contract, onSuccess }) => {
  const [form, setForm] = useState({ batchId: "", quantity: "", basePrice: "" });
  const [status, setStatus] = useState("idle"); // idle | pending | success | error
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Input validation ---
    if (!form.batchId.trim()) {
      setErrorMsg("Batch ID is required.");
      setStatus("error");
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      setErrorMsg("Quantity must be a positive number.");
      setStatus("error");
      return;
    }
    if (!form.basePrice || Number(form.basePrice) <= 0) {
      setErrorMsg("Base price must be a positive number.");
      setStatus("error");
      return;
    }

    setStatus("pending");
    setTxHash(null);
    setErrorMsg("");

    try {
      // --- Send transaction to blockchain ---
      // uint256 params passed as BigInt (ethers v6 requirement)
      const tx = await contract.createSale(
        form.batchId.trim(),
        BigInt(Math.round(Number(form.quantity))),
        BigInt(Math.round(Number(form.basePrice)))
      );

      // --- Wait for on-chain confirmation ---
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus("success");

      // Reset form and notify parent to refresh list
      setForm({ batchId: "", quantity: "", basePrice: "" });
      onSuccess();
    } catch (err) {
      console.error("createSale failed:", err);

      // Parse revert reason if available
      const reason =
        err?.reason ||
        err?.data?.message ||
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
        <PlusCircle className="w-5 h-5 text-green-600" />
        Create New Sale
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch ID
            </label>
            <input
              type="text"
              name="batchId"
              value={form.batchId}
              onChange={handleChange}
              placeholder="e.g., WHEAT-001"
              disabled={status === "pending"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (kg)
            </label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              placeholder="e.g., 500"
              min="1"
              disabled={status === "pending"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Price (₹)
            </label>
            <input
              type="number"
              name="basePrice"
              value={form.basePrice}
              onChange={handleChange}
              placeholder="e.g., 2000"
              min="1"
              disabled={status === "pending"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === "pending"}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-semibold transition"
        >
          {status === "pending" ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Waiting for confirmation...
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              Create Sale
            </>
          )}
        </button>
      </form>

      {/* Pending state notice */}
      {status === "pending" && (
        <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>
            ⏳ Transaction submitted. Waiting for Sepolia confirmation...
          </span>
        </div>
      )}

      {/* Success state */}
      {status === "success" && txHash && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
            <CheckCircle className="w-4 h-4" />
            ✅ Sale created successfully!
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

export default CreateSale;
