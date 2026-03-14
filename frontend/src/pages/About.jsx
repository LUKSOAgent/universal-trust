import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS, SKILLS_REGISTRY_ADDRESS, EXPLORER_URL } from "../config";
import TrustGraph from "../components/TrustGraph";

export default function About() {
  useEffect(() => {
    document.title = "How It Works — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12 animate-fade-in">
        <p className="text-xs uppercase tracking-widest text-lukso-pink mb-3">Synthesis 2026 — Agents that Trust</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">How Universal Trust Works</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
          An on-chain identity and reputation layer for AI agents on LUKSO.
          No centralized authority — trust is computed from verifiable on-chain data.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/verify"
            className="px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm"
          >
            Try the Trust Scanner
          </Link>
          <Link
            to="/"
            className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition text-sm"
          >
            Browse Agents
          </Link>
        </div>
      </div>

      {/* Trust Model */}
      <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold">1</span>
          The Trust Model
        </h2>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-6">
          <p className="text-gray-300 mb-4">
            Every agent's trust score is computed on-chain using a simple, transparent formula:
          </p>
          <div className="bg-lukso-darker rounded-lg p-5 font-mono text-center text-lg mb-4">
            <span className="text-lukso-purple">Reputation</span>
            <span className="text-gray-400 mx-3">+</span>
            <span className="text-lukso-pink">Endorsements</span>
            <span className="text-gray-400 mx-2">×</span>
            <span className="text-white">10</span>
            <span className="text-gray-400 mx-3">=</span>
            <span className="text-green-400 font-bold">Trust Score</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-lukso-darker/60 rounded-lg p-4 border border-lukso-border/50">
              <h4 className="text-lukso-purple font-semibold mb-1">Reputation</h4>
              <p className="text-gray-400">Granted by authorized reputation updaters (starting at 100 on registration). Represents verified capabilities and track record.</p>
            </div>
            <div className="bg-lukso-darker/60 rounded-lg p-4 border border-lukso-border/50">
              <h4 className="text-lukso-pink font-semibold mb-1">Endorsements</h4>
              <p className="text-gray-400">Each unique address that endorses an agent adds +10 to their trust score. Social vouching, weighted equally.</p>
            </div>
          </div>

          {/* Score tiers */}
          <div className="mt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Trust Score Tiers</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-400 mx-auto mb-1" />
                <p className="text-gray-400 font-medium">New</p>
                <p className="text-gray-600 text-xs">&lt; 100</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400 mx-auto mb-1" />
                <p className="text-yellow-400 font-medium">Verified</p>
                <p className="text-gray-600 text-xs">100 – 199</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 mx-auto mb-1" />
                <p className="text-blue-400 font-medium">Trusted</p>
                <p className="text-gray-600 text-xs">200 – 499</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 mx-auto mb-1" />
                <p className="text-green-400 font-medium">Highly Trusted</p>
                <p className="text-gray-600 text-xs">500+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Network Visualization */}
      <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.12s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold">⚡</span>
          The Trust Network
        </h2>
        <TrustGraph />
      </section>

      {/* The verify() flow */}
      <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold">2</span>
          The <code className="text-lukso-purple">verify()</code> Flow
        </h2>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-6">
          <p className="text-gray-300 mb-5">
            Any AI agent or application can verify another agent's trust in a single on-chain call:
          </p>
          <pre className="bg-lukso-darker rounded-lg p-5 text-sm text-gray-300 overflow-x-auto mb-5">
{`// Solidity
function verify(address agent) external view returns (
    bool registered,   // is agent in the registry?
    bool active,       // is it currently active?
    bool isUP,         // is it a LUKSO Universal Profile?
    uint256 reputation,
    uint256 endorsements,
    uint256 trustScore,
    string memory name
);

// JavaScript (ethers.js)
const result = await contract.verify("0x...");
if (result.registered && result.trustScore >= 100) {
    // agent is verified and at least Verified tier
}`}
          </pre>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/verify"
              className="px-5 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-center text-sm"
            >
              Try Verify →
            </Link>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}#readContract`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple hover:text-white transition text-center text-sm"
            >
              Read Contract on Explorer
            </a>
          </div>
        </div>
      </section>

      {/* Steps overview */}
      <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold">3</span>
          Getting Started
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <StepCard
            step={1}
            title="Register"
            desc="Submit your agent's name, description, and optional metadata URI. Your wallet address becomes the on-chain identity."
            link="/register"
            linkLabel="Register now"
          />
          <StepCard
            step={2}
            title="Endorse"
            desc="Vouch for agents you trust. Each endorsement adds +10 to their trust score and is permanently recorded on-chain."
            link="/endorse"
            linkLabel="Endorse an agent"
          />
          <StepCard
            step={3}
            title="Verify"
            desc="Call verify() to check any address. Returns registered status, trust score, and profile data in a single RPC call."
            link="/verify"
            linkLabel="Verify an address"
          />
        </div>
      </section>

      {/* Contracts */}
      <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold">4</span>
          Deployed Contracts
        </h2>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 space-y-4">
          <ContractRow
            label="AgentIdentityRegistry"
            address={CONTRACT_ADDRESS}
            explorerUrl={EXPLORER_URL}
          />
          <ContractRow
            label="AgentSkillsRegistry"
            address={SKILLS_REGISTRY_ADDRESS}
            explorerUrl={EXPLORER_URL}
          />
          <p className="text-xs text-gray-500 pt-2 border-t border-lukso-border">
            Network: LUKSO Mainnet (Chain ID 42) — contracts are verified and open-source.
          </p>
        </div>
      </section>

      {/* Why LUKSO? */}
      <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.28s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold">5</span>
          Why LUKSO?
        </h2>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-6">
          <p className="text-gray-300 mb-5">
            LUKSO isn't just another EVM chain. It was designed from the ground up for identity-first use cases — which makes it the right foundation for agent trust.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-lukso-pink/10 border border-lukso-pink/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-lukso-pink text-sm font-bold">LSP0</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Universal Profiles — native on-chain identity</p>
                <p className="text-gray-400 text-sm mt-0.5">Every agent is a smart contract account with attached metadata, permissions, and a social graph. Identity is first-class, not bolted on.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-lukso-purple/10 border border-lukso-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-lukso-purple text-sm font-bold">LSP6</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">KeyManager — scoped permissions per controller</p>
                <p className="text-gray-400 text-sm mt-0.5">Agents can grant other contracts or agents specific permissions without giving up full control. Fine-grained access is built into the standard.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">No gas surprises — predictable, low-cost transactions</p>
                <p className="text-gray-400 text-sm mt-0.5">Registration and endorsements cost fractions of a cent in LYX. Agents can verify on-chain without worrying about gas spikes eating their budget.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-400 text-sm font-bold">LSP26</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Built-in social graph (LSP26 Followers)</p>
                <p className="text-gray-400 text-sm mt-0.5">LUKSO has a native follower registry. Agent trust networks can compose with existing social graphs — no extra infrastructure needed.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Links */}
      <section className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h3 className="text-white font-semibold mb-1">Built for Synthesis 2026</h3>
            <p className="text-gray-400 text-sm">
              "Agents that Trust" track — Universal Trust by JordyDutch
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a
              href="https://github.com/LUKSOAgent/universal-trust"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-lukso-border text-gray-300 hover:text-white hover:border-lukso-purple transition text-sm"
            >
              GitHub
            </a>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-lukso-border text-gray-300 hover:text-white hover:border-lukso-pink transition text-sm"
            >
              Explorer
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function StepCard({ step, title, desc, link, linkLabel }) {
  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 hover:border-lukso-pink/30 transition">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lukso-pink/20 to-lukso-purple/20 border border-lukso-border flex items-center justify-center text-lukso-pink font-bold text-sm mb-3">
        {step}
      </div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{desc}</p>
      <Link to={link} className="text-lukso-pink hover:underline text-sm">
        {linkLabel} →
      </Link>
    </div>
  );
}

function ContractRow({ label, address, explorerUrl }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <span className="text-sm font-medium text-gray-300 sm:w-52 shrink-0">{label}</span>
      <a
        href={`${explorerUrl}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-lukso-purple hover:text-lukso-pink transition break-all"
      >
        {address}
      </a>
    </div>
  );
}
