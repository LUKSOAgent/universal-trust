/**
 * TrustScoreCard — detailed trust score breakdown for AgentProfile
 *
 * Props:
 *   verification  - { reputation, endorsements, trustScore, isUP }
 *   agent         - { registeredAt, lastActiveAt }
 *   address       - string (agent address)
 *   allAgents     - array of all agents (for rank/percentile)
 */

import { computeCompositeScore } from "../envio";

// Re-export for backward compatibility
export { computeCompositeScore };

const MAX_SCORE = 10000;

/**
 * Return a trust level label and color classes based on trustScore.
 * Aligned with improved tier colors:
 * 0-99: Unproven (gray)
 * 100-199: Registered (blue)
 * 200-499: Trusted (emerald/green)
 * 500-999: Established (purple)
 * 1000+: Verified (amber/gold)
 */
export function getTrustLevel(score) {
  if (score >= 1000)
    return {
      label: "Verified",
      color: "text-amber-400",
      bg: "bg-amber-500/15 border-amber-500/40",
      bar: "from-amber-500 to-yellow-400",
    };
  if (score >= 500)
    return {
      label: "Established",
      color: "text-purple-400",
      bg: "bg-purple-500/15 border-purple-500/40",
      bar: "from-purple-500 to-violet-400",
    };
  if (score >= 200)
    return {
      label: "Trusted",
      color: "text-emerald-400",
      bg: "bg-emerald-500/15 border-emerald-500/40",
      bar: "from-emerald-500 to-green-400",
    };
  if (score >= 100)
    return {
      label: "Registered",
      color: "text-blue-400",
      bg: "bg-blue-500/15 border-blue-500/40",
      bar: "from-blue-500 to-cyan-400",
    };
  return {
    label: "Unproven",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/30",
    bar: "from-gray-500 to-gray-400",
  };
}

/**
 * Human-readable relative time string.
 * @param {number} timestampSeconds
 * @returns {string}
 */
function timeAgo(timestampSeconds) {
  if (!timestampSeconds || timestampSeconds === 0) return "Unknown";
  const seconds = Math.floor(Date.now() / 1000) - timestampSeconds;
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/**
 * Days since a Unix timestamp.
 */
function daysSince(timestampSeconds) {
  if (!timestampSeconds || timestampSeconds === 0) return null;
  const seconds = Math.floor(Date.now() / 1000) - timestampSeconds;
  return Math.max(0, Math.floor(seconds / 86400));
}

export default function TrustScoreCard({ verification, agent, address, allAgents, onChainRep, skillsCount, lsp26Score = 0, lsp26FollowerCount = 0, hideComposite = false }) {
  if (!verification) return null;

  const { reputation, endorsements, trustScore, isUP } = verification;
  const endorsementPoints = endorsements * 10;

  // Composite Trust Score: contract score + on-chain activity + skills + LSP26
  const onChainScore = onChainRep?.generalScore ?? null;
  const compositeScore = computeCompositeScore(trustScore, onChainScore, skillsCount ?? 0, lsp26Score);

  // Use composite score for the overall trust tier label (consistent with Directory/AgentCard),
  // but keep contract-based coloring for the contract score bar
  const level = getTrustLevel(compositeScore);
  const contractLevel = getTrustLevel(trustScore);

  // Rank: position among all agents sorted by trustScore descending
  let rank = null;
  let totalAgents = null;
  if (allAgents && allAgents.length > 0) {
    totalAgents = allAgents.length;
    const sorted = [...allAgents]
      .map((a) => ({
        address: a.address,
        score: a.composite ?? (a.reputation + a.endorsementCount * 10),
      }))
      .sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex(
      (a) => a.address.toLowerCase() === address?.toLowerCase()
    );
    rank = idx >= 0 ? idx + 1 : null;
  }

  // Timeline
  const registeredAt = agent ? Number(agent.registeredAt) : 0;
  const lastActiveAt = agent ? Number(agent.lastActiveAt) : 0;
  const daysActive = daysSince(registeredAt);
  const lastActiveStr = timeAgo(lastActiveAt);

  // Score bar widths
  const repPct = Math.min((reputation / MAX_SCORE) * 100, 100);
  const endPct = Math.min((endorsementPoints / MAX_SCORE) * 100, 100);
  const totalPct = Math.min((trustScore / MAX_SCORE) * 100, 100);

  // Score history narrative
  const reputationGain = Math.max(0, reputation - 100);
  const endorsementGain = endorsementPoints;

  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
          Trust Score
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {isUP && (
            <a
              href={`https://universaleverything.io/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lukso-purple/20 border border-lukso-purple/40 text-xs font-medium text-lukso-purple hover:bg-lukso-purple/30 transition"
              title="View Universal Profile"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Universal Profile ↗
            </a>
          )}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${level.bg} ${level.color}`}
          >
            {level.label}
          </span>
        </div>
      </div>

      {/* Composite Score — primary display (hidden when parent already shows it) */}
      {!hideComposite && (
        <div className="bg-gradient-to-br from-lukso-pink/10 to-lukso-purple/10 border border-lukso-pink/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-lukso-pink uppercase tracking-wider">Composite Trust Score</p>
            {rank !== null && totalAgents !== null && (
              <p className="text-xs text-gray-500">
                <span className="text-lukso-pink font-bold">#{rank}</span> of {totalAgents}
              </p>
            )}
          </div>
          <p className="text-5xl font-bold text-white tabular-nums">{compositeScore.toLocaleString()}</p>
          {onChainScore !== null ? (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {trustScore} (contract) + {Math.round(onChainScore * 3)} (activity×3) + {Math.min(skillsCount ?? 0, 20) * 10} (skills×10){lsp26Score > 0 ? ` + ${lsp26Score} (LSP26 follows×5)` : ""}
            </p>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 border-2 border-lukso-border border-t-lukso-pink rounded-full animate-spin" />
              <p className="text-xs text-gray-600">Loading on-chain activity…</p>
            </div>
          )}
        </div>
      )}

      {/* Contract trust score */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">On-chain Score <span className="text-gray-600">(from contract)</span></p>
          <p className="text-3xl font-bold text-white tabular-nums">{trustScore.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">/ {MAX_SCORE.toLocaleString()} max</p>
        </div>
      </div>

      {/* Total bar */}
      <div>
        <div className="w-full h-2.5 bg-lukso-darker rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${contractLevel.bar} transition-all duration-700`}
            style={{ width: `${Math.max(totalPct, totalPct > 0 ? 1 : 0)}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Score Breakdown</p>

        {/* Reputation bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">
              Reputation <span className="text-gray-600">(base)</span>
            </span>
            <span className="text-xs font-semibold text-lukso-purple tabular-nums">
              +{reputation.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-1.5 bg-lukso-darker rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lukso-purple to-lukso-pink transition-all duration-700"
              style={{ width: `${Math.max(repPct, repPct > 0 ? 1 : 0)}%` }}
            />
          </div>
        </div>

        {/* Endorsements bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">
              Endorsements{" "}
              <span className="text-gray-600">
                ({endorsements} × 10)
              </span>
            </span>
            <span className="text-xs font-semibold text-lukso-pink tabular-nums">
              +{endorsementPoints.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-1.5 bg-lukso-darker rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lukso-pink to-rose-400 transition-all duration-700"
              style={{ width: `${Math.max(endPct, endPct > 0 ? 1 : 0)}%` }}
            />
          </div>
        </div>

        {/* Formula total */}
        <div className="flex items-center justify-between pt-1 border-t border-lukso-border/50">
          <span className="text-xs font-mono text-gray-500">
            {reputation} + ({endorsements} × 10)
          </span>
          <span className="text-sm font-bold text-white tabular-nums">
            = {trustScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Score history narrative */}
      <div className="bg-lukso-darker rounded-lg p-4 space-y-1.5 border border-lukso-border/50">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Score History</p>
        <ScoreHistoryItem
          icon="🔑"
          label="Registered"
          value="+100"
          note="starting reputation"
          color="text-lukso-purple"
        />
        {reputationGain > 0 && (
          <ScoreHistoryItem
            icon="⭐"
            label="Reputation updates"
            value={`+${reputationGain}`}
            note="from activity"
            color="text-lukso-purple"
          />
        )}
        {endorsements > 0 && (
          <ScoreHistoryItem
            icon="🤝"
            label={`${endorsements} endorsement${endorsements === 1 ? "" : "s"}`}
            value={`+${endorsementGain}`}
            note={`${endorsements} × 10 pts`}
            color="text-lukso-pink"
          />
        )}
        {endorsements === 0 && reputationGain === 0 && (
          <p className="text-xs text-gray-600 italic">
            No endorsements yet. Reputation starts at 100 for all registered agents.
          </p>
        )}
      </div>

      {/* LSP26 Social Graph */}
      {lsp26Score > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wide">LSP26 Social Graph</p>
            <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 font-medium">
              +{lsp26Score} pts
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Registered followers{" "}
              <span className="text-gray-600">
                ({lsp26FollowerCount} × 5)
              </span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 tabular-nums">
              +{lsp26Score}
            </span>
          </div>
          <p className="text-[10px] text-gray-600">
            Soft endorsement signal — other registered agents following this profile on LUKSO
          </p>
        </div>
      )}

      {/* On-Chain Activity from Envio */}
      {!onChainRep && (
        <div className="space-y-3 animate-pulse">
          <p className="text-xs text-gray-500 uppercase tracking-wide">On-Chain Activity</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-lukso-darker rounded-lg p-2.5 text-center border border-lukso-border/30">
                <div className="h-5 w-10 bg-lukso-border/50 rounded mx-auto mb-1" />
                <div className="h-3 w-14 bg-lukso-border/30 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      )}
      {onChainRep && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wide">On-Chain Activity</p>
            <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
              style={{
                borderColor: onChainRep.generalScore >= 60 ? "#A78BFA" : onChainRep.generalScore >= 35 ? "#60A5FA" : "#6B7280",
                color:       onChainRep.generalScore >= 60 ? "#A78BFA" : onChainRep.generalScore >= 35 ? "#60A5FA" : "#9CA3AF",
              }}>
              {onChainRep.activityLevel}
            </span>
          </div>
          {/* Activity score bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Activity Score</span>
              <span className="text-xs font-mono text-white">
                {onChainRep.generalScore}<span className="text-gray-600">/100</span>
                <span className="text-gray-500 ml-1">(+{Math.round(onChainRep.generalScore * 3)} composite pts)</span>
              </span>
            </div>
            <div className="h-1.5 bg-lukso-darker rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${onChainRep.generalScore}%`,
                  background: onChainRep.generalScore >= 60
                    ? "linear-gradient(90deg, #7C3AED, #A78BFA)"
                    : onChainRep.generalScore >= 35
                    ? "linear-gradient(90deg, #1D4ED8, #60A5FA)"
                    : "linear-gradient(90deg, #374151, #6B7280)",
                }}
              />
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Transactions",  value: (onChainRep.transactionCount ?? 0).toLocaleString() },
              { label: "Followers",     value: (onChainRep.followersCount ?? 0).toLocaleString() },
              { label: "Following",     value: (onChainRep.followingCount ?? 0).toLocaleString() },
              { label: "Assets Issued", value: (onChainRep.issuedAssetsCount ?? 0).toLocaleString() },
              { label: "Assets Held",   value: (onChainRep.receivedAssetsCount ?? 0).toLocaleString() },
              { label: "Account Age",   value: onChainRep.accountAge ?? "< 1d" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-lukso-darker rounded-lg p-2.5 text-center border border-lukso-border/30">
                <p className="text-sm font-bold font-mono text-white">{value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-lukso-darker rounded-lg p-3 border border-lukso-border/50">
          <p className="text-xs text-gray-500 mb-0.5">Registered</p>
          <p className="text-base font-semibold text-white">
            {daysActive === null ? "—" : daysActive === 0 ? "Today" : `${daysActive}d ago`}
          </p>
        </div>
        <div className="bg-lukso-darker rounded-lg p-3 border border-lukso-border/50">
          <p className="text-xs text-gray-500 mb-0.5">Last Active</p>
          <p className="text-base font-semibold text-white truncate" title={lastActiveStr}>
            {lastActiveStr}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreHistoryItem({ icon, label, value, note, color }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs text-gray-400">
        <span>{icon}</span>
        <span>{label}</span>
        {note && <span className="text-gray-600">({note})</span>}
      </span>
      <span className={`text-xs font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
