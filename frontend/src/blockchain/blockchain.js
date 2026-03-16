import { ethers } from "ethers";
import artifact from "./PredictionRecord.json";

// Contract ABI from Hardhat artifact
const ABI = artifact.abi;

// Deployed contract address on Sepolia testnet
const CONTRACT_ADDRESS = "0x011c3f24343bC0A65F9064653A906b16D587b22f";

// Sepolia chain ID as BigInt (required by ethers v6)
const SEPOLIA_CHAIN_ID = 11155111n;

/**
 * Switches the connected wallet to the Sepolia testnet.
 * Adds the network if it's not already in MetaMask.
 */
export const switchToSepolia = async () => {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xaa36a7" }], // 11155111 in hex
  }).catch(async (switchError) => {
    // Error code 4902: chain not added to wallet yet
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0xaa36a7",
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.infura.io/v3/"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  });
};

/**
 * Connects to the user's MetaMask wallet.
 * Validates that MetaMask is installed and the correct network is active.
 * @returns {{ provider, signer, address }} ethers objects for interacting with the chain
 */
export const connectWallet = async () => {
  // 1. Check MetaMask is installed
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it to continue.");
  }

  // 2. Request wallet connection (triggers MetaMask popup)
  await window.ethereum.request({ method: "eth_requestAccounts" });

  // 3. Create ethers v6 BrowserProvider wrapping MetaMask
  const provider = new ethers.BrowserProvider(window.ethereum);

  // 4. Check current network matches Sepolia
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    // Auto-switch to Sepolia
    await switchToSepolia();
    // Re-create provider after network switch
    const updatedProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await updatedProvider.getSigner();
    const address = await signer.getAddress();
    return { provider: updatedProvider, signer, address };
  }

  // 5. Get the signer (account that will sign transactions)
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
};

/**
 * Silently checks if the wallet is already connected (no MetaMask popup).
 * Use this on component mount to restore connection without prompting the user.
 * @returns {{ provider, signer, address } | null}
 */
export const getConnectedWallet = async () => {
  if (!window.ethereum) return null;

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (accounts.length === 0) return null;

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) return null;

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
};

/**
 * Returns an ethers Contract instance connected to the given signer.
 * Use this to call both read and write contract methods.
 * @param {ethers.Signer} signer - Wallet signer from connectWallet()
 * @returns {ethers.Contract}
 */
export const getContract = (signer) => {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
};

/**
 * Returns a read-only Contract instance using a JsonRpcProvider.
 * Useful for fetching data without requiring wallet connection.
 * @param {ethers.Provider} provider
 * @returns {ethers.Contract}
 */
export const getReadOnlyContract = (provider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
};
