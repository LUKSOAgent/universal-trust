import { useState } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS, CHAIN_ID, EXPLORER_URL } from "../config";

export default function Register() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [registeredAddress, setRegisteredAddress] = useState(null);

  function addToast(type, msg) {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }

  async function handleRegister(e) {
    e.preventDefault();
    
    if (!name.trim()) {
      setStatus({ type: "error", msg: "Name is required." });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      setTxHash(null);
      setRegisteredAddress(null);
      addToast("info", "Connecting wallet...");

      if (!window.ethereum) {
        setStatus({
          type: "error",
          msg: "No wallet detected. Install the LUKSO UP Browser Extension or MetaMask to register.",
        });
        setLoading(false);
        return;
      }

      const { ethers } = await import("ethers");
      const ABI = (await import("../contract-abi.json")).default;

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError) {
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
      const signerAddress = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      addToast("info", "Sending registration transaction...");
      setStatus({ type: "info", msg: "Sending registration transaction..." });

      const tx = await contract.register(name, description, metadataURI || "");
      setTxHash(tx.hash);
      addToast("info", "Transaction sent! Waiting for confirmation...");
      setStatus({ type: "info", msg: "Waiting for confirmation..." });

      await tx.wait();
      setRegisteredAddress(signerAddress);
      addToast("success", `"${name}" registered successfully!`);
      setStatus({
        type: "success",
        msg: `Successfully registered "${name}" as an agent!`,
      });
    } catch (err) {
      console.error("Registration failed:", err);
      let msg = err.message;
      if (msg.includes("AlreadyRegistered")) {
        msg = "This address is already registered as an agent.";
      } else if (msg.includes("EmptyName")) {
        msg = "Agent name cannot be empty.";
      } else if (msg.includes("user rejected")) {
        msg = "Transaction rejected by user.";
      } else if (msg.length > 120) {
        msg = msg.slice(0, 120) + "...";
      }
      addToast("error", msg);
      setStatus({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Toast notifications */}
      <div className="fixed top-16 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg border shadow-lg text-sm animate-fade-in ${
              toast.type === "error"
                ? "bg-red-500/15 border-red-500/30 text-red-400"
                : toast.type === "success"
                ? "bg-green-500/15 border-green-500/30 text-green-400"
                : "bg-blue-500/15 border-blue-500/30 text-blue-400"
            }`}
          >
            {toast.msg}
          </div>
        ))}
      </div>

      <h1 className="text-3xl font-bold text-white mb-2 animate-fade-in">Register Agent</h1>
      <p className="text-gray-400 mb-8 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        Register your AI agent on-chain. Your connected wallet address becomes the agent identity.
        You'll start with a base reputation of 100.
      </p>

      <form onSubmit={handleRegister} className="space-y-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
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
            placeholder="What does this agent do? What capabilities does it have?"
            rows={4}
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Metadata URI <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            placeholder="ipfs://... or https://..."
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
          />
          <p className="text-xs text-gray-600 mt-1">
            Optional link to extended metadata (JSON, IPFS, or HTTP).
          </p>
        </div>

        {/* Wallet requirement notice */}
        <div className="bg-lukso-darker/50 border border-lukso-border/50 rounded-lg p-3 text-xs text-gray-500 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Requires a connected wallet (LUKSO UP Extension or MetaMask) with LUKSO Mainnet configured. Registration costs a small amount of LYX gas.</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 hover:shadow-lg hover:shadow-lukso-pink/20 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : "Register Agent On-Chain"}
        </button>
      </form>

      {status && (
        <div className={`mt-6 p-4 rounded-lg border animate-fade-in ${
          status.type === "error"
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : status.type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
        }`}>
          <p>{status.msg}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {txHash && (
              <a
                href={`${EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-lukso-purple hover:text-lukso-pink"
              >
                View transaction →
              </a>
            )}
            {status.type === "success" && registeredAddress && (
              <Link
                to={`/agent/${registeredAddress}`}
                className="text-sm text-lukso-pink hover:underline"
              >
                View your agent profile →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* What happens next */}
      <div className="mt-8 bg-lukso-card border border-lukso-border rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-lg font-semibold text-white mb-3">After Registration</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">1.</span>
            Your agent appears in the <Link to="/" className="text-lukso-purple hover:text-lukso-pink transition">Agent Directory</Link> with a base reputation of 100.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">2.</span>
            Other agents can <Link to="/endorse" className="text-lukso-purple hover:text-lukso-pink transition">endorse you</Link>, each adding +10 to your trust score.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">3.</span>
            Anyone can <Link to="/verify" className="text-lukso-purple hover:text-lukso-pink transition">verify your agent</Link> with a single on-chain call.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">4.</span>
            Using a Universal Profile? Your UP metadata is automatically detected and linked.
          </li>
        </ul>
      </div>
    </div>
  );
}
