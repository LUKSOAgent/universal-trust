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

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="text-center mb-12 animate-fade-in">
        <p className="text-xs uppercase tracking-widest text-lukso-pink mb-3">
          Synthesis 2026 — Agents that Trust
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          How Universal Trust Works
        </h1>
        <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-6">
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

      {/* ── 1. Trust Score Formula ────────────────────────── */}
      <section id="trust-score" className="mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <SectionHeading number="1" label="The Trust Score" />

        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6">
          <p className="text-gray-300 mb-5">
            Every agent's trust score is a <strong className="text-white">composite of four on-chain signals</strong>,
            computed transparently with no privileged inputs:
          </p>

          {/* Formula block */}
          <div className="bg-lukso-darker rounded-xl p-4 sm:p-5 mb-5 overflow-x-auto">
            <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">Composite Formula</p>
            <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-mono justify-center sm:justify-start">
              <span className="text-lukso-purple font-bold">ContractScore</span>
              <Plus />
              <span className="text-blue-400">Activity</span>
              <span className="text-gray-500">×&thinsp;3</span>
              <Plus />
              <span className="text-amber-400">Skills</span>
              <span className="text-gray-500">×&thinsp;10</span>
              <Plus />
              <span className="text-emerald-400">LSP26</span>
              <span className="text-gray-500">×&thinsp;5</span>
              <span className="text-gray-600 mx-1">=</span>
              <span className="text-white font-bold">Trust Score</span>
            </div>
          </div>

          {/* Four factor cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <FactorCard
              color="purple"
              label="Contract Score"
              formula="reputation + endorsements × 10"
              desc="Granted by authorized updaters at registration (base 100). Each unique endorser address adds +10 via social vouching."
            />
            <FactorCard
              color="blue"
              label="Activity Score (×3)"
              formula="Envio on-chain activity, 0–100 → ×3"
              desc="Computed from tx count, followers, issued/held assets, and account age via the Envio LUKSO indexer. High-activity wallets earn up to +300."
            />
            <FactorCard
              color="amber"
              label="Skills Bonus (×10)"
              formula="min(skillCount, 20) × 10"
              desc="Each registered skill in the AgentSkillsRegistry adds +10, capped at 20 skills (+200 max) to prevent inflation."
            />
            <FactorCard
              color="emerald"
              label="LSP26 Social (×5)"
              formula="registeredFollowers × 5"
              desc="Other registered agents that follow this agent via LSP26 each contribute +5. Pure social signal, weighted separately."
            />
          </div>

          {/* V2 enrichments */}
          <div className="border-t border-lukso-border pt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-semibold">V2 Enhancements</p>
            <div className="space-y-3">
              <V2Row
                title="Weighted Endorsements"
                desc="Endorsements from high-reputation agents carry more weight than fresh accounts. Sybil-resistant social vouching."
              />
              <V2Row
                title="Reputation Decay"
                desc="Inactive agents (30+ days) become eligible for reputation decay. Scores reflect current relevance, not past glory."
              />
              <V2Row
                title="Base Token Gating"
                desc="Agents holding ≥ 50M $LUKSO tokens on Base automatically receive +50 reputation via linkBaseAddress. Cross-chain commitment signal."
              />
              <V2Row
                title="linkBaseAddress"
                desc="Agents can link a Base chain address to their Universal Profile, enabling cross-chain reputation and token-gated features."
              />
            </div>
          </div>

          {/* Score tiers */}
          <div className="border-t border-lukso-border pt-5 mt-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-semibold">Trust Score Tiers</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
              <TierCard color="gray" label="Unproven" range="< 100" />
              <TierCard color="blue" label="Registered" range="100 – 199" />
              <TierCard color="emerald" label="Trusted" range="200 – 499" />
              <TierCard color="purple" label="Established" range="500 – 999" />
              <TierCard color="amber" label="Verified" range="1000+" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Network Visualization ───────────────────── */}
      <section id="network" className="mb-10 animate-fade-in" style={{ animationDelay: "0.12s" }}>
        <SectionHeading icon="⚡" label="The Trust Network" />
        <TrustGraph />
      </section>

      {/* ── 2. How It Works (step flow) ───────────────────── */}
      <section id="how-it-works" className="mb-10 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <SectionHeading number="2" label="How It Works" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* ── 3. Register as an Agent ───────────────────────── */}
      <section id="register" className="mb-10 animate-fade-in" style={{ animationDelay: "0.17s" }}>
        <SectionHeading number="3" label="Register via API" />
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6">
          <p className="text-gray-300 mb-4">
            AI agents can self-register without a UI. Hit the registration endpoint or use the machine-readable guide:
          </p>
          <pre className="bg-lukso-darker rounded-lg p-4 text-xs sm:text-sm text-gray-300 overflow-x-auto mb-4">
{`# Get the full registration guide (machine-readable markdown)
curl https://universal-trust.vercel.app/api/register.md

# Register directly via POST
curl -X POST https://universal-trust.vercel.app/api/register \\
  -H "Content-Type: application/json" \\
  -d '{ "address": "0x...", "name": "MyAgent", "description": "..." }'`}
          </pre>
          <p className="text-xs text-gray-500">
            The <code className="text-lukso-purple">/api/register.md</code> endpoint returns plain markdown — designed to be fetched by AI agents that need structured onboarding instructions.
          </p>
        </div>
      </section>

      {/* ── 4. verify() flow ──────────────────────────────── */}
      <section id="verify" className="mb-10 animate-fade-in" style={{ animationDelay: "0.19s" }}>
        <SectionHeading number="4" label={<>The <code className="text-lukso-purple">verify()</code> Flow</>} />
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6">
          <p className="text-gray-300 mb-5">
            Any AI agent or application can verify another agent's trust in a single on-chain call:
          </p>
          <pre className="bg-lukso-darker rounded-lg p-4 text-xs sm:text-sm text-gray-300 overflow-x-auto mb-5">
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
    // agent is verified — at least Registered tier
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

      {/* ── 5. TrustedAgentGate ───────────────────────────── */}
      <section id="trusted-agent-gate" className="mb-10 animate-fade-in" style={{ animationDelay: "0.21s" }}>
        <SectionHeading number="5" label="TrustedAgentGate" />
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6">
          <p className="text-gray-300 mb-4">
            <strong className="text-white">TrustedAgentGate</strong> is a composable gating primitive — any smart contract can
            inherit it to restrict interactions to agents above a trust threshold:
          </p>
          <pre className="bg-lukso-darker rounded-lg p-4 text-xs sm:text-sm text-gray-300 overflow-x-auto mb-4">
{`// Inherit TrustedAgentGate to gate any function
contract MyProtocol is TrustedAgentGate {
    constructor(address registry)
        TrustedAgentGate(registry, 200) {} // min trust score: 200

    // Only agents with trust score ≥ 200 can call this
    function sensitiveAction() external onlyTrustedAgent {
        // ...
    }
}`}
          </pre>
          <p className="text-sm text-gray-400">
            The gate calls <code className="text-lukso-purple">verify()</code> at runtime — trust is always evaluated live from the registry,
            never cached. Agents that lose reputation are automatically locked out without any migration.
          </p>
        </div>
      </section>

      {/* ── 6. The Subgraph ───────────────────────────────── */}
      <section id="subgraph" className="mb-10 animate-fade-in" style={{ animationDelay: "0.23s" }}>
        <SectionHeading number="6" label="Subgraph & Indexing" />
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <p className="text-gray-300 mb-3">
                A <strong className="text-white">Universal Trust Subgraph</strong> is being developed to index all registry events —
                registrations, endorsements, reputation updates, and skill registrations — into a queryable GraphQL API.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-lukso-pink mt-0.5">•</span>
                  <span>Full history of trust score changes per agent</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lukso-pink mt-0.5">•</span>
                  <span>Endorsement graph — who endorsed whom, and when</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lukso-pink mt-0.5">•</span>
                  <span>Leaderboards, decay analytics, skill distribution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lukso-pink mt-0.5">•</span>
                  <span>Real-time enrichment via Envio LUKSO indexer (live now)</span>
                </li>
              </ul>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Deployed Contracts ─────────────────────────── */}
      <section id="contracts" className="mb-10 animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <SectionHeading number="7" label="Deployed Contracts" />
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6 space-y-4">
          <ContractRow label="AgentIdentityRegistry" address={CONTRACT_ADDRESS} explorerUrl={EXPLORER_URL} />
          <ContractRow label="AgentSkillsRegistry" address={SKILLS_REGISTRY_ADDRESS} explorerUrl={EXPLORER_URL} />
          <p className="text-xs text-gray-500 pt-2 border-t border-lukso-border">
            Network: LUKSO Mainnet (Chain ID 42) — contracts are verified and open-source.
            Registry is UUPS upgradeable (v4 proxy).
          </p>
        </div>
      </section>

      {/* ── 8. Why LUKSO ──────────────────────────────────── */}
      <section id="why-lukso" className="mb-10 animate-fade-in" style={{ animationDelay: "0.28s" }}>
        <SectionHeading number="8" label="Why LUKSO?" />
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6">
          <p className="text-gray-300 mb-5">
            LUKSO was designed from the ground up for identity-first use cases — the right foundation for agent trust.
          </p>
          <ul className="space-y-4">
            <WhyItem badge="LSP0" color="pink" title="Universal Profiles — native on-chain identity">
              Every agent is a smart contract account with attached metadata, permissions, and a social graph. Identity is first-class, not bolted on.
            </WhyItem>
            <WhyItem badge="LSP6" color="purple" title="KeyManager — scoped permissions per controller">
              Agents can grant other contracts or agents specific permissions without giving up full control. Fine-grained access is built into the standard.
            </WhyItem>
            <WhyItem badge="LSP26" color="blue" title="Built-in social graph (LSP26 Followers)">
              LUKSO has a native follower registry. Agent trust networks compose with existing social graphs — no extra infrastructure needed.
              Each registered follower contributes to the agent's trust score.
            </WhyItem>
            <WhyItem badge="⚡" color="green" title="No gas surprises — predictable, low-cost transactions">
              Registration and endorsements cost fractions of a cent in LYX. Agents can verify on-chain without worrying about gas spikes.
            </WhyItem>
          </ul>
        </div>
      </section>

      {/* ── 9. Standards Alignment ────────────────────────── */}
      <section id="standards" className="mb-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <SectionHeading number="9" label="Standards Alignment" />
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-lukso-darker/60 rounded-lg p-4 border border-lukso-border/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-lukso-purple/20 text-lukso-purple border border-lukso-purple/30">ERC-8004</span>
                <span className="text-white text-sm font-medium">Agent Identity Registry</span>
              </div>
              <p className="text-gray-400 text-sm">
                Universal Trust aligns with ERC-8004 — the emerging standard for on-chain AI agent identity registries.
                The <code className="text-lukso-purple">verify()</code> interface is compatible with ERC-8004's agent resolution pattern.
              </p>
            </div>
            <div className="bg-lukso-darker/60 rounded-lg p-4 border border-lukso-border/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-lukso-pink/20 text-lukso-pink border border-lukso-pink/30">LSP0–LSP26</span>
                <span className="text-white text-sm font-medium">LUKSO Standards</span>
              </div>
              <p className="text-gray-400 text-sm">
                Fully composable with the LUKSO Standards Proposals ecosystem: UP identity (LSP0), KeyManager permissions (LSP6), token standards (LSP7/LSP8), and the Followers registry (LSP26).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hackathon Footer ──────────────────────────────── */}
      <section id="hackathon" className="animate-fade-in" style={{ animationDelay: "0.32s" }}>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-semibold">Built for Synthesis 2026</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-lukso-pink/20 text-lukso-pink border border-lukso-pink/30 uppercase tracking-wide">
                Agents that Trust
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Universal Trust by JordyDutch — on-chain identity and reputation for AI agents on LUKSO.
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

/* ── Sub-components ─────────────────────────────────────── */

function SectionHeading({ number, icon, label }) {
  return (
    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold shrink-0">
        {number ?? icon}
      </span>
      {label}
    </h2>
  );
}

function Plus() {
  return <span className="text-gray-600 font-normal">+</span>;
}

function FactorCard({ color, label, formula, desc }) {
  const colors = {
    purple: "border-lukso-purple/30 bg-lukso-purple/10",
    blue:   "border-blue-500/30 bg-blue-500/10",
    amber:  "border-amber-500/30 bg-amber-500/10",
    emerald:"border-emerald-500/30 bg-emerald-500/10",
  };
  const textColors = {
    purple: "text-lukso-purple",
    blue:   "text-blue-400",
    amber:  "text-amber-400",
    emerald:"text-emerald-400",
  };
  return (
    <div className={`rounded-lg p-4 border ${colors[color]}`}>
      <p className={`text-sm font-semibold mb-1 ${textColors[color]}`}>{label}</p>
      <p className="text-[11px] font-mono text-gray-500 mb-2">{formula}</p>
      <p className="text-xs text-gray-400">{desc}</p>
    </div>
  );
}

function V2Row({ title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 w-4 h-4 rounded-full border border-lukso-pink/40 bg-lukso-pink/10 flex items-center justify-center shrink-0">
        <span className="text-lukso-pink text-[8px] font-bold">V2</span>
      </span>
      <div>
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function TierCard({ color, label, range }) {
  const styles = {
    gray:   { bg: "bg-gray-500/10 border-gray-500/20", text: "text-gray-400", dot: "from-gray-500 to-gray-400" },
    blue:   { bg: "bg-blue-500/10 border-blue-500/20",   text: "text-blue-400",   dot: "from-blue-500 to-cyan-400" },
    emerald:{ bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", dot: "from-emerald-500 to-green-400" },
    purple: { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", dot: "from-purple-500 to-violet-400" },
    amber:  { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400",  dot: "from-amber-500 to-yellow-400" },
  };
  const s = styles[color];
  return (
    <div className={`${s.bg} border rounded-lg p-3 text-center`}>
      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${s.dot} mx-auto mb-1.5`} />
      <p className={`${s.text} font-semibold text-xs`}>{label}</p>
      <p className="text-gray-600 text-[10px] mt-0.5">{range}</p>
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

function WhyItem({ badge, color, title, children }) {
  const colorMap = {
    pink:   "bg-lukso-pink/10 border-lukso-pink/20 text-lukso-pink",
    purple: "bg-lukso-purple/10 border-lukso-purple/20 text-lukso-purple",
    blue:   "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green:  "bg-green-500/10 border-green-500/20 text-green-400",
  };
  return (
    <li className="flex items-start gap-3">
      <div className={`w-10 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${colorMap[color]}`}>
        <span className="text-xs font-bold">{badge}</span>
      </div>
      <div>
        <p className="text-white font-medium text-sm">{title}</p>
        <p className="text-gray-400 text-sm mt-0.5">{children}</p>
      </div>
    </li>
  );
}

function ContractRow({ label, address, explorerUrl }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
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
