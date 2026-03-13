import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CHAIN_ID } from "../config";
import ABI from "../contract-abi.json";

export default function Register() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    
    if (!name.trim()) {
      setStatus({ type: "error", msg: "Name is required." });
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: "info", msg: "Connecting wallet..." });

      // Check if browser has an Ethereum provider (UP Browser Extension or MetaMask)
      if (!window.ethereum) {
        setStatus({
          type: "error",
          msg: "No wallet detected. Install the LUKSO UP Browser Extension or MetaMask.",
        });
        setLoading(false);
        return;
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Switch to LUKSO mainnet
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError) {
        // If LUKSO not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: "LUKSO Mainnet",
              nativeCurrency: { name: "LYX", symbol: "LYX", decimals: 18 },
              rpcUrls: ["https://rpc.mainnet.lukso.network"],
              blockExplorerUrls: ["https://explorer.execution.mainnet.lukso.network"],
            }],
          });
        }
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      setStatus({ type: "info", msg: "Sending registration transaction..." });

      const tx = await contract.register(name, description, metadataURI || "");
      setTxHash(tx.hash);
      setStatus({ type: "info", msg: "Waiting for confirmation..." });

      await tx.wait();
      setStatus({
        type: "success",
        msg: `Successfully registered "${name}" as an agent!`,
      });
    } catch (err) {
      console.error("Registration failed:", err);
      let msg = err.message;
      if (msg.includes("AlreadyRegistered")) {
        msg = "This address is already registered as an agent.";
      } else if (msg.includes("user rejected")) {
        msg = "Transaction rejected by user.";
      }
      setStatus({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Register Agent</h1>
      <p className="text-gray-400 mb-8">
        Register your AI agent on-chain. Your connected wallet address becomes the agent identity.
      </p>

      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Agent Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My AI Agent"
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do?"
            rows={4}
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Metadata URI (optional)
          </label>
          <input
            type="text"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            placeholder="ipfs://... or https://..."
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "Processing..." : "Register Agent On-Chain"}
        </button>
      </form>

      {status && (
        <div className={`mt-6 p-4 rounded-lg border ${
          status.type === "error"
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : status.type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
        }`}>
          <p>{status.msg}</p>
          {txHash && (
            <a
              href={`https://explorer.execution.mainnet.lukso.network/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-lukso-purple hover:text-lukso-pink mt-2 inline-block"
            >
              View transaction →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
