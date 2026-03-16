import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getContract } from "../blockchain/blockchain";
import WalletConnect from "../components/WalletConnect";
import SalesList from "../components/SalesList";
import CreateSale from "../components/CreateSale";
import PlaceBid from "../components/PlaceBid";
import ConfirmSale from "../components/ConfirmSale";
import { Link2, Info } from "lucide-react";

/**
 * BlockchainSales is the main page for all on-chain interactions with the
 * PredictionRecord smart contract deployed on Sepolia.
 *
 * Flow:
 *  1. User connects MetaMask wallet via WalletConnect
 *  2. SalesList reads all sales from the contract (no gas required)
 *  3. Role-based write actions appear below the list:
 *       - Farmer → CreateSale + ConfirmSale
 *       - Buyer  → PlaceBid
 *  4. After any write transaction confirms, refreshTrigger increments
 *     which causes SalesList to re-fetch updated data from the chain
 */
const BlockchainSales = () => {
  const { user } = useAuth();

  // Wallet state — populated by WalletConnect after successful connection
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  // Incremented after each successful write to trigger SalesList re-fetch
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Derive contract instance whenever signer changes
  const contract = useMemo(() => {
    if (!signer) return null;
    return getContract(signer);
  }, [signer]);

  // Called by WalletConnect on successful connection
  const handleWalletConnect = ({ signer: newSigner, address }) => {
    setSigner(newSigner);
    setWalletAddress(address);
  };

  // Called by WalletConnect on disconnect
  const handleWalletDisconnect = () => {
    setSigner(null);
    setWalletAddress(null);
  };

  // Called by each write component after tx confirmation
  const handleTransactionSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Page header ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Link2 className="w-8 h-8" />
              On-Chain Sales
            </h1>
            <p className="text-indigo-200 mt-1 text-sm">
              Transparent crop auctions on the Sepolia blockchain
            </p>
            <p className="text-indigo-300 text-xs mt-1 font-mono">
              Contract: 0x011c3f24...587b22f
            </p>
          </div>

          {/* Wallet connection widget */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[220px]">
            <p className="text-indigo-200 text-xs font-semibold mb-2 uppercase tracking-wide">
              Wallet
            </p>
            <WalletConnect
              onConnect={handleWalletConnect}
              onDisconnect={handleWalletDisconnect}
            />
          </div>
        </div>
      </div>

      {/* ── Info banner when wallet not connected ── */}
      {!signer && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-blue-700 text-sm">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>
            Connect your MetaMask wallet to interact with the smart contract.
            Make sure you have Sepolia testnet ETH for transaction fees.
          </p>
        </div>
      )}

      {/* ── Sales list (read-only, always shows once wallet connected) ── */}
      <SalesList contract={contract} refreshTrigger={refreshTrigger} />

      {/* ── Write actions — only visible when wallet is connected ── */}
      {contract && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Actions
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── FARMER actions ── */}
          {user?.role === "farmer" && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-green-700 text-xs font-semibold uppercase tracking-wide">
                Farmer Actions
              </div>

              <CreateSale
                contract={contract}
                onSuccess={handleTransactionSuccess}
              />

              <ConfirmSale
                contract={contract}
                onSuccess={handleTransactionSuccess}
              />
            </div>
          )}

          {/* ── BUYER actions ── */}
          {user?.role === "buyer" && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                Buyer Actions
              </div>

              <PlaceBid
                contract={contract}
                onSuccess={handleTransactionSuccess}
              />
            </div>
          )}

          {/* ── Fallback if role is unknown ── */}
          {user?.role !== "farmer" && user?.role !== "buyer" && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
              No actions available for your account role.
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default BlockchainSales;
