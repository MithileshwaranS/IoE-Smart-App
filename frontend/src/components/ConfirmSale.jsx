import React, { useState } from "react";
import { CheckCircle, ExternalLink, Loader, XCircle, ShieldCheck } from "lucide-react";

/**
 * ConfirmSale lets a farmer lock in the highest bid for one of their sales.
 * Only the farmer who created the sale can confirm it (enforced by the contract).
 * Calls contract.confirmSale(saleId).
 */
const ConfirmSale = ({ contract, onSuccess }) => {
  const [saleId, setSaleId] = useState("");
  const [status, setStatus] = useState("idle"); // idle | pending | success | error
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Input validation ---
    if (saleId === "" || Number(saleId) < 0) {
      setErrorMsg("Please enter a valid Sale ID (0 or greater).");
      setStatus("error");
      return;
    }

    setStatus("pending");
    setTxHash(null);
    setErrorMsg("");

    try {
      // --- Send transaction to blockchain ---
      // Only the farmer who created the sale can confirm; contract will revert otherwise
      const tx = await contract.confirmSale(
        BigInt(Math.round(Number(saleId)))
      );

      // --- Wait for on-chain confirmation ---
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus("success");

      // Reset field and notify parent to refresh the list
      setSaleId("");
      onSuccess();
    } catch (err) {
      console.error("confirmSale failed:", err);

      // Surface revert messages (e.g., "Only farmer can confirm", "Already confirmed")
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
      <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-purple-600" />
        Confirm Sale
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Accept the highest bid and finalise the sale on-chain. Only the farmer
        who created the sale can do this.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sale ID
          </label>
          <input
            type="number"
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
            placeholder="e.g., 0"
            min="0"
            disabled={status === "pending"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Must be a sale you created
          </p>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === "pending"}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-semibold transition"
        >
          {status === "pending" ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Confirming sale...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Confirm Sale
            </>
          )}
        </button>
      </form>

      {/* Pending state notice */}
      {status === "pending" && (
        <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>
            ⏳ Confirmation submitted. Waiting for Sepolia block...
          </span>
        </div>
      )}

      {/* Success state */}
      {status === "success" && txHash && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
            <CheckCircle className="w-4 h-4" />
            ✅ Sale confirmed on-chain!
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

export default ConfirmSale;
