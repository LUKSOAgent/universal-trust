import { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import TrustBadge from "./TrustBadge";
import { getSkillCount } from "../useContract";
import { computeCompositeScore } from "../envio";
import { getTrustLevel } from "./TrustScoreCard";

/**
 * Score breakdown tooltip — shows on hover over the trust score badge.
 * Displays: Contract | Activity | Skills | Social factors.
 */
function ScoreTooltip({ trustScore, onChainScore, skillCount, lsp26Score, compositeScore, visible }) {
  if (!visible) return null;
  const activityPts = onChainScore !== null && onChainScore !== undefined ? Math.round(onChainScore * 3) : null;
  const skillPts = Math.min(skillCount ?? 0, 20) * 10;
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-fade-in">
      <div className="bg-lukso-darker border border-lukso-border rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Score Breakdown</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-lukso-purple">Contract: <span className="text-white font-semibold">{trustScore}</span></span>
          <span className="text-gray-600">|</span>
          <span className="text-blue-400">Activity: <span className="text-white font-semibold">{activityPts !== null ? activityPts : "…"}</span></span>
          <span className="text-gray-600">|</span>
          <span className="text-amber-400">Skills: <span className="text-white font-semibold">{skillPts}</span></span>
          <span className="text-gray-600">|</span>
          <span className="text-emerald-400">Social: <span className="text-white font-semibold">{lsp26Score ?? 0}</span></span>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">Total: {compositeScore}</p>
      </div>
      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-lukso-darker border-r border-b border-lukso-border rotate-45" />
    </div>
  );
}

/**
 * Improved trust tier mapping with distinct colors and access levels.
 * 0-99:       "Unproven"    — gray    (#6b7280)
 * 100-199:    "Registered"  — blue    (#3b82f6)
 * 200-499:    "Trusted"     — green   (#10b981)
 * 500-999:    "Established" — purple  (#8b5cf6)
 * 1000+:      "Verified"    — gold    (#f59e0b)
 */
function getImprovedTrustTier(score) {
  if (score >= 1000) {
    return {
      label: "Verified",
      badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      accessLevel: "Elite",
    };
  }
  if (score >= 500) {
    return {
      label: "Established",
      badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/40",
      accessLevel: "Premium",
    };
  }
  if (score >= 200) {
    return {
      label: "Trusted",
      badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      accessLevel: "Standard",
    };
  }
  if (score >= 100) {
    return {
      label: "Registered",
      badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/40",
      accessLevel: "Basic",
    };
  }
  return {
    label: "Unproven",
    badgeClass: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    accessLevel: "Basic",
  };
}

/**
 * Calculate days since Unix timestamp (seconds).
 */
function daysSince(timestampSeconds) {
  if (!timestampSeconds || timestampSeconds === 0) return null;
  const seconds = Math.floor(Date.now() / 1000) - timestampSeconds;
  return Math.max(0, Math.floor(seconds / 86400));
}

/**
 * Format inactivity status and decay warnings.
 * gracePeriod = 30 days (TODO: fetch from contract)
 */
function getDecayStatus(lastActiveAt) {
  const daysSinceActive = daysSince(lastActiveAt);
  if (daysSinceActive === null) return null;

  if (daysSinceActive <= 7) {
    return { status: `Active ${daysSinceActive}d ago`, warning: null };
  }
  if (daysSinceActive <= 30) {
    return { status: `Inactive ${daysSinceActive}d ago`, warning: null };
  }
  if (daysSinceActive <= 60) {
    return {
      status: `Inactive ${daysSinceActive}d ago`,
      warning: { type: "eligible", label: "⚠ Decay eligible" },
    };
  }
  return {
    status: `Inactive ${daysSinceActive}d ago`,
    warning: { type: "high", label: "⚠ High decay risk" },
  };
}

function MiniTrustBar({ score }) {
  const maxScore = 10000;
  const pct = Math.min((score / maxScore) * 100, 100);
  let barColor;
  if (score >= 500) barColor = "from-green-500 to-emerald-400";
  else if (score >= 200) barColor = "from-blue-500 to-cyan-400";
  else if (score >= 100) barColor = "from-yellow-500 to-amber-400";
  else barColor = "from-gray-500 to-gray-400";

  return (
    <div className="w-full h-1.5 bg-lukso-border rounded-full overflow-hidden mt-3">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
        style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

function AgentCardInner({ agent, upProfile }) {
  const [skillCount, setSkillCount] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const trustScore = agent.trustScore ?? (agent.reputation + (agent.endorsementCount * 10));
  const weightedTrustScore = agent.weightedTrustScore ?? null;
  // Use pre-computed composite from Directory if available (includes Envio activity score)
  const effectiveSkillCount = skillCount ?? agent.skillCount ?? 0;
  const effectiveLsp26Score = agent.lsp26Score ?? 0;
  const compositeScore = agent.composite ?? computeCompositeScore(trustScore, agent.onChainScore ?? null, effectiveSkillCount, effectiveLsp26Score);
  const level = getTrustLevel(compositeScore);
  const improvedTier = getImprovedTrustTier(compositeScore);
  const showWeighted = weightedTrustScore !== null && weightedTrustScore !== trustScore;
  const registeredDate = agent.registeredAt > 0 ? new Date(agent.registeredAt * 1000).toLocaleDateString() : "Unknown";
  // Loading state: composite data hasn't arrived yet
  const isCompositeLoading = agent.composite === undefined && agent.onChainScore === undefined;

  // Use UP name if available and different from registered name
  const displayName = upProfile?.name || agent.name;
  const avatarUrl = upProfile?.profileImage || null;

  // Decay status
  const decayStatus = getDecayStatus(agent.lastActiveAt);

  useEffect(() => {
    let cancelled = false;
    getSkillCount(agent.address)
      .then((c) => { if (!cancelled) setSkillCount(c); })
      .catch(() => { if (!cancelled) setSkillCount(0); });
    return () => { cancelled = true; };
  }, [agent.address]);
  
  return (
    <Link
      to={`/agent/${agent.address}`}
      className="block bg-lukso-card border border-lukso-border rounded-xl p-5 hover:border-lukso-pink/50 hover:glow-pink transition-all duration-300 group hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            {/* UP avatar */}
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover border border-lukso-border shrink-0"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <h3 className="text-lg font-semibold text-white group-hover:text-lukso-pink transition truncate">
              {displayName}
            </h3>
            {/* Show UP badge if enriched with UP name */}
            {upProfile?.name && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-lukso-purple/20 text-lukso-purple border border-lukso-purple/30 shrink-0 font-medium">
                UP
              </span>
            )}
            {agent.isActive ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                Inactive
              </span>
            )}
            {/* LSP26 social signal badge */}
            {(agent.lsp26FollowerCount ?? 0) > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 font-medium">
                👥 {agent.lsp26FollowerCount} agent{agent.lsp26FollowerCount === 1 ? " follows" : "s follow"}
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {agent.description || "No description provided."}
          </p>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="font-mono">
              {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-lukso-purple inline-block" />
              <span className="text-lukso-purple font-medium">{agent.reputation}</span> rep
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-lukso-pink inline-block" />
              <span className="text-lukso-pink font-medium">{agent.endorsementCount}</span> endorsement{agent.endorsementCount === 1 ? "" : "s"}
            </span>
            {skillCount !== null && skillCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-lukso-purple">⚡</span>
                <span className="text-lukso-purple font-medium">{skillCount}</span> skill{skillCount === 1 ? "" : "s"}
              </span>
            )}
            <span>Joined {registeredDate}</span>
          </div>

          {/* Decay status row */}
          {decayStatus && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">{decayStatus.status}</span>
              {decayStatus.warning && (
                <span
                  className={`text-xs px-2 py-1 rounded border font-semibold ${
                    decayStatus.warning.type === "high"
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  }`}
                >
                  {decayStatus.warning.label}
                </span>
              )}
            </div>
          )}

          {/* Access level indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Access:</span>
            <span className={`text-xs font-semibold ${
              compositeScore >= 1000 ? "text-amber-400" :
              compositeScore >= 500 ? "text-purple-400" :
              compositeScore >= 200 ? "text-emerald-400" :
              compositeScore >= 100 ? "text-blue-400" :
              "text-gray-400"
            }`}>{improvedTier.accessLevel}</span>
          </div>

          <MiniTrustBar score={compositeScore} />
        </div>
        
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          {/* Score with tooltip on hover */}
          <div
            className="relative cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <ScoreTooltip
              trustScore={trustScore}
              onChainScore={agent.onChainScore ?? null}
              skillCount={effectiveSkillCount}
              lsp26Score={effectiveLsp26Score}
              compositeScore={compositeScore}
              visible={showTooltip}
            />
            {isCompositeLoading ? (
              <div className="w-16 h-16 rounded-full bg-lukso-border/50 animate-pulse flex items-center justify-center">
                <span className="text-xs text-gray-500">…</span>
              </div>
            ) : (
              <TrustBadge score={compositeScore} size="md" />
            )}
            {/* Trust tier glow ring */}
            <div
              className={`absolute -inset-1 rounded-full opacity-20 blur-sm ${
                compositeScore >= 1000
                  ? "bg-amber-500"
                  : compositeScore >= 500
                  ? "bg-purple-500"
                  : compositeScore >= 200
                  ? "bg-emerald-500"
                  : compositeScore >= 100
                  ? "bg-blue-500"
                  : "bg-gray-500"
              }`}
              style={{ zIndex: -1 }}
            />
          </div>
          {/* Label: "Trust Score" */}
          <span className="text-[10px] text-gray-500 font-medium">Trust Score</span>
          {/* Improved trust tier badge */}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${improvedTier.badgeClass}`}>
            {improvedTier.label}
          </span>
          {/* Weighted trust score (only when it differs from regular trustScore) */}
          {showWeighted && (
            <span
              className="text-[10px] text-gray-500 cursor-help"
              title="Endorsements weighted by endorser reputation"
            >
              Weighted: <span className="text-gray-300 font-semibold">{weightedTrustScore}</span>
            </span>
          )}
          <span className="hidden sm:block">
            <Link
              to={`/endorse?address=${agent.address}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] px-2 py-0.5 rounded-md border border-lukso-pink/20 text-lukso-pink hover:bg-lukso-pink/10 transition"
            >
              + Endorse
            </Link>
          </span>
        </div>
      </div>
    </Link>
  );
}

const AgentCard = memo(AgentCardInner);
export default AgentCard;
