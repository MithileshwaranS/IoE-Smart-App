import React, { useState, useEffect } from "react";
import { connectWallet, getConnectedWallet } from "../blockchain/blockchain";
import { Wallet, AlertCircle, CheckCircle, Loader } from "lucide-react";

/**
 * WalletConnect handles MetaMask detection, connection, and network validation.
 * Calls onConnect({ provider, signer, address }) when wallet is successfully linked.
 */
const WalletConnect = ({ onConnect, onDisconnect }) => {
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Truncate address for display: 0x1234...abcd
  const truncateAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  // Handle wallet connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const wallet = await connectWallet();
      setAddress(wallet.address);
      onConnect(wallet); // Bubble signer + provider up to parent page
    } catch (err) {
      // User rejected the connection request
      if (err.code === 4001) {
        setError("Connection rejected. Please approve the MetaMask request.");
      } else if (err.message?.includes("MetaMask is not installed")) {
        setError("MetaMask not detected. Please install the MetaMask extension.");
      } else {
        setError(err.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnect (clears local state only — MetaMask manages actual sessions)
  const handleDisconnect = () => {
    setAddress(null);
    setError(null);
    if (onDisconnect) onDisconnect();
  };

  // Auto-reconnect on mount if wallet is already authorized (no popup)
  useEffect(() => {
    getConnectedWallet().then((wallet) => {
      if (wallet) {
        setAddress(wallet.address);
        onConnect(wallet);
      }
    }).catch(() => {});
  }, []);

  // Listen for account changes in MetaMask
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        setAddress(accounts[0]);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Connected state */}
      {address ? (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl font-mono text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{truncateAddress(address)}</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-gray-500 hover:text-red-500 transition"
          >
            Disconnect
          </button>
        </div>
      ) : (
        /* Not connected state */
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-md"
        >
          {isConnecting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-md">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
