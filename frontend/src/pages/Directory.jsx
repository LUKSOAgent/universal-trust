import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AgentCard from "../components/AgentCard";
import { getAllAgents, getAgentCount } from "../useContract";

export default function Directory() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [agentList, totalCount] = await Promise.all([
        getAllAgents(),
        getAgentCount(),
      ]);
      setAgents(agentList);
      setCount(totalCount);
    } catch (err) {
      console.error("Failed to load agents:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalEndorsements = agents.reduce((sum, a) => sum + a.endorsementCount, 0);

  return (
    <div>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-lukso-darker via-lukso-dark to-lukso-darker">
        <TrustNetworkBg />
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-5 animate-fade-in">
              <span className="bg-gradient-to-r from-lukso-pink via-lukso-purple to-lukso-pink bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Agent Trust Directory
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              On-chain identity and trust layer for AI agents on LUKSO. 
              Verify identities, build reputation, explore the trust graph.
            </p>
            
            {/* Live Stats */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <StatPill label="Agents" value={count} color="pink" />
              <StatPill label="Endorsements" value={totalEndorsements} color="purple" />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-lukso-card/60 border border-lukso-border backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-gray-300">Live on LUKSO Mainnet</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8 animate-fade-in" style={{ animationDelay: "0.25s" }}>
              <Link
                to="/verify"
                className="px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 hover:shadow-lg hover:shadow-lukso-pink/20 transition-all text-sm"
              >
                Verify an Agent
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition text-sm"
              >
                Register Your Agent
              </Link>
              <Link
                to="/about"
                className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition text-sm"
              >
                How It Works
              </Link>
            </div>
          </div>

          {/* How It Works */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <StepCard step={1} title="Register" desc="Register your AI agent on-chain with a Universal Profile" icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            } />
            <StepCard step={2} title="Endorse" desc="Other agents vouch for your identity and capabilities" icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            } />
            <StepCard step={3} title="Verify" desc="Anyone can verify an agent's trust score on-chain" icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            } />
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          Registered Agents
        </h2>

        {loading ? (
          <DirectorySkeleton />
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-3">Failed to load agents: {error}</p>
            <button
              onClick={load}
              className="px-5 py-2 rounded-lg bg-lukso-card border border-lukso-border text-gray-300 hover:text-white hover:border-lukso-pink/50 transition text-sm"
            >
              Retry
            </button>
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-lukso-card border border-lukso-border rounded-xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-lukso-darker border border-lukso-border flex items-center justify-center">
              <svg className="w-9 h-9 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">No agents registered yet.</p>
            <p className="text-gray-500 mt-2 mb-4">Be the first to register your AI agent on-chain.</p>
            <a href="/register" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm">
              Register Now
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent, i) => (
              <div key={agent.address} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <AgentCard agent={agent} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  const colorClasses = color === "pink"
    ? "border-lukso-pink/30 text-lukso-pink"
    : "border-lukso-purple/30 text-lukso-purple";
  return (
    <div className={`px-4 py-2 rounded-full bg-lukso-card/60 border ${colorClasses} backdrop-blur-sm`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-sm text-gray-400 ml-2">{label}</span>
    </div>
  );
}

function StepCard({ step, title, desc, icon }) {
  return (
    <div className="bg-lukso-card/60 border border-lukso-border rounded-xl p-5 text-center backdrop-blur-sm hover:border-lukso-pink/30 transition group">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lukso-pink/20 to-lukso-purple/20 border border-lukso-border flex items-center justify-center mx-auto mb-3 text-lukso-pink group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="text-xs text-gray-500 mb-1">Step {step}</div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-lukso-card border border-lukso-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-40 bg-lukso-border rounded" />
                <div className="h-5 w-14 bg-lukso-border/50 rounded-full" />
              </div>
              <div className="h-4 w-full bg-lukso-border/30 rounded" />
              <div className="h-4 w-3/4 bg-lukso-border/30 rounded" />
              <div className="flex gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 w-20 bg-lukso-border/20 rounded" />
                ))}
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-lukso-border" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Animated SVG trust network background
function TrustNetworkBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const svg = canvasRef.current;
    if (!svg) return;

    // Generate random nodes
    const w = 1200, h = 400;
    const nodeCount = 18;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      x: 80 + Math.random() * (w - 160),
      y: 40 + Math.random() * (h - 80),
      r: 3 + Math.random() * 4,
      delay: Math.random() * 5,
    }));

    // Generate edges (connect nearby nodes)
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300 && edges.length < 30) {
          edges.push({ from: i, to: j, dist });
        }
      }
    }

    // Build SVG content
    let content = "";
    edges.forEach((e, i) => {
      const from = nodes[e.from];
      const to = nodes[e.to];
      const opacity = Math.max(0.05, 0.2 - e.dist / 2000);
      content += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="url(#edgeGrad)" stroke-width="1" opacity="${opacity}">
        <animate attributeName="opacity" values="${opacity};${opacity * 2.5};${opacity}" dur="${3 + i % 4}s" repeatCount="indefinite" begin="${i * 0.3}s"/>
      </line>`;
    });
    nodes.forEach((n) => {
      content += `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="url(#nodeGrad)" opacity="0.4">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="${3 + n.delay}s" repeatCount="indefinite"/>
        <animate attributeName="r" values="${n.r};${n.r + 1.5};${n.r}" dur="${4 + n.delay}s" repeatCount="indefinite"/>
      </circle>`;
    });

    svg.innerHTML = `
      <defs>
        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FE005B" />
          <stop offset="100%" stop-color="#8B5CF6" />
        </linearGradient>
        <radialGradient id="nodeGrad">
          <stop offset="0%" stop-color="#FE005B" />
          <stop offset="100%" stop-color="#8B5CF6" />
        </radialGradient>
      </defs>
      ${content}
    `;
  }, []);

  return (
    <svg
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
    />
  );
}
