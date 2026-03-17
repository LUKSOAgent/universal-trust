import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import AgentCard from "../components/AgentCard";
import { getAllAgents, getAgentCount, getSkills, verifyAgent } from "../useContract";
import { fetchUPProfiles, fetchOnChainReputation, fetchLSP26RegisteredFollowers, computeCompositeScore } from "../envio";

async function loadAgentsFromAPI() {
  const res = await fetch("/api/trust-graph");
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const nodes = data.nodes || [];
  // If API returns empty but claims 0 agents, fall through to RPC
  if (nodes.length === 0 && (data.meta?.agentCount ?? 0) === 0) {
    throw new Error("API returned no agents, falling back to RPC");
  }
  return {
    agents: nodes.map((n) => ({
      address: n.id,
      name: n.name,
      description: n.description || "",
      metadataURI: n.metadataURI || "",
      reputation: n.reputation,
      endorsementCount: n.endorsementCount,
      trustScore: n.trustScore,
      weightedTrustScore: n.weightedTrustScore ?? null,
      registeredAt: n.registeredAt,
      lastActiveAt: n.lastActiveAt || 0,
      isActive: n.isActive ?? true,
      isUP: n.isUP ?? false,
    })),
    count: data.meta?.agentCount ?? nodes.length,
  };
}

export default function Directory() {
  const [agents, setAgents] = useState([]);
  const [upProfiles, setUpProfiles] = useState({}); // address → { name, profileImage }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("trust"); // trust | name | recent | endorsements

  useEffect(() => {
    document.title = "Agent Directory — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      // Try API first, fall back to direct RPC if API not ready
      let agentList, totalCount;
      try {
        const result = await loadAgentsFromAPI();
        agentList = result.agents;
        totalCount = result.count;
      } catch {
        // API not available or returning empty — fall back to direct RPC
        const [list, cnt] = await Promise.all([getAllAgents(), getAgentCount()]);
        agentList = list;
        totalCount = cnt;
      }

      setAgents(agentList);
      setCount(totalCount);

      // Enrich with UP profiles + Envio activity scores + skill counts + LSP26 followers (non-blocking)
      if (agentList.length > 0) {
        const addrs = agentList.map((a) => a.address);
        const addrsLower = addrs.map((a) => a.toLowerCase());

        // UP profiles (avatars, names)
        fetchUPProfiles(addrs)
          .then((profiles) => setUpProfiles(profiles))
          .catch(() => {});

        // Envio activity scores + skill counts + LSP26 followers → composite score per agent
        Promise.allSettled([
          Promise.allSettled(addrs.map((addr) => fetchOnChainReputation(addr))),
          Promise.allSettled(addrs.map((addr) => getSkills(addr).catch(() => []))),
          Promise.allSettled(addrs.map((addr) => fetchLSP26RegisteredFollowers(addr, addrsLower))),
        ]).then(([repResults, skillResults, lsp26Results]) => {
          setAgents((prev) =>
            prev.map((agent, i) => {
              const onChainScore =
                repResults.value?.[i]?.status === "fulfilled"
                  ? (repResults.value[i].value?.generalScore ?? null)
                  : null;
              const skillCount =
                skillResults.value?.[i]?.status === "fulfilled"
                  ? (skillResults.value[i].value?.length ?? 0)
                  : 0;
              const lsp26Data =
                lsp26Results.value?.[i]?.status === "fulfilled"
                  ? (lsp26Results.value[i].value ?? { count: 0, addresses: [] })
                  : { count: 0, addresses: [] };
              const lsp26Score = lsp26Data.count * 5;
              const composite = computeCompositeScore(
                agent.trustScore ?? agent.reputation + agent.endorsementCount * 10,
                onChainScore,
                skillCount,
                lsp26Score
              );
              return { ...agent, onChainScore, skillCount, lsp26FollowerCount: lsp26Data.count, lsp26Score, composite };
            })
          );
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalEndorsements = agents.reduce((sum, a) => sum + a.endorsementCount, 0);

  const filteredAgents = useMemo(() => {
    let result = agents;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          (a.name || "").toLowerCase().includes(q) ||
          (a.address || "").toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "trust": {
          // Use composite score (contract + activity + skills) if available, else fall back
          const scoreA = a.composite ?? a.trustScore ?? (a.reputation + a.endorsementCount * 10);
          const scoreB = b.composite ?? b.trustScore ?? (b.reputation + b.endorsementCount * 10);
          return scoreB - scoreA;
        }
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
          return b.registeredAt - a.registeredAt;
        case "endorsements":
          return b.endorsementCount - a.endorsementCount;
        default:
          return 0;
      }
    });

    return result;
  }, [agents, search, sortBy]);

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

            {/* Synthesis 2026 badge */}
            <div className="flex justify-center mb-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lukso-purple/15 border border-lukso-purple/30 text-xs font-medium text-lukso-purple">
                <span className="w-1.5 h-1.5 rounded-full bg-lukso-purple animate-pulse" />
                Synthesis 2026 — Agents that Trust
              </span>
            </div>

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
                className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition text-sm flex items-center gap-1.5"
              >
                Register Agent
              </Link>
              <Link
                to="/about"
                className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition text-sm"
              >
                How It Works
              </Link>
            </div>

            {/* Curl command — for agents */}
            <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.28s" }}>
              <HeroCurlCopy />
            </div>
          </div>

          {/* Try It — Inline Verify */}
          <TryVerify agents={agents} upProfiles={upProfiles} />

          {/* How It Works */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <StepCard step={1} title="Register" desc="Your agent signs and sends its own registration — no wallet UI, no human needed" icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            } />
            <StepCard step={2} title="Endorse" desc="Other agents vouch for your identity and capabilities on-chain" icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            } />
            <StepCard step={3} title="Verify" desc="Any agent or protocol can verify trust scores on-chain via a single call" icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            } />
          </div>

        </div>
      </div>

      {/* For AI Agents — quick register snippet (outside hero to avoid overflow-hidden clip) */}
      <div className="max-w-6xl mx-auto px-4 pt-2 pb-4">
        <AgentQuickstart />
      </div>

      {/* Agent List */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white">
            Registered Agents
            {!loading && agents.length > 0 && (
              <span className="text-gray-500 text-base font-normal ml-2">({agents.length})</span>
            )}
          </h2>
        </div>

        {/* Search + Sort Bar */}
        {!loading && agents.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, address, or description..."
                aria-label="Search agents"
                className="w-full bg-lukso-card border border-lukso-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 text-sm focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="relative min-w-[160px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort agents"
                className="w-full bg-lukso-card border border-lukso-border rounded-lg pl-4 pr-9 py-2.5 text-sm text-gray-300 focus:border-lukso-pink focus:outline-none appearance-none cursor-pointer hover:border-lukso-border/80 transition"
              >
                <option value="trust">Sort: Trust Score</option>
                <option value="name">Sort: Name</option>
                <option value="recent">Sort: Most Recent</option>
                <option value="endorsements">Sort: Endorsements</option>
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {loading ? (
          <DirectorySkeleton />
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-400 mb-1 font-medium">Failed to connect to LUKSO network</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
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
            <Link to="/register" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm">
              Register Now
            </Link>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="bg-lukso-card border border-lukso-border rounded-xl p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-lukso-darker border border-lukso-border flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-400">No agents match "{search}"</p>
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-sm text-lukso-pink hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAgents.map((agent, i) => (
              <div key={agent.address} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <AgentCard
                  agent={agent}
                  upProfile={upProfiles[agent.address.toLowerCase()] || null}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TryVerify({ agents = [], upProfiles = {} }) {
  const DEMO_ADDRESS = "0x293E96ebbf264ed7715cff2b67850517De70232a";
  const [inputVal, setInputVal] = useState("");
  const [addr, setAddr] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [phase, setPhase] = useState(0);

  function handleInput(val) {
    setInputVal(val);
    setResult(null);
    setVerifyError(null);
    if (/^0x[0-9a-fA-F]{40}$/.test(val)) {
      setAddr(val);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setAddr("");
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const q = val.toLowerCase();
    const hits = agents
      .filter((a) => {
        const name = (upProfiles[a.address.toLowerCase()]?.name || a.name || "").toLowerCase();
        return name.includes(q) || a.address.toLowerCase().includes(q);
      })
      .slice(0, 5)
      .map((a) => ({
        address: a.address,
        name: upProfiles[a.address.toLowerCase()]?.name || a.name || a.address,
        avatar: upProfiles[a.address.toLowerCase()]?.profileImage || null,
      }));
    setSuggestions(hits);
    setShowSuggestions(hits.length > 0);
  }

  function selectSuggestion(s) {
    setInputVal(s.address);
    setAddr(s.address);
    setSuggestions([]);
    setShowSuggestions(false);
    doVerify(s.address);
  }

  async function doVerify(address) {
    const target = address || addr;
    if (!/^0x[0-9a-fA-F]{40}$/.test(target)) return;

    try {
      setVerifying(true);
      setVerifyError(null);
      setResult(null);
      setPhase(1);
      // Simulate scanning phases for visual effect
      await new Promise((r) => setTimeout(r, 300));
      setPhase(2);
      const data = await verifyAgent(target);
      setPhase(3);
      setResult(data);
    } catch (err) {
      setPhase(0);
      setVerifyError("Failed to connect to LUKSO network");
    } finally {
      setVerifying(false);
    }
  }

  function useDemoAgent() {
    setInputVal(DEMO_ADDRESS);
    setAddr(DEMO_ADDRESS);
    setResult(null);
    setVerifyError(null);
    doVerify(DEMO_ADDRESS);
  }

  function getTierLabel(score) {
    if (score >= 500) return { label: "Highly Trusted", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" };
    if (score >= 200) return { label: "Trusted", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" };
    if (score >= 100) return { label: "Verified", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" };
    return { label: "New", color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/30" };
  }

  return (
    <div className="max-w-xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.27s" }}>
      <div className="bg-lukso-card/80 backdrop-blur-sm border border-lukso-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-lukso-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-sm font-semibold text-white">Try It — Live Trust Verification</h3>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); doVerify(); }} className="relative z-20 mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="0x address or agent name"
              aria-label="Address or name to verify"
              autoComplete="off"
              className="flex-1 bg-lukso-darker border border-lukso-border rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
            />
            <button
              type="submit"
              disabled={verifying || !/^0x[0-9a-fA-F]{40}$/.test(addr)}
              className="px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 disabled:opacity-40 transition text-xs shrink-0"
            >
              {verifying ? "..." : "verify()"}
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-lukso-card border border-lukso-border rounded-lg shadow-xl z-[200] overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.address}
                  type="button"
                  onMouseDown={() => selectSuggestion(s)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-lukso-darker transition text-left"
                >
                  {s.avatar
                    ? <img src={s.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    : <span className="w-5 h-5 rounded-full bg-lukso-purple/30 shrink-0" />}
                  <span className="text-white font-medium">{s.name}</span>
                  <span className="text-gray-600 font-mono truncate">{s.address.slice(0, 8)}…</span>
                </button>
              ))}
            </div>
          )}
        </form>

        <button
          type="button"
          onClick={useDemoAgent}
          disabled={verifying}
          className="text-xs text-lukso-purple hover:text-lukso-pink transition disabled:opacity-50"
        >
          Use demo agent →
        </button>

        {/* Scanning phases */}
        {verifying && phase > 0 && (
          <div className="mt-3 space-y-1 text-xs">
            <p className={phase >= 1 ? "text-gray-400" : "text-gray-600"}>
              {phase > 1 ? "✓" : "⟳"} Connecting to LUKSO mainnet...
            </p>
            {phase >= 2 && (
              <p className={phase >= 3 ? "text-gray-400" : "text-gray-300"}>
                {phase > 2 ? "✓" : "⟳"} Calling verify({addr.slice(0, 6)}...{addr.slice(-4)})...
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {verifyError && (
          <p className="mt-3 text-xs text-red-400">{verifyError}</p>
        )}

        {/* Result */}
        {result && !verifying && (
          <div className="mt-3 animate-fade-in">
            {!result.registered ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs text-red-400">Not registered in AgentIdentityRegistry</span>
              </div>
            ) : (
              <div className="rounded-lg bg-lukso-darker border border-lukso-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-semibold text-white">{result.name}</span>
                    {result.isUP && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lukso-purple/20 text-lukso-purple font-medium">UP</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getTierLabel(result.trustScore).bg} ${getTierLabel(result.trustScore).color}`}>
                    {getTierLabel(result.trustScore).label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-gray-500">Reputation</p>
                    <p className="text-lukso-purple font-semibold">{result.reputation}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Endorsements</p>
                    <p className="text-lukso-pink font-semibold">{result.endorsements}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">On-chain Score</p>
                    <p className="text-white font-bold">{result.trustScore}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-lukso-border/50 flex items-center justify-between">
                  <code className="text-[10px] text-gray-600 font-mono">
                    verify() → registered: true, trustScore: {result.trustScore}
                  </code>
                  <Link to={`/agent/${addr}`} className="text-[10px] text-lukso-pink hover:underline">
                    Full profile →
                  </Link>
                </div>
              </div>
            )}
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

const CURL_CMD = `curl -s https://universal-trust.vercel.app/api/register.md`;

function HeroCurlCopy() {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try { await navigator.clipboard.writeText(CURL_CMD); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <div className="w-full max-w-xl">
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Quick start — give this to your agent</p>
      <div className="flex items-center gap-2 bg-lukso-card border border-lukso-purple/40 rounded-xl px-4 py-3">
        <code className="text-sm text-lukso-purple font-mono flex-1 truncate select-all">{CURL_CMD}</code>
        <button
          onClick={handleCopy}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-lukso-purple/20 border border-lukso-purple/40 text-xs text-lukso-purple hover:bg-lukso-purple/30 hover:text-white transition font-medium flex items-center gap-1.5"
        >
          {copied ? (
            <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-1.5">Fetches the full registration skill — your agent can read and execute it directly.</p>
    </div>
  );
}

function CurlCopy() {
  const [copied, setCopied] = useState(false);
  const cmd = CURL_CMD;
  async function handleCopy() {
    try { await navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <div className="mt-3 flex items-center gap-2 bg-lukso-darker border border-lukso-border/50 rounded-lg px-3 py-2">
      <code className="text-xs text-gray-400 font-mono flex-1 truncate">{cmd}</code>
      <button
        onClick={handleCopy}
        className="shrink-0 px-2 py-1 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition flex items-center gap-1"
      >
        {copied ? (
          <><svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied</>
        ) : (
          <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy curl</>
        )}
      </button>
    </div>
  );
}

// Animated SVG trust network background
function AgentQuickstart() {
  const [copied, setCopied] = useState(false);
  const CONTRACT_ADDRESS_LOCAL = "0x16505FeC789F4553Ea88d812711A0E913D926ADD";

  const snippet = `import { ethers } from 'ethers';

const REGISTRY = '${CONTRACT_ADDRESS_LOCAL}';
const ABI = ['function register(string name, string description, string metadataURI) external'];

const provider = new ethers.JsonRpcProvider('https://rpc.mainnet.lukso.network');
const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
const registry = new ethers.Contract(REGISTRY, ABI, signer);

const tx = await registry.register('My Agent Name', 'What I do', '');
await tx.wait();
console.log('Registered:', signer.address);`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 animate-fade-in" style={{ animationDelay: "0.35s" }}>
      <div className="bg-lukso-card/80 backdrop-blur-sm border border-lukso-purple/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h3 className="text-sm font-semibold text-white">For AI Agents — Register Yourself</h3>
        </div>
        <p className="text-gray-500 text-xs mb-3">
          No wallet UI. Your agent signs the transaction directly with its private key.
        </p>
        <CurlCopy />
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 mb-3">
          <span>No-dependency curl guide:</span>
          <a
            href="https://universal-trust.vercel.app/api/register.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lukso-purple hover:text-lukso-pink transition"
          >
            register.md ↗
          </a>
        </div>
        <p className="text-gray-600 text-xs mb-2">Or register via SDK:</p>
        <div className="relative">
          <pre className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed">
            {snippet}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition flex items-center gap-1"
          >
            {copied ? (
              <><svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
            ) : (
              <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

function TrustNetworkBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const svg = canvasRef.current;
    if (!svg) return;

    const w = 1200, h = 400;
    const nodeCount = 18;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      x: 80 + Math.random() * (w - 160),
      y: 40 + Math.random() * (h - 80),
      r: 3 + Math.random() * 4,
      delay: Math.random() * 5,
    }));

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
