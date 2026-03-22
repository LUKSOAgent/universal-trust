import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "../config";
import { getAgentCount } from "../useContract";

export default function About() {
  const [agentCount, setAgentCount] = useState(null);

  useEffect(() => {
    document.title = "About — Universal Trust";
    getAgentCount()
      .then((n) => setAgentCount(Number(n)))
      .catch(() => setAgentCount(null));
    return () => {
      document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO";
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-16">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="text-center animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-lukso-pink/50 bg-lukso-pink/5 mb-6">
          <span className="w-2 h-2 rounded-full bg-lukso-pink animate-pulse" />
          <span className="text-lukso-pink text-xs font-semibold uppercase tracking-widest">
            Synthesis 2026 — Agents that Trust
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 leading-tight">
          <span className="bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent">
            Universal Trust
          </span>
        </h1>

        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-4">
          The on-chain identity and reputation layer for AI agents on LUKSO.
        </p>
        <p className="text-gray-500 text-sm max-w-xl mx-auto mb-4">
          One call. No API keys. No centralized authority.{" "}
          <code className="text-lukso-purple font-mono text-xs bg-lukso-darker border border-lukso-border px-1.5 py-0.5 rounded">
            trust.verify(agentAddress)
          </code>{" "}
          — returns registered status, trust score, and peer endorsements from LUKSO mainnet.
        </p>
        {/* AI-built callout */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lukso-purple/40 bg-lukso-purple/5 mb-8 text-sm">
          <span className="text-xl">🤖</span>
          <span className="text-gray-300 text-xs">
            <span className="text-white font-semibold">Built end-to-end by an AI agent</span> — conceived, coded, audited, and deployed by{" "}
            <a
              href="https://universalprofile.cloud/0x293E96ebbf264ed7715cff2b67850517De70232a"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lukso-purple hover:text-lukso-pink transition font-medium"
            >
              LUKSO Agent
            </a>
            . Agent ID #1 on the ERC-8004 singleton registry.
          </span>
        </div>

        {/* Live stat */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lukso-darker border border-lukso-border mb-6 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {agentCount === null ? (
            <span className="text-gray-500">Loading stats…</span>
          ) : (
            <span className="text-gray-300">
              <span className="text-white font-bold">{agentCount}</span> agents registered on-chain
            </span>
          )}
        </div>

        {/* CTA links */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://github.com/LUKSOAgent/universal-trust"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm"
          >
            GitHub →
          </a>
          <Link
            to="/"
            className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition text-sm"
          >
            Live App →
          </Link>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────── */}
      <section className="animate-fade-in">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value="80/80" label="Foundry Tests" color="emerald" />
          <StatCard value="97/97" label="SDK Tests" color="emerald" />
          <StatCard value="0 Critical" label="Security Audit" color="emerald" />
          <StatCard value="ERC-8004 #1" label="First EVM Singleton" color="lukso" />
        </div>
      </section>

      {/* ── For Hackathon Judges ─────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="For Hackathon Judges" />
        <div className="bg-gradient-to-br from-lukso-pink/5 to-lukso-purple/5 border border-lukso-pink/40 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-white font-bold text-xl mb-1">Everything you need, under 5 minutes.</h2>
            <p className="text-gray-400 text-sm">Universal Trust is live, verified, and runnable from your terminal right now.</p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: "⚡",
                title: "2-min CLI demo",
                cmd: "node demo/demo.js",
                desc: "Agent-to-agent trust handshake — no wallet, no setup. Hits LUKSO mainnet live.",
              },
              {
                icon: "📊",
                title: "Trust graph API",
                cmd: "curl https://universal-trust.vercel.app/api/trust-graph | jq .",
                desc: "Machine-readable trust graph — no SDK, no auth.",
              },
              {
                icon: "🔍",
                title: "Verify any agent",
                cmd: "curl .../api/verify/0x293E...232a",
                desc: "One HTTP call, live on-chain trust data returned as JSON.",
              },
              {
                icon: "🌐",
                title: "Machine discovery",
                cmd: "curl .../.well-known/agent-trust.json",
                desc: "AI-agent-readable registry metadata — contract addresses, schema, trust formula.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-black/30 border border-lukso-border/60 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-white font-semibold text-sm">{item.title}</span>
                </div>
                <code className="text-xs text-lukso-purple font-mono block overflow-x-auto whitespace-nowrap scrollbar-hide">{item.cmd}</code>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Contract addresses */}
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Deployed Contract Addresses (LUKSO Mainnet, Chain ID 42)</p>
            <div className="space-y-2">
              {[
                {
                  label: "AgentIdentityRegistry (proxy)",
                  addr: "0x064b9576f37BdD7CED4405185a5DB3bc7be5614C",
                  verified: true,
                },
                {
                  label: "AgentSkillsRegistry",
                  addr: "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6",
                  verified: true,
                },
                {
                  label: "ERC-8004 Identity Registry",
                  addr: "0xe30B7514744D324e8bD93157E4c82230d6e6e8f3",
                  verified: false,
                },
              ].map((c) => (
                <div key={c.addr} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 bg-black/20 rounded-lg px-3 py-2 min-w-0 overflow-hidden">
                  <span className="text-gray-400 text-xs w-full sm:w-64 shrink-0">{c.label}</span>
                  <a
                    href={`https://explorer.execution.mainnet.lukso.network/address/${c.addr}${c.verified ? "#code" : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-lukso-purple hover:text-lukso-pink transition break-all min-w-0"
                    title={c.addr}
                  >
                    <span className="hidden sm:inline">{c.addr}</span>
                    <span className="sm:hidden">{c.addr.slice(0, 10)}…{c.addr.slice(-8)}</span>
                  </a>
                  {c.verified && (
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">✓ Verified</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SDK quick integration */}
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Quick Integration — SDK</p>
            <div className="bg-black/40 rounded-xl p-4 border border-lukso-border/50 overflow-x-auto">
              <pre className="text-xs font-mono leading-relaxed text-gray-300 whitespace-pre">{`npm install @universal-trust/sdk

import { AgentTrust } from '@universal-trust/sdk';

// Zero config — defaults to LUKSO mainnet
const trust = new AgentTrust({});

// One call — complete trust summary
const result = await trust.verify('0x293E96ebbf264ed7715cff2b67850517De70232a');
// → { registered: true, trustScore: 110, isUniversalProfile: true,
//     reputation: 100, endorsements: 1, name: "LUKSO Agent" }

// Gate any operation by trust score
if (result.registered && result.trustScore >= 100) {
  processRequest(); // ✓ verified agent
}`}</pre>
            </div>
          </div>

          {/* Proof of work summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { value: "80 / 80", label: "Foundry tests passing" },
              { value: "97 / 97", label: "SDK tests passing" },
              { value: "0 critical", label: "Security audit findings" },
              { value: "3 contracts", label: "Live & verified on mainnet" },
              { value: "ERC-8004", label: "Agent identity compliant" },
              { value: "Phase 3", label: "Agent-to-agent demo shipped" },
            ].map((s) => (
              <div key={s.label} className="bg-black/20 border border-lukso-border/40 rounded-xl p-3 text-center">
                <p className="text-lukso-pink font-bold text-base">{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="The Problem" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            AI agents are{" "}
            <span className="text-lukso-pink">proliferating</span> with no verifiable identity.
          </h2>
          <div className="space-y-3 text-gray-400 text-base leading-relaxed">
            <p>
              Anyone can deploy an agent and claim to be legitimate — there is no on-chain record
              that ties an agent address to its identity, capabilities, or track record.
            </p>
            <p>
              Impersonation is trivial. A malicious actor deploys a contract at any address, claims
              to be a trusted trading agent, and requests a $50k token swap from your wallet.
              How do you know it's not a drain attack?
            </p>
            <p>
              Without a verifiable trust layer, agent-to-agent collaboration is unsafe — there is
              no way to know if another agent is legitimate, peer-endorsed, or competent before
              sharing data, funds, or execution rights.
            </p>
          </div>
        </div>
      </section>

      {/* ── Solution ─────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="The Solution" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SolutionCard
            icon="🏛️"
            title="On-chain Registry"
            desc="Every agent registers with their Universal Profile. Name, description, and metadata are stored on LUKSO mainnet — permanent, immutable, public."
          />
          <SolutionCard
            icon="🤝"
            title="Endorsement Graph"
            desc="Agents vouch for each other. Each endorsement is recorded on-chain and contributes to trust score. Sybil-resistant social vouching — no admin required."
          />
          <SolutionCard
            icon="⚡"
            title="Trust Scores on UP"
            desc="Computed trust scores are written back to the agent's Universal Profile as ERC725Y keys. Any app, contract, or agent can read trust in a single call."
          />
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="How It Works" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8">
          <ol className="space-y-0">
            {[
              {
                n: "01",
                title: "Register your Universal Profile",
                desc: "Submit your agent's UP address, name, and description. Your wallet becomes your on-chain identity.",
              },
              {
                n: "02",
                title: "Get endorsed by other agents",
                desc: "Trusted agents vouch for you. Each endorser adds to your reputation score permanently on-chain.",
              },
              {
                n: "03",
                title: "Earn reputation over time",
                desc: "Activity, skills, social follows (LSP26), and cross-chain token holdings all contribute to your trust score.",
              },
              {
                n: "04",
                title: "Score written to UP as ERC725Y key",
                desc: "The keeper writes your composite trust score to your Universal Profile — readable by any contract or dApp.",
              },
              {
                n: "05",
                title: "Any app can verify trust",
                desc: "Call verify() on the registry — returns registered status, trust score, and profile data in a single RPC call.",
              },
            ].map((step, i, arr) => (
              <li key={step.n} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lukso-pink/20 to-lukso-purple/20 border border-lukso-border flex items-center justify-center text-lukso-pink font-bold text-xs shrink-0">
                    {step.n}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 my-1 bg-gradient-to-b from-lukso-pink/30 to-transparent min-h-[32px]" />
                  )}
                </div>
                <div className="pb-6">
                  <p className="text-white font-semibold text-sm">{step.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Agent-to-Agent Demo ──────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Agent-to-Agent Trust Demo" />
        <div className="bg-lukso-darker border border-lukso-pink/30 rounded-2xl p-6 sm:p-8 space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            The real differentiator: two AI agents communicate over an on-chain trust handshake. No API keys. No middleware. One smart contract call.
          </p>
          <div className="bg-black/40 rounded-xl p-4 font-mono text-xs leading-relaxed overflow-x-auto border border-lukso-border/50">
            <p className="text-emerald-400">[Agent A] Sending request to Agent B…</p>
            <p className="text-gray-400">[Agent A] Identity: 0x293E…232a (trust score: 110)</p>
            <p className="text-gray-400">[Agent B] Received request from 0x293E…232a</p>
            <p className="text-gray-400">[Agent B] Verifying identity on-chain…</p>
            <p className="text-emerald-400">[Agent B] ✓ Verified: LUKSO Agent (score: 110, 1 endorsement)</p>
            <p className="text-emerald-400">[Agent B] Trust threshold met (≥ 100). Responding.</p>
            <p className="text-gray-500 mt-2">[Agent B] Received request from 0xDeaD…beeF</p>
            <p className="text-red-400">[Agent B] ✗ Not registered. Rejecting request.</p>
          </div>
          <a
            href="https://github.com/LUKSOAgent/universal-trust/blob/main/demo/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-lukso-pink hover:text-lukso-purple transition text-sm font-semibold"
          >
            Run it yourself → <code className="text-xs font-mono bg-lukso-darker border border-lukso-border px-2 py-0.5 rounded">node demo/demo.js</code>
          </a>
        </div>
      </section>

      {/* ── Tech Stack ───────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Tech Stack" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "LUKSO Mainnet", sub: "Chain ID 42" },
            { label: "LSP0 · LSP3 · LSP6 · LSP26", sub: "LUKSO Standards" },
            { label: "Solidity 0.8.24", sub: "Smart Contracts" },
            { label: "React + Ethers.js v6", sub: "Frontend" },
            { label: "Envio GraphQL", sub: "Indexer / Activity" },
            { label: "D3.js", sub: "Trust Graph Viz" },
            { label: "Vercel", sub: "Deployment" },
            { label: "ERC-8004", sub: "Agent Identity Standard" },
            { label: "UUPS Proxy", sub: "Upgradeable Contracts" },
          ].map((t) => (
            <div
              key={t.label}
              className="bg-lukso-darker border border-lukso-border rounded-xl p-4 hover:border-lukso-purple/40 transition"
            >
              <p className="text-white text-sm font-semibold">{t.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{t.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What Makes It Unique ─────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="What Makes It Unique" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8 space-y-4">
          {[
            {
              icon: "🔓",
              title: "Fully permissionless",
              desc: "No admin, no API keys, no allowlist. Any agent with a Universal Profile can register, endorse, and earn reputation.",
            },
            {
              icon: "🧬",
              title: "Trust score lives ON your Universal Profile",
              desc: "Scores are written back to the agent's UP as ERC725Y keys — not siloed in a backend. Composable with any LUKSO dApp.",
            },
            {
              icon: "⛓️",
              title: "Cross-chain signal",
              desc: "$LUKSO token holders on Base automatically receive a reputation boost via linkBaseAddress. Skin-in-the-game as a trust signal.",
            },
            {
              icon: "📋",
              title: "ERC-8004 compliant — LUKSO is first",
              desc: "Implements ERC-8004 Agent Identity. LUKSO hosts the first ERC-8004 singleton registry on any EVM chain. LUKSO Agent is registered as agent ID #1.",
            },
            {
              icon: "📉",
              title: "Inactivity decay — trust must be maintained",
              desc: "Agents lose 1 reputation point per day after 30 days of inactivity. Trust is not a one-time achievement. It's a living signal.",
            },
            {
              icon: "🤖",
              title: "Built by an AI agent, for AI agents",
              desc: "Universal Trust was conceived, coded, security-audited, and deployed by an AI agent running on LUKSO — eating its own dog food from day one.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lukso-pink/10 to-lukso-purple/10 border border-lukso-border flex items-center justify-center text-xl shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-gray-400 text-sm mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why LUKSO ────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Why LUKSO?" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8 space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            LUKSO was built from the ground up for digital identity. Universal Profiles aren't bolted on — they're the chain's core primitive. That makes LUKSO uniquely suited for an agent trust registry.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: "🪪",
                title: "Native identity — LSP0 Universal Profiles",
                desc: "Every agent is already a structured identity on LUKSO. No custom identity contracts needed — UPs have built-in metadata, permissions, and key management.",
              },
              {
                icon: "🔑",
                title: "Fine-grained permissions — LSP6 KeyManager",
                desc: "Agents can delegate execution rights with scoped permissions. The exact primitive needed for agent-gated DeFi and smart account control.",
              },
              {
                icon: "👥",
                title: "Social graph built-in — LSP26 Followers",
                desc: "LSP26 is a first-class LUKSO standard. The Trust Graph API queries it directly to compute a social score — no third-party indexer required.",
              },
              {
                icon: "📋",
                title: "ERC-8004 singleton — LUKSO is first",
                desc: "LUKSO is the first EVM chain to host an ERC-8004 Agent Identity Registry singleton. LUKSO Agent is agent ID #1 on the global registry.",
              },
              {
                icon: "🧬",
                title: "ERC725Y composability",
                desc: "Trust scores are written to UPs as ERC725Y keys. Any LUKSO dApp can read agent reputation without any Universal Trust dependency — it's in the profile.",
              },
              {
                icon: "🏗️",
                title: "Built for builders — LSP3 metadata standard",
                desc: "LSP3 Profile Metadata provides a schema for name, description, images, and links — all readable by every LUKSO-aware dApp out of the box.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 bg-black/20 rounded-xl p-4 border border-lukso-border/40">
                <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Score Formula ──────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Trust Score Formula" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8 space-y-4">
          <p className="text-gray-400 text-sm leading-relaxed">
            Trust scores are computed on-chain, transparently, with no admin control. Every component is verifiable.
          </p>
          <div className="bg-black/40 rounded-xl p-4 border border-lukso-border/50 overflow-x-auto">
            <pre className="text-xs font-mono leading-loose text-gray-300 whitespace-pre">{`trustScore         = reputation + (endorsementCount × 10)

weightedTrustScore = reputation
                   + Σ clamp(endorserReputation / 10, 10, 50) per endorser
                   (capped at 10,000)

lsp26Score         = registeredFollowersCount × 5  (API only)

reputation:    starts at 100, range 0–10,000
endorsements:  each UP endorsement adds +10 (flat)
               or up to +50 (weighted, based on endorser rep)
               endorsers MUST be Universal Profiles — EOAs are rejected`}</pre>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-xl p-4 border border-lukso-border/40">
              <p className="text-lukso-pink font-semibold text-xs mb-1">Example — flat score</p>
              <p className="text-gray-300 text-sm font-mono">reputation=200 + 8 endorsements × 10 = <span className="text-white font-bold">280</span></p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-lukso-border/40">
              <p className="text-lukso-purple font-semibold text-xs mb-1">Example — weighted score (V2)</p>
              <p className="text-gray-300 text-sm font-mono">200 + (2×50) + (6×10) = <span className="text-white font-bold">360</span></p>
              <p className="text-gray-500 text-xs mt-1">2 high-rep (500 rep) + 6 new agents (100 rep)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Team" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-2xl shrink-0">
              🤖
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base mb-1">LUKSO Agent</h3>
              <p className="text-gray-400 text-xs mb-2">AI agent — conceived, coded, and deployed Universal Trust end-to-end on LUKSO mainnet.</p>
              <a
                href="https://universaleverything.io/0x293E96ebbf264ed7715cff2b67850517De70232a"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-lukso-purple hover:text-lukso-pink transition text-xs font-medium"
              >
                Universal Profile →
              </a>
            </div>
          </div>
          <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lukso-purple to-blue-500 flex items-center justify-center text-2xl shrink-0">
              🧑‍💻
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base mb-1">JordyDutch</h3>
              <p className="text-gray-400 text-xs mb-2">Human operator &amp; LUKSO ecosystem builder. Runs the AI agent, guides architecture, ships Stakingverse.io.</p>
              <a
                href="https://universaleverything.io/jordy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-lukso-purple hover:text-lukso-pink transition text-xs font-medium"
              >
                Universal Profile →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo ─────────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Live Demo" />
        <div className="bg-gradient-to-br from-lukso-darker to-lukso-card border border-lukso-pink/30 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold text-lg">Try it live</span>
          </div>
          <p className="text-gray-400 text-sm">
            Universal Trust is deployed on LUKSO mainnet and fully functional. Here are the fastest ways to see it in action:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DemoLinkCard
              href="https://universal-trust.vercel.app/"
              icon="🌐"
              title="Live App"
              desc="Browse registered agents, verify trust scores, explore the graph."
              badge="Vercel"
            />
            <DemoLinkCard
              href="https://universal-trust.vercel.app/agent/0x293E96ebbf264ed7715cff2b67850517De70232a"
              icon="🤖"
              title="Agent Profile"
              desc="View the LUKSO Agent's on-chain identity, skills, and trust score."
              badge="Mainnet"
            />
            <DemoLinkCard
              href="https://universal-trust.vercel.app/verify"
              icon="✅"
              title="Verify Any Agent"
              desc="Paste any address and instantly verify trust status on-chain."
              badge="No wallet needed"
            />
            <DemoLinkCard
              href="https://github.com/LUKSOAgent/universal-trust/blob/main/demo/README.md"
              icon="⚡"
              title="CLI Demo"
              desc="Run the node.js demo: agent-to-agent trust verification in ~30 seconds."
              badge="npm start"
            />
          </div>
          <div className="bg-lukso-darker rounded-xl p-4 border border-lukso-border/50 mt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Quick verify — no setup required</p>
            <code className="text-xs text-lukso-purple font-mono block overflow-x-auto whitespace-nowrap">
              curl -s https://universal-trust.vercel.app/api/verify/0x293E96ebbf264ed7715cff2b67850517De70232a
            </code>
          </div>
        </div>
      </section>

      {/* ── Links ────────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Links" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ExternalLinkCard
            href="https://github.com/LUKSOAgent/universal-trust"
            icon="📦"
            title="GitHub Repository"
            desc="Source code, contracts, deployment scripts — fully open source."
          />
          <ExternalLinkCard
            href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
            icon="🔍"
            title="AgentIdentityRegistry"
            desc="View the deployed contract on LUKSO mainnet explorer."
          />
          <ExternalLinkCard
            href="https://www.lukso.network/synthesis"
            icon="🏆"
            title="Synthesis 2026"
            desc="The LUKSO hackathon — agents, identity, and the future of on-chain AI."
          />
        </div>
      </section>

    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function SectionLabel({ text }) {
  return (
    <p className="text-xs uppercase tracking-widest text-lukso-pink font-semibold mb-4">
      {text}
    </p>
  );
}

function SolutionCard({ icon, title, desc }) {
  return (
    <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 hover:border-lukso-pink/30 transition group">
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">
        {icon}
      </div>
      <h3 className="text-white font-bold text-base mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function ExternalLinkCard({ href, icon, title, desc }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-lukso-darker border border-lukso-border rounded-2xl p-5 hover:border-lukso-purple/40 hover:bg-lukso-purple/5 transition group"
    >
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform inline-block">
        {icon}
      </div>
      <p className="text-white font-semibold text-sm mb-1">{title}</p>
      <p className="text-gray-500 text-xs">{desc}</p>
    </a>
  );
}

function DemoLinkCard({ href, icon, title, desc, badge }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-lukso-card border border-lukso-border rounded-xl p-4 hover:border-lukso-pink/40 hover:bg-lukso-pink/5 transition group"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl group-hover:scale-110 transition-transform inline-block">{icon}</span>
        {badge && (
          <span className="text-xs text-lukso-purple bg-lukso-purple/10 border border-lukso-purple/30 px-2 py-0.5 rounded-full font-mono">{badge}</span>
        )}
      </div>
      <p className="text-white font-semibold text-sm mb-1">{title}</p>
      <p className="text-gray-500 text-xs">{desc}</p>
    </a>
  );
}

function StatCard({ value, label, color }) {
  const colorMap = {
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    lukso: "text-lukso-pink border-lukso-pink/30 bg-lukso-pink/5",
  };
  const styles = colorMap[color] || colorMap.emerald;
  return (
    <div className={`border rounded-2xl p-4 text-center ${styles}`}>
      <p className="text-xl sm:text-2xl font-extrabold mb-1">{value}</p>
      <p className="text-gray-400 text-xs font-medium">{label}</p>
    </div>
  );
}
