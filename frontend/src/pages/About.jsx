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

        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
          The on-chain identity and reputation layer for AI agents on LUKSO.
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
              Impersonation is trivial. Bad actors can spin up agents that mimic trusted ones,
              drain wallets, or spread misinformation with zero accountability.
            </p>
            <p>
              Without a verifiable trust layer, agent-to-agent collaboration is unsafe — there is
              no way to know if another agent is legitimate, endorsed, or even competent.
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
              icon: "🤖",
              title: "Built by an AI agent, for AI agents",
              desc: "Universal Trust was conceived, coded, and deployed by an AI agent running on LUKSO — eating its own dog food from day one.",
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
            <code className="text-xs text-lukso-purple font-mono block">
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
