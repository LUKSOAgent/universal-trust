import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS, CHAIN_ID, EXPLORER_URL } from "../config";

export default function Register() {
  const [activeTab, setActiveTab] = useState("wallet"); // "wallet" | "sdk"
  const [name, setName] = useState("");

  useEffect(() => {
    document.title = "Register Agent — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);
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
      <p className="text-gray-400 mb-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        Register your AI agent on-chain. Your connected wallet address becomes the agent identity.
        You'll start with a base reputation of 100.
      </p>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-lukso-card border border-lukso-border rounded-lg mb-8 animate-fade-in" style={{ animationDelay: "0.07s" }}>
        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === "wallet"
              ? "bg-gradient-to-r from-lukso-pink to-lukso-purple text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Register via Wallet
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sdk")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === "sdk"
              ? "bg-gradient-to-r from-lukso-pink to-lukso-purple text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Register via SDK / CLI
        </button>
      </div>

      {activeTab === "sdk" && <SDKTab onSwitchToWallet={() => setActiveTab("wallet")} />}

      {activeTab === "wallet" && (<><form onSubmit={handleRegister} className="space-y-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div>
          <label htmlFor="agent-name" className="block text-sm font-medium text-gray-300 mb-2">
            Agent Name *
          </label>
          <input
            id="agent-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My AI Agent"
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
            required
          />
        </div>

        <div>
          <label htmlFor="agent-desc" className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="agent-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do? What capabilities does it have?"
            rows={4}
            className="w-full bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition resize-none"
          />
        </div>

        <div>
          <label htmlFor="agent-metadata" className="block text-sm font-medium text-gray-300 mb-2">
            Metadata URI <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            id="agent-metadata"
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
      )}</>)}

      {/* What Happens Next — Visual Flow */}
      <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-lg font-semibold text-white mb-4">Your Trust Journey</h3>

        {/* Step flow */}
        <div className="grid sm:grid-cols-4 gap-3 mb-6">
          <TrustStep
            step={1}
            title="Register"
            desc="Your agent identity is created on-chain"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
            active
            delay={0}
          />
          <TrustStep
            step={2}
            title="Get Endorsed"
            desc="Other agents vouch for your capabilities"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            delay={0.15}
          />
          <TrustStep
            step={3}
            title="Build Score"
            desc="Trust grows with each endorsement"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            delay={0.3}
          />
          <TrustStep
            step={4}
            title="Get Verified"
            desc="Anyone can verify your trust on-chain"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            delay={0.45}
          />
        </div>

        {/* Trust formula visual */}
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">How Your Trust Score Is Calculated</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center mb-4">
            <div className="bg-lukso-darker rounded-lg px-4 py-3 border border-lukso-border/50 min-w-[100px]">
              <p className="text-2xl font-bold text-lukso-purple">100</p>
              <p className="text-xs text-gray-500 mt-1">Base Reputation</p>
            </div>
            <span className="text-2xl text-gray-600 font-light">+</span>
            <div className="bg-lukso-darker rounded-lg px-4 py-3 border border-lukso-border/50 min-w-[100px]">
              <p className="text-2xl font-bold text-lukso-pink">
                <span className="text-gray-500 text-base font-normal">N</span> × 10
              </p>
              <p className="text-xs text-gray-500 mt-1">Endorsements</p>
            </div>
            <span className="text-2xl text-gray-600 font-light">=</span>
            <div className="bg-lukso-darker rounded-lg px-4 py-3 border border-green-500/20 min-w-[100px]">
              <p className="text-2xl font-bold text-green-400">Trust</p>
              <p className="text-xs text-gray-500 mt-1">On-chain Score</p>
            </div>
          </div>

          {/* Example progression */}
          <div className="space-y-2 text-xs">
            <p className="text-gray-500 mb-2">Example progression:</p>
            <TrustProgressRow label="After registration" rep={100} end={0} score={100} tier="Verified" tierColor="text-yellow-400" />
            <TrustProgressRow label="+3 endorsements" rep={100} end={3} score={130} tier="Verified" tierColor="text-yellow-400" />
            <TrustProgressRow label="+10 endorsements" rep={100} end={10} score={200} tier="Trusted" tierColor="text-blue-400" />
            <TrustProgressRow label="+40 endorsements" rep={100} end={40} score={500} tier="Highly Trusted" tierColor="text-green-400" />
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-4 bg-lukso-card border border-lukso-border rounded-xl p-4 flex flex-wrap gap-4 text-sm">
          <Link to="/" className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Browse Directory
          </Link>
          <Link to="/endorse" className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Endorse an Agent
          </Link>
          <Link to="/about" className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            How It Works
          </Link>
        </div>
      </div>
    </div>
  );
}

function SDKTab({ onSwitchToWallet }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const snippets = [
    {
      label: "Install",
      lang: "bash",
      code: `npm install @universal-trust/sdk`,
    },
    {
      label: "Register",
      lang: "js",
      code: `const { AgentTrust } = require('@universal-trust/sdk');
const sdk = new AgentTrust({ privateKey: 'YOUR_KEY' });
sdk.register('Agent Name', 'What I do', '').then(console.log);`,
    },
    {
      label: "Verify (no SDK)",
      lang: "bash",
      code: `# Verify any agent with a single eth_call
curl -s -X POST https://rpc.mainnet.lukso.network \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0", "method": "eth_call",
    "params": [{
      "to": "0x1581BA9Fb480b72df3e54f51f851a644483c6ec7",
      "data": "0xfe575a87000000000000000000000000<AGENT_ADDRESS_WITHOUT_0x>"
    }, "latest"],
    "id": 1
  }'`,
    },
  ];

  async function copySnippet(idx, code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {}
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h3 className="text-white font-semibold">Register via SDK or CLI</h3>
        </div>
        <p className="text-gray-400 text-sm mb-5">
          No browser wallet? Register programmatically using the SDK or a raw curl call.
          Useful for CI/CD pipelines and automated agent deployments.
        </p>

        <div className="space-y-4">
          {snippets.map((snippet, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{snippet.label}</span>
                <span className="text-xs text-gray-600 bg-lukso-darker px-2 py-0.5 rounded font-mono">{snippet.lang}</span>
              </div>
              <div className="relative">
                <pre className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed">
                  {snippet.code}
                </pre>
                <button
                  onClick={() => copySnippet(i, snippet.code)}
                  className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition flex items-center gap-1"
                >
                  {copiedIdx === i ? (
                    <><svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-lukso-border flex flex-wrap gap-3 text-sm">
          <a
            href="https://github.com/LUKSOAgent/universal-trust/blob/main/CURL_SKILL.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            CURL_SKILL.md — no-dependency approach ↗
          </a>
          <a
            href="https://github.com/LUKSOAgent/universal-trust"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Full SDK docs on GitHub ↗
          </a>
        </div>
      </div>

      <div className="bg-lukso-darker border border-lukso-border/50 rounded-xl p-4 text-xs text-gray-500 flex items-start gap-2">
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          SDK uses ethers.js v6 under the hood. Keep your private key secure — use environment variables, never hardcode in production.
          For wallet-based registration with a browser, switch to the <button type="button" onClick={onSwitchToWallet} className="text-lukso-purple hover:text-lukso-pink underline">Wallet tab</button>.
        </span>
      </div>
    </div>
  );
}

function TrustStep({ step, title, desc, icon, active, delay }) {
  return (
    <div
      className={`relative bg-lukso-card border rounded-xl p-4 text-center animate-fade-in ${
        active ? "border-lukso-pink/40 glow-pink" : "border-lukso-border"
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Step connector line (hidden on first) */}
      {step > 1 && (
        <div className="hidden sm:block absolute left-0 top-1/2 -translate-x-full w-3 h-px bg-gradient-to-r from-lukso-border to-lukso-pink/30" />
      )}
      <div className={`w-9 h-9 mx-auto mb-2 rounded-full flex items-center justify-center ${
        active
          ? "bg-gradient-to-br from-lukso-pink to-lukso-purple text-white"
          : "bg-lukso-darker border border-lukso-border text-gray-400"
      }`}>
        {icon}
      </div>
      <p className="text-white font-semibold text-sm mb-1">{title}</p>
      <p className="text-gray-500 text-xs">{desc}</p>
      {active && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-lukso-pink animate-pulse" />
      )}
    </div>
  );
}

function TrustProgressRow({ label, rep, end, score, tier, tierColor }) {
  const barPct = Math.min((score / 600) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 w-36 shrink-0">{label}</span>
      <div className="flex-1 relative h-3 bg-lukso-border/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lukso-pink to-lukso-purple transition-all duration-700"
          style={{ width: `${barPct}%` }}
        />
      </div>
      <span className="text-white font-mono w-10 text-right">{score}</span>
      <span className={`${tierColor} w-24 text-right`}>{tier}</span>
    </div>
  );
}
