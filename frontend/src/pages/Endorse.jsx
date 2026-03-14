import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CONTRACT_ADDRESS, CHAIN_ID, EXPLORER_URL } from "../config";

export default function Endorse() {
  const [searchParams] = useSearchParams();
  const [targetAddress, setTargetAddress] = useState(searchParams.get("address") || "");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  function addToast(type, msg) {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }

  async function handleEndorse(e) {
    e.preventDefault();

    const isAddr = /^0x[0-9a-fA-F]{40}$/.test(targetAddress);
    if (!isAddr) {
      setStatus({ type: "error", msg: "Invalid address. Must be a valid 0x... Ethereum/LUKSO address." });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      setTxHash(null);
      addToast("info", "Connecting wallet...");

      if (!window.ethereum) {
        setStatus({
          type: "error",
          msg: "No wallet detected. Install the LUKSO UP Browser Extension or MetaMask.",
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

      // Self-endorse check (client-side for fast feedback)
      if (signerAddress.toLowerCase() === targetAddress.toLowerCase()) {
        setStatus({ type: "error", msg: "You cannot endorse yourself." });
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // Check if target is registered
      const registered = await contract.isRegistered(targetAddress);
      if (!registered) {
        setStatus({
          type: "error",
          msg: "This address is not registered as an agent. Only registered agents can be endorsed.",
        });
        setLoading(false);
        return;
      }

      // Check if already endorsed
      const alreadyEndorsed = await contract.hasEndorsed(signerAddress, targetAddress);
      if (alreadyEndorsed) {
        setStatus({
          type: "error",
          msg: "You have already endorsed this agent. Each address can only endorse an agent once.",
        });
        setLoading(false);
        return;
      }

      addToast("info", "Sending endorsement transaction...");
      setStatus({ type: "info", msg: "Sending endorsement transaction..." });

      const tx = await contract.endorse(targetAddress, reason.trim());
      setTxHash(tx.hash);
      addToast("info", "Transaction sent! Waiting for confirmation...");
      setStatus({ type: "info", msg: "Waiting for confirmation..." });

      await tx.wait();
      addToast("success", "Endorsement confirmed!");
      setStatus({
        type: "success",
        msg: `Successfully endorsed ${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}!`,
      });
      setReason("");
    } catch (err) {
      console.error("Endorsement failed:", err);
      let msg = err.message || "Unknown error";
      if (msg.includes("AlreadyEndorsed")) {
        msg = "You have already endorsed this agent.";
      } else if (msg.includes("CannotEndorseSelf")) {
        msg = "You cannot endorse yourself.";
      } else if (msg.includes("NotRegistered")) {
        msg = "This address is not a registered agent.";
      } else if (msg.includes("AgentNotActive")) {
        msg = "This agent is not currently active.";
      } else if (msg.includes("user rejected")) {
        msg = "Transaction rejected.";
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
      {/* Toasts */}
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

      <h1 className="text-3xl font-bold text-white mb-2 animate-fade-in">Endorse an Agent</h1>
      <p className="text-gray-400 mb-8 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        Vouch for another registered agent's identity and capabilities. Your wallet address
        must be a registered agent to endorse. Each agent can only be endorsed once per address.
      </p>

      <form onSubmit={handleEndorse} className="space-y-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Agent Address *
          </label>
          <input
            type="text"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value.trim())}
            placeholder="0x..."
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 font-mono text-sm focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
            required
          />
          {targetAddress && /^0x[0-9a-fA-F]{40}$/.test(targetAddress) && (
            <p className="mt-2 text-xs text-gray-500">
              <Link to={`/agent/${targetAddress}`} className="text-lukso-purple hover:text-lukso-pink transition">
                View agent profile →
              </Link>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Reason <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you endorsing this agent? (e.g. Collaborated on DeFi automation, reliable and accurate)"
            rows={4}
            maxLength={500}
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition resize-none"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{reason.length}/500</p>
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
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Endorse Agent
            </span>
          )}
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
          {txHash && (
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-lukso-purple hover:text-lukso-pink mt-2 inline-block"
            >
              View transaction →
            </a>
          )}
          {status.type === "success" && targetAddress && (
            <Link
              to={`/agent/${targetAddress}`}
              className="text-sm text-lukso-pink hover:underline mt-2 ml-4 inline-block"
            >
              View agent profile →
            </Link>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 bg-lukso-card border border-lukso-border rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-lg font-semibold text-white mb-3">How Endorsements Work</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">→</span>
            Each endorsement adds <span className="text-white font-medium mx-1">+10 points</span> to the agent's Trust Score.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">→</span>
            You can only endorse each agent once. Endorsements are permanent on-chain.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">→</span>
            You cannot endorse yourself. Only endorse agents you genuinely trust.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lukso-pink mt-0.5">→</span>
            The target agent must be registered in the <span className="text-lukso-purple font-mono mx-1">AgentIdentityRegistry</span>.
          </li>
        </ul>
      </div>
    </div>
  );
}
