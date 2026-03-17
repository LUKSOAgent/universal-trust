import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyAgent, getEndorsers, getAgent, getSkills, getEndorsement, isRegistered, getAllAgents } from "../useContract";
import { EXPLORER_URL } from "../config";
import TrustBadge, { TrustScoreBar } from "../components/TrustBadge";
import TrustScoreCard, { computeCompositeScore, getTrustLevel } from "../components/TrustScoreCard";
import { fetchUPProfile, fetchUPProfiles, fetchOnChainReputation, fetchLSP26RegisteredFollowers } from "../envio";

function timeAgo(ts) {
  if (!ts || ts === 0) return null;
  const now = Date.now();
  const diff = now - ts * 1000;
  if (diff < 0) return "just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export default function AgentProfile() {
  const { address } = useParams();
  const [agent, setAgent] = useState(null);
  const [verification, setVerification] = useState(null);
  const [upProfile, setUpProfile] = useState(null);
  const [onChainRep, setOnChainRep] = useState(null);
  const [lsp26Data, setLsp26Data] = useState({ count: 0, addresses: [] });
  const [allAgents, setAllAgents] = useState([]);

  // Set page title when agent data loads
  useEffect(() => {
    if (verification?.name) {
      document.title = `${verification.name} — Universal Trust`;
    } else {
      document.title = "Agent Profile — Universal Trust";
    }
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, [verification?.name]);
  const [endorsers, setEndorsers] = useState([]);
  const [endorsementDetails, setEndorsementDetails] = useState({});
  const [endorserProfiles, setEndorserProfiles] = useState({}); // address → { name, profileImage }
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate address format
  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(address);

  useEffect(() => {
    if (!isValidAddress) {
      setLoading(false);
      setError("Invalid address format");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [verifyResult, agentData, endorserList, skillList] = await Promise.all([
          verifyAgent(address),
          getAgent(address).catch(() => null),
          getEndorsers(address).catch(() => []),
          getSkills(address).catch(() => []),
        ]);
        if (cancelled) return;
        setVerification(verifyResult);
        setAgent(agentData);
        setEndorsers(endorserList);
        setSkills(skillList);

        // Fetch UP profile + on-chain reputation from Envio (optional, non-blocking, guarded)
        fetchUPProfile(address).then((p) => { if (!cancelled) setUpProfile(p); }).catch(() => {});
        fetchOnChainReputation(address).then((r) => { if (!cancelled) setOnChainRep(r); }).catch(() => {});

        // Fetch all agents for rank computation + LSP26 follower intersection (optional, non-blocking)
        getAllAgents().then((list) => {
          if (cancelled) return;
          setAllAgents(list);
          // Now that we have all registered addresses, fetch LSP26 registered followers
          const registeredAddrs = list.map((a) => a.address.toLowerCase());
          fetchLSP26RegisteredFollowers(address, registeredAddrs)
            .then((data) => { if (!cancelled) setLsp26Data(data); })
            .catch(() => {});
        }).catch(() => {});

        // Fetch endorser UP profiles (non-blocking, for avatars)
        if (endorserList.length > 0) {
          fetchUPProfiles(endorserList)
            .then((profiles) => { if (!cancelled) setEndorserProfiles(profiles); })
            .catch(() => {});
        }

        // Fetch endorsement details
        if (endorserList.length > 0) {
          const details = {};
          await Promise.all(
            endorserList.map(async (endorser) => {
              try {
                const [endorsement, registered] = await Promise.all([
                  getEndorsement(endorser, address),
                  isRegistered(endorser).catch(() => false),
                ]);
                let endorserName = null;
                if (registered) {
                  try {
                    const endorserAgent = await getAgent(endorser);
                    endorserName = endorserAgent.name;
                  } catch {}
                }
                details[endorser] = {
                  ...endorsement,
                  isAgent: registered,
                  endorserName,
                };
              } catch (e) {
                details[endorser] = { reason: "", timestamp: 0, isAgent: false, endorserName: null };
              }
            })
          );
          if (!cancelled) setEndorsementDetails(details);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.message?.includes("network") || err.message?.includes("fetch")) {
          setError("Failed to connect to LUKSO network. Please try again.");
        } else {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [address, isValidAddress]);

  if (!isValidAddress) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Invalid Address</h2>
          <p className="text-gray-400 mb-4">
            <span className="font-mono text-sm break-all">{address}</span> is not a valid Ethereum/LUKSO address.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-lukso-pink hover:underline">
            ← Back to directory
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error && !verification) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Failed to Load</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/" className="text-lukso-pink hover:underline">
              ← Back to directory
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-lukso-card border border-lukso-border text-gray-300 hover:text-white transition text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!verification?.registered) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-lukso-purple/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-lukso-darker border-2 border-lukso-border flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Not Registered</h2>
            <p className="text-gray-400 mb-1">
              This address is not in the AgentIdentityRegistry contract.
            </p>
            <p className="text-gray-600 text-sm mb-2">
              It may be a valid Universal Profile — just not yet registered as an AI agent.
            </p>
            <p className="text-gray-500 font-mono text-sm mb-6 break-all">{address}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="text-lukso-pink hover:underline text-sm">
                ← Back to directory
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition"
              >
                Register as Agent
              </Link>
              <Link
                to={`/verify?address=${address}`}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition"
              >
                Scan this address
              </Link>
              <a
                href={`https://universalprofile.cloud/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition"
              >
                Check Universal Profile ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const registeredTs = agent ? Number(agent.registeredAt) : 0;
  const lastActiveTs = agent ? Number(agent.lastActiveAt) : 0;
  const registeredDate = registeredTs > 0 ? new Date(registeredTs * 1000).toLocaleString() : "Unknown";
  const registeredRelative = timeAgo(registeredTs);
  const lastActive = lastActiveTs > 0 ? new Date(lastActiveTs * 1000).toLocaleString() : "Never";
  const lastActiveRelative = timeAgo(lastActiveTs);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-gray-400 hover:text-lukso-pink transition text-sm mb-6 inline-block">
        ← Back to directory
      </Link>

      {/* Profile Header */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl overflow-hidden mb-6 animate-fade-in">
        {/* Verification Banner — uses composite score for consistent trust level */}
        {(() => {
          const onChainScore = onChainRep?.generalScore ?? null;
          const lsp26Score = lsp26Data.count * 5;
          const composite = computeCompositeScore(verification.trustScore, onChainScore, skills.length, lsp26Score);
          const lvl = getTrustLevel(composite);
          return (
            <div className={`flex items-center justify-between px-6 py-2.5 border-b border-lukso-border ${lvl.bg}`}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-semibold text-white uppercase tracking-wider">On-Chain Verified Agent</span>
              </div>
              <span className={`text-xs font-semibold ${lvl.color}`}>{lvl.label}</span>
            </div>
          );
        })()}
        <div className="p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <TrustBadge score={computeCompositeScore(verification.trustScore, onChainRep?.generalScore ?? null, skills.length, lsp26Data.count * 5)} size="lg" />
          
          <div className="flex-1 min-w-0">
            {/* UP avatar from Envio */}
            {upProfile?.profileImage && (
              <div className="mb-3">
                <img
                  src={upProfile.profileImage}
                  alt={upProfile.name || verification.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-lukso-purple/50"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                {upProfile?.name || verification.name}
              </h1>
              {/* Show registered name as subtitle if UP name differs */}
              {upProfile?.name && upProfile.name !== verification.name && (
                <span className="text-sm text-gray-500 font-normal">({verification.name})</span>
              )}
              {verification.active ? (
                <span className="px-3 py-1 text-sm rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 text-sm rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Inactive
                </span>
              )}
              {verification.isUP && (
                <span className="px-3 py-1 text-sm rounded-full bg-lukso-purple/20 text-lukso-purple border border-lukso-purple/30">
                  Universal Profile
                </span>
              )}
            </div>
            
            <p className="text-gray-400 mb-4">
              {agent?.description || "No description provided."}
            </p>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Address:</span>
                <a
                  href={`${EXPLORER_URL}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-lukso-purple hover:text-lukso-pink transition break-all"
                >
                  {address}
                </a>
                <CopyButton text={address} />
              </div>
            </div>
            {agent?.metadataURI && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-500 text-sm">Metadata:</span>
                {agent.metadataURI.startsWith("data:") ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lukso-darker border border-lukso-border text-xs text-gray-400">
                    <svg className="w-3 h-3 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Embedded JSON (EIP-8004)
                  </span>
                ) : (
                  <a
                    href={agent.metadataURI.startsWith("ipfs://")
                      ? `https://api.universalprofile.cloud/ipfs/${agent.metadataURI.slice(7)}`
                      : agent.metadataURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-lukso-purple hover:text-lukso-pink transition truncate max-w-xs"
                  >
                    {agent.metadataURI.length > 50
                      ? agent.metadataURI.slice(0, 30) + "..." + agent.metadataURI.slice(-15)
                      : agent.metadataURI}
                  </a>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Link
                to={`/endorse?address=${address}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition shrink-0"
              >
                + Endorse
              </Link>
              {verification.isUP && (
                <>
                  <a
                    href={`https://universaleverything.io/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition"
                  >
                    View on Universal Everything ↗
                  </a>
                  <a
                    href={`https://universalprofile.cloud/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition"
                  >
                    UP Cloud ↗
                  </a>
                </>
              )}
              <Link
                to={`/verify?address=${address}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition"
              >
                Quick Verify
              </Link>
              <Link
                to="/graph"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition"
              >
                Trust Graph ↗
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Composite Score Hero + Stats Grid */}
      {(() => {
        const onChainScore = onChainRep?.generalScore ?? null;
        const lsp26Score = lsp26Data.count * 5;
        const composite = computeCompositeScore(verification.trustScore, onChainScore, skills.length, lsp26Score);
        const lvl = getTrustLevel(composite);
        return (
          <div className="mb-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {/* Composite Score — prominent hero */}
            <div className={`relative overflow-hidden border rounded-xl p-6 mb-4 ${lvl.bg}`}>
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-lukso-pink/10 via-lukso-purple/5 to-lukso-pink/10 bg-[length:200%_200%] animate-gradient" />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-lukso-pink uppercase tracking-wider mb-1">Composite Trust Score</p>
                  <p className="text-5xl sm:text-6xl font-bold text-white tabular-nums">{composite.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    {verification.trustScore} <span className="text-gray-600">(contract)</span>
                    {onChainScore !== null ? <>{" + "}{Math.round(onChainScore * 3)} <span className="text-gray-600">(activity×3)</span></> : ""}
                    {skills.length > 0 ? <>{" + "}{Math.min(skills.length, 20) * 10} <span className="text-gray-600">({skills.length} skills×10)</span></> : ""}
                    {lsp26Score > 0 ? <>{" + "}{lsp26Score} <span className="text-gray-600">(LSP26 follows×5)</span></> : ""}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className={`text-lg font-semibold px-4 py-2 rounded-full border ${lvl.bg} ${lvl.color}`}>
                    {lvl.label}
                  </span>
                  {allAgents.length > 0 && (() => {
                    const sorted = [...allAgents]
                      .map(a => {
                        const cs = a.composite ?? (a.reputation + a.endorsementCount * 10);
                        return { addr: a.address, score: cs };
                      })
                      .sort((a, b) => b.score - a.score);
                    const idx = sorted.findIndex(a => a.addr.toLowerCase() === address?.toLowerCase());
                    return idx >= 0 ? (
                      <span className="text-sm text-gray-400">
                        Ranked <span className="text-lukso-pink font-bold text-base">#{idx + 1}</span> <span className="text-gray-600">of {allAgents.length}</span>
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
            {/* Detail stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Reputation" value={verification.reputation} />
              <StatCard label="Endorsements" value={verification.endorsements} />
              <StatCard label="Contract Score" value={verification.trustScore} />
              <StatCard label="Skills" value={skills.length} />
            </div>
          </div>
        );
      })()}

      {/* Trust Score Detail Card */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.12s" }}>
        <TrustScoreCard
          verification={verification}
          agent={agent}
          address={address}
          allAgents={allAgents}
          onChainRep={onChainRep}
          skillsCount={skills.length}
          lsp26Score={lsp26Data.count * 5}
          lsp26FollowerCount={lsp26Data.count}
          hideComposite={true}
        />
      </div>

      {/* Timeline - compact inline display */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 px-1 text-xs text-gray-500 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <span className="flex items-center gap-1.5" title={registeredDate}>
          <svg className="w-3.5 h-3.5 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Registered <span className="text-gray-300 font-medium">{registeredRelative || registeredDate}</span>
        </span>
        <span className="flex items-center gap-1.5" title={lastActive}>
          <svg className="w-3.5 h-3.5 text-lukso-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Last active <span className="text-gray-300 font-medium">{lastActiveRelative || lastActive}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-lukso-purple">⚡</span>
          <span className="text-gray-300 font-medium">{skills.length}</span> skills registered
        </span>
      </div>

      {/* Skills Section */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Skills ({skills.length})
        </h2>
        {skills.length === 0 ? (
          <EmptyState icon="skills" message="No skills registered yet. Skills are published on-chain via the AgentSkillsRegistry." />
        ) : (
          <div className="space-y-3">
            {skills.map((skill, i) => (
              <SkillCard key={i} skill={skill} />
            ))}
          </div>
        )}
      </div>

      {/* Endorsements Section */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-lukso-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Endorsements ({endorsers.length})
        </h2>
        {endorsers.length === 0 ? (
          <EmptyState icon="endorsements" message="No endorsements yet. Be the first to endorse this agent!" />
        ) : (
          <div className="space-y-3">
            {endorsers.map((endorser) => {
              const detail = endorsementDetails[endorser];
              const epProfile = endorserProfiles[endorser.toLowerCase()];
              const displayName = epProfile?.name || detail?.endorserName || null;
              const avatar = epProfile?.profileImage || null;
              return (
                <div
                  key={endorser}
                  className="bg-lukso-darker rounded-lg p-4 border border-lukso-border/50 hover:border-lukso-pink/30 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={displayName || ""}
                          className="w-7 h-7 rounded-full object-cover border border-lukso-border shrink-0"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : detail?.isAgent ? (
                        <span className="w-7 h-7 rounded-full bg-lukso-pink/20 border border-lukso-pink/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-lukso-pink">A</span>
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-lukso-purple/20 border border-lukso-purple/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-lukso-purple">
                            {(displayName || endorser.slice(2))[0].toUpperCase()}
                          </span>
                        </span>
                      )}
                      {detail?.isAgent && displayName ? (
                        <Link
                          to={`/agent/${endorser}`}
                          className="font-medium text-lukso-purple hover:text-lukso-pink transition"
                        >
                          {displayName}
                          <span className="text-gray-500 font-mono text-xs ml-2">
                            {endorser.slice(0, 6)}...{endorser.slice(-4)}
                          </span>
                        </Link>
                      ) : displayName ? (
                        <a
                          href={`${EXPLORER_URL}/address/${endorser}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-lukso-purple hover:text-lukso-pink transition"
                        >
                          {displayName}
                          <span className="text-gray-500 font-mono text-xs ml-2">
                            {endorser.slice(0, 6)}...{endorser.slice(-4)}
                          </span>
                        </a>
                      ) : (
                        <a
                          href={`${EXPLORER_URL}/address/${endorser}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-lukso-purple hover:text-lukso-pink transition break-all"
                        >
                          {endorser}
                        </a>
                      )}
                    </div>
                    {detail?.timestamp > 0 && (
                      <span className="text-xs text-gray-500 shrink-0">
                        {new Date(detail.timestamp * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {detail?.reason && (
                    <p className="text-gray-400 text-sm mt-1 italic">"{detail.reason}"</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillCard({ skill }) {
  const [expanded, setExpanded] = useState(false);

  // Extract the description from the YAML frontmatter if present
  let description = "";
  if (skill.content) {
    const fmMatch = skill.content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const descMatch = fmMatch[1].match(/description:\s*(.+)/);
      if (descMatch) description = descMatch[1].trim();
    }
    if (!description) {
      // Fall back to first non-empty, non-heading line
      const lines = skill.content.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"));
      description = lines[0]?.trim() || "";
    }
  }

  return (
    <div className="bg-lukso-darker rounded-lg border border-lukso-border/50 hover:border-lukso-purple/40 transition">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lukso-purple text-sm">⚡</span>
              <h3 className="text-white font-medium truncate">{skill.name}</h3>
            </div>
            {description && (
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="px-2 py-0.5 text-xs rounded bg-lukso-purple/20 text-lukso-purple border border-lukso-purple/30">
              v{skill.version}
            </span>
            <span className="text-xs text-gray-500">
              {skill.updatedAt ? new Date(skill.updatedAt * 1000).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>
      {skill.content && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-2 border-t border-lukso-border/30 text-xs text-gray-500 hover:text-gray-300 transition"
          >
            <span>{expanded ? "Hide skill content" : "Show skill content"}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && (
            <div className="border-t border-lukso-border/30 px-4 py-3 max-h-80 overflow-y-auto">
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
                {skill.content}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, loading }) {
  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl p-4 text-center hover:border-lukso-pink/30 transition">
      {loading ? (
        <div className="h-8 w-12 bg-lukso-border/50 rounded mx-auto animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white">{value}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="text-gray-500 hover:text-white transition p-1"
      title="Copy address"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="py-8 text-center">
      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-lukso-darker border border-lukso-border flex items-center justify-center">
        {icon === "skills" ? (
          <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )}
      </div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-32 bg-lukso-card rounded mb-6" />
      
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-lukso-border" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-48 bg-lukso-border rounded" />
            <div className="h-4 w-full bg-lukso-border/50 rounded" />
            <div className="h-4 w-2/3 bg-lukso-border/50 rounded" />
            <div className="h-3 w-96 bg-lukso-border/30 rounded" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-lukso-card border border-lukso-border rounded-xl p-4 text-center">
            <div className="h-8 w-12 bg-lukso-border rounded mx-auto mb-2" />
            <div className="h-3 w-16 bg-lukso-border/50 rounded mx-auto" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-lukso-card border border-lukso-border rounded-xl p-5">
            <div className="h-3 w-20 bg-lukso-border/50 rounded mb-2" />
            <div className="h-5 w-40 bg-lukso-border rounded" />
          </div>
        ))}
      </div>

      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-lukso-card border border-lukso-border rounded-xl p-6 mb-6">
          <div className="h-6 w-40 bg-lukso-border rounded mb-4" />
          <div className="space-y-3">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="bg-lukso-darker rounded-lg p-4">
                <div className="h-4 w-48 bg-lukso-border rounded mb-2" />
                <div className="h-3 w-full bg-lukso-border/30 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
