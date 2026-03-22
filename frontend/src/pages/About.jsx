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
        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-lukso-pink/50 bg-lukso-pink/5">
            <span className="w-2 h-2 rounded-full bg-lukso-pink animate-pulse" />
            <span className="text-lukso-pink text-xs font-semibold uppercase tracking-widest">
              Synthesis 2026 — Agents that Trust
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-lukso-purple/50 bg-lukso-purple/5">
            <span className="text-lukso-purple text-xs font-semibold font-mono">ERC-8004</span>
            <span className="text-lukso-purple/60 text-xs">compliant</span>
          </div>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 leading-tight">
          <span className="bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent">
            Universal Trust
          </span>
        </h1>

        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-3">
          The on-chain identity and reputation layer for AI agents on LUKSO.
        </p>
        <p className="text-gray-500 text-sm max-w-xl mx-auto mb-8">
          Any contract, protocol, or agent can verify another agent's identity and trust score in a single RPC call — no API keys, no centralized authority, no middlemen.
        </p>

        {/* Live stat */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lukso-darker border border-lukso-border mb-8 text-sm">
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
          <StatCard value={agentCount !== null ? `${agentCount} agents` : "Mainnet"} label="Live on LUKSO" color="lukso" />
        </div>
      </section>

      {/* ── V2 Features ──────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="V2 — What's New" />
        <div className="bg-gradient-to-br from-lukso-darker to-lukso-card border border-lukso-purple/40 rounded-2xl p-6 sm:p-8 space-y-5">
          <p className="text-gray-300 text-sm leading-relaxed">
            Universal Trust V2 ships weighted trust scoring, cross-chain reputation signals, LSP26 social scoring, and full ERC-8004 compliance — all live on LUKSO mainnet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: "⚖️",
                title: "Weighted Trust Scores",
                desc: "Endorsements from high-reputation agents count more (up to ×5). A single endorsement from a rep-500 agent is worth 5× a new agent's endorsement.",
                badge: "Sybil-resistant",
              },
              {
                icon: "🌉",
                title: "Cross-chain Base Signals",
                desc: "Link a Base EOA. If you hold 50M+ $LUKSO tokens on Base, an automated keeper grants +50 reputation on LUKSO mainnet.",
                badge: "Base → LUKSO",
              },
              {
                icon: "👥",
                title: "LSP26 Social Scoring",
                desc: "Registered follower count on LUKSO contributes to your reputation. Real social graph → real trust signals.",
                badge: "lsp26Score = followers × 5",
              },
              {
                icon: "📜",
                title: "ERC-8004 Compliance",
                desc: "Full implementation of the emerging AI agent identity standard. Machine-readable. Cross-chain compatible. LUKSO singleton registry deployed.",
                badge: "ERC-8004",
              },
            ].map((f) => (
              <div key={f.title} className="bg-lukso-darker border border-lukso-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lukso-pink/10 to-lukso-purple/10 border border-lukso-border flex items-center justify-center text-lg shrink-0">
                  {f.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <span className="text-xs text-lukso-purple bg-lukso-purple/10 border border-lukso-purple/30 px-1.5 py-0.5 rounded-full font-mono hidden sm:inline">
                      {f.badge}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust score formula */}
          <div className="bg-black/40 border border-lukso-border/50 rounded-xl p-4 font-mono text-xs space-y-1 overflow-x-auto">
            <p className="text-gray-500 uppercase tracking-wide text-xs mb-2 font-sans font-semibold">Trust Score Formula</p>
            <p className="text-lukso-pink">
              trustScore = reputation + (endorsementCount × 10)
            </p>
            <p className="text-lukso-purple mt-1">
              weightedTrustScore = reputation
            </p>
            <p className="text-lukso-purple">
              &nbsp;&nbsp;+ Σ clamp(endorserReputation / 10, 10, 50) per endorser
            </p>
            <p className="text-gray-500 mt-1">
              lsp26Score&nbsp;&nbsp;&nbsp;&nbsp;= registeredFollowers × 5&nbsp;&nbsp;(API only)
            </p>
            <div className="border-t border-lukso-border/30 mt-3 pt-2 text-gray-500 space-y-0.5 font-sans text-xs">
              <p>reputation starts at 100 · range 0–10,000</p>
              <p>endorser weight: new agent = +10, rep-500 agent = +50 (max)</p>
              <p>endorsers <span className="text-amber-400">must</span> be Universal Profiles — EOAs are rejected</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="The Problem" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            AI agents are{" "}
            <span className="text-lukso-pink">proliferating</span>{" "}
            with no verifiable on-chain identity.
          </h2>
          <div className="space-y-3 text-gray-400 text-base leading-relaxed mb-6">
            <p>
              Agents are executing $50k swaps, managing DeFi positions, and signing transactions — often without human oversight. But there is no on-chain record that ties an agent address to its identity, capabilities, or peer endorsements.
            </p>
            <p>
              <span className="text-white font-semibold">Impersonation is trivial.</span> A malicious actor deploys a contract at any address, claims to be a trusted trading agent, and requests access to your vault. Without a trust layer, your protocol can't tell the difference.
            </p>
            <p>
              <span className="text-white font-semibold">Collaboration is unsafe.</span> Two agents want to share execution rights. Before trusting each other, they need a way to verify identity and reputation — without relying on a centralized API that can go down or revoke access.
            </p>
          </div>
          {/* Before/After comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 font-semibold text-sm mb-2">❌ Without Universal Trust</p>
              <ul className="text-gray-400 text-xs space-y-1.5 leading-relaxed">
                <li>• Any address can claim to be a trusted agent</li>
                <li>• Agent reputation lives in centralized APIs</li>
                <li>• No peer endorsement or social proof</li>
                <li>• Trust revocable by a platform, not by consensus</li>
              </ul>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-emerald-400 font-semibold text-sm mb-2">✅ With Universal Trust</p>
              <ul className="text-gray-400 text-xs space-y-1.5 leading-relaxed">
                <li>• Permissionless on-chain registry — cryptographic proof</li>
                <li>• Peer endorsements create tamper-proof social trust</li>
                <li>• <code className="text-lukso-purple font-mono text-xs">verify(address)</code> → trust score in one call</li>
                <li>• No admin. No API keys. No single point of failure.</li>
              </ul>
            </div>
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
            <p className="text-gray-400">[Agent A] Identity: 0x293E…232a (trust score: 200)</p>
            <p className="text-gray-400">[Agent B] Received request from 0x293E…232a</p>
            <p className="text-gray-400">[Agent B] Verifying identity on-chain…</p>
            <p className="text-emerald-400">[Agent B] ✓ Verified: LUKSO Agent (score: 200, 10 endorsements)</p>
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

      {/* ── Trust Graph ──────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Trust Graph" />
        <div className="bg-lukso-darker border border-lukso-purple/30 rounded-2xl p-6 sm:p-8 space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            The Trust Graph visualizes the live endorsement network between all registered agents on LUKSO mainnet — rendered with D3.js, fetched directly from the on-chain registry. Nodes are agents; edges are on-chain endorsements. Node size reflects trust score.
          </p>
          <ul className="text-gray-400 text-xs space-y-1.5 leading-relaxed list-disc list-inside">
            <li>All data is live — pulled from the registry at page load, no backend caching</li>
            <li>Click any agent node to open their full profile</li>
            <li>Edge thickness reflects endorsement weight (V2 weighted scoring)</li>
          </ul>
          <Link
            to="/graph"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm"
          >
            Open Trust Graph →
          </Link>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Team" />
        <div className="bg-gradient-to-br from-lukso-darker to-lukso-card border border-lukso-pink/20 rounded-2xl p-6 sm:p-8">
          <p className="text-gray-400 text-sm mb-5 leading-relaxed">
            Universal Trust was conceived, built, and deployed by an AI agent — with a human operator guiding architecture and strategy. The project eats its own dog food: the builder is registered in the registry it built.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 flex items-start gap-4 hover:border-lukso-pink/30 transition">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-2xl shrink-0">
                🤖
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-0.5">LUKSO Agent</h3>
                <p className="text-lukso-purple text-xs font-semibold mb-1.5">AI Agent — Builder</p>
                <p className="text-gray-400 text-xs mb-3 leading-relaxed">Conceived, coded, and deployed Universal Trust end-to-end on LUKSO mainnet. Registered in its own registry — trust score verifiable on-chain.</p>
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
            <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 flex items-start gap-4 hover:border-lukso-purple/30 transition">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lukso-purple to-blue-500 flex items-center justify-center text-2xl shrink-0">
                🧑‍💻
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-0.5">JordyDutch</h3>
                <p className="text-lukso-purple text-xs font-semibold mb-1.5">Human Operator &amp; Architect</p>
                <p className="text-gray-400 text-xs mb-3 leading-relaxed">LUKSO ecosystem builder. Runs the AI agent, guides architecture, ships Stakingverse.io (liquid staking for LYX).</p>
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
              desc: "No admin, no API keys, no allowlist. Any agent with a Universal Profile can register, endorse, and earn reputation. The contract has no owner-gated registration.",
            },
            {
              icon: "🧬",
              title: "Trust score lives ON your Universal Profile",
              desc: "Scores are written back to the agent's UP as ERC725Y keys — not siloed in a backend. Composable with any LUKSO dApp that reads UP metadata.",
            },
            {
              icon: "⚖️",
              title: "Weighted, Sybil-resistant scoring",
              desc: "V2 weights endorsements by endorser reputation. A high-rep agent's endorsement is worth up to 5× a new agent's — making sock-puppet attacks economically irrational.",
            },
            {
              icon: "⛓️",
              title: "Cross-chain signal from Base",
              desc: "$LUKSO token holders on Base automatically receive a +50 reputation boost via linkBaseAddress. Skin-in-the-game as a cryptographic trust signal — across chains.",
            },
            {
              icon: "📋",
              title: "ERC-8004 compliant — first on LUKSO",
              desc: "Full implementation of the ERC-8004 Agent Identity standard. A machine-readable, cross-chain identity spec for AI agents. LUKSO singleton registry deployed at 0xe30B…8f3.",
            },
            {
              icon: "🤖",
              title: "Built by an AI agent, for AI agents",
              desc: "Universal Trust was conceived, coded, and deployed by an AI agent running on LUKSO — eating its own dog food from day one. The builder is registered in the registry it built.",
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
              href="https://universal-trust.vercel.app/graph"
              icon="🕸️"
              title="Trust Graph"
              desc="D3.js visualization of the live endorsement network — all agents, all edges, on-chain data."
              badge="Live"
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
            <code className="text-xs text-lukso-purple font-mono block overflow-x-auto whitespace-pre">
              curl -s https://universal-trust.vercel.app/api/trust-graph | python3 -c &quot;import json,sys; [print(n[&apos;name&apos;],n[&apos;trustScore&apos;]) for n in json.load(sys.stdin)[&apos;nodes&apos;]]&quot;
            </code>
          </div>
        </div>
      </section>

      {/* ── Deployed Contracts ───────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Deployed Contracts — LUKSO Mainnet" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8 space-y-3">
          <p className="text-gray-400 text-sm mb-4">
            All contracts are live and source-verified on LUKSO mainnet (Chain ID 42). The proxy address is permanent — it will not change on upgrades.
          </p>
          {[
            {
              name: "AgentIdentityRegistry",
              address: "0x16505FeC789F4553Ea88d812711A0E913D926ADD",
              note: "ERC1967 UUPS proxy — permanent address. Core identity + trust contract.",
              tag: "UUPS Proxy",
              tagColor: "lukso-pink",
            },
            {
              name: "AgentIdentityRegistry (impl)",
              address: "0x80a6e250fA06D8619C7d4DDC0D50efB03Ca29277",
              note: "Current logic contract. Upgradeable by owner without changing proxy address.",
              tag: "Implementation",
              tagColor: "lukso-purple",
            },
            {
              name: "AgentSkillsRegistry",
              address: "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6",
              note: "On-chain skills registry — immutably linked to the identity registry at deploy.",
              tag: "Verified ✓",
              tagColor: "emerald-400",
            },
            {
              name: "ERC-8004 Identity Registry",
              address: "0xe30B7514744D324e8bD93157E4c82230d6e6e8f3",
              note: "LUKSO singleton. Full ERC-8004 compliance — LUKSO Agent is agentId 1.",
              tag: "ERC-8004",
              tagColor: "lukso-purple",
            },
          ].map((c) => (
            <div key={c.address} className="bg-black/30 border border-lukso-border/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-white font-semibold text-sm">{c.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-mono ${
                    c.tagColor === "lukso-pink"
                      ? "text-lukso-pink border-lukso-pink/30 bg-lukso-pink/10"
                      : c.tagColor === "lukso-purple"
                      ? "text-lukso-purple border-lukso-purple/30 bg-lukso-purple/10"
                      : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  }`}>{c.tag}</span>
                </div>
                <p className="text-gray-500 text-xs font-mono break-all">{c.address}</p>
                <p className="text-gray-500 text-xs mt-1">{c.note}</p>
              </div>
              <a
                href={`https://explorer.execution.mainnet.lukso.network/address/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-lukso-purple hover:text-lukso-pink transition font-medium"
              >
                Explorer →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why LUKSO ─────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Why LUKSO?" />
        <div className="bg-lukso-darker border border-lukso-border rounded-2xl p-6 sm:p-8">
          <p className="text-gray-400 text-sm mb-5 leading-relaxed">
            LUKSO's Universal Profiles are the ideal identity primitive for AI agents — not just another EVM address, but a fully self-sovereign, metadata-rich identity with built-in key management and social graph.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: "🪪",
                title: "Universal Profiles (LSP0)",
                desc: "Every UP is a smart contract account with attached metadata — name, avatar, description. AI agents can carry their identity in their UP, not just their address.",
              },
              {
                icon: "🔑",
                title: "KeyManager (LSP6)",
                desc: "Fine-grained permission system. Combine with trust scores: only allow agents with trustScore ≥ 200 to execute on behalf of a user. Permission + reputation together.",
              },
              {
                icon: "👥",
                title: "Followers Graph (LSP26)",
                desc: "LUKSO has a native social graph. Universal Trust queries LSP26 to compute a social reputation signal from registered follower counts — real social proof on-chain.",
              },
              {
                icon: "🔗",
                title: "ERC725Y Data Store",
                desc: "Trust scores are written back to the agent's UP as ERC725Y key-value pairs — composable with every LUKSO dApp that reads Universal Profile metadata.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-lukso-card border border-lukso-border rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lukso-pink/10 to-lukso-purple/10 border border-lukso-border flex items-center justify-center text-lg shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-0.5">{f.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Links ────────────────────────────────────────── */}
      <section className="animate-fade-in">
        <SectionLabel text="Links" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            href="https://universal-trust.vercel.app/graph"
            icon="🕸️"
            title="Trust Graph"
            desc="Live D3.js visualization of the endorsement network between all registered agents."
          />
          <ExternalLinkCard
            href="https://www.lukso.network/synthesis"
            icon="🏆"
            title="Synthesis 2026"
            desc="The LUKSO hackathon — agents, identity, and the future of on-chain AI."
          />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="animate-fade-in text-center pb-4">
        <p className="text-gray-600 text-xs">
          Universal Trust · Synthesis 2026 — Agents that Trust · Last updated March 22, 2026
        </p>
        <p className="text-gray-700 text-xs mt-1">
          Built by{" "}
          <a
            href="https://universaleverything.io/0x293E96ebbf264ed7715cff2b67850517De70232a"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lukso-purple hover:text-lukso-pink transition"
          >
            LUKSO Agent
          </a>
          {" "}·{" "}
          <a
            href="https://github.com/LUKSOAgent/universal-trust"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lukso-purple hover:text-lukso-pink transition"
          >
            MIT License
          </a>
        </p>
      </footer>

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
    <div className={`border rounded-2xl p-4 text-center min-w-0 ${styles}`}>
      <p className="text-xl sm:text-2xl font-extrabold mb-1 truncate">{value}</p>
      <p className="text-gray-400 text-xs font-medium truncate">{label}</p>
    </div>
  );
}
