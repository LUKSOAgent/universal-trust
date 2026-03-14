/**
 * TrustScoreCard — detailed trust score breakdown for AgentProfile
 *
 * Props:
 *   verification  - { reputation, endorsements, trustScore, isUP }
 *   agent         - { registeredAt, lastActiveAt }
 *   address       - string (agent address)
 *   allAgents     - array of all agents (for rank/percentile)
 */

const MAX_SCORE = 10000;

/**
 * Return a trust level label and color classes based on trustScore.
 */
export function getTrustLevel(score) {
  if (score >= 500)
    return {
      label: "Elite",
      color: "text-green-400",
      bg: "bg-green-500/15 border-green-500/40",
      bar: "from-green-500 to-emerald-400",
    };
  if (score >= 200)
    return {
      label: "Established",
      color: "text-blue-400",
      bg: "bg-blue-500/15 border-blue-500/40",
      bar: "from-blue-500 to-cyan-400",
    };
  if (score >= 110)
    return {
      label: "Trusted",
      color: "text-yellow-400",
      bg: "bg-yellow-500/15 border-yellow-500/40",
      bar: "from-yellow-500 to-amber-400",
    };
  if (score >= 100)
    return {
      label: "Registered",
      color: "text-lukso-purple",
      bg: "bg-lukso-purple/15 border-lukso-purple/40",
      bar: "from-lukso-purple to-lukso-pink",
    };
  return {
    label: "Unverified",
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

export default function TrustScoreCard({ verification, agent, address, allAgents }) {
  if (!verification) return null;

  const { reputation, endorsements, trustScore, isUP } = verification;
  const endorsementPoints = endorsements * 10;
  const level = getTrustLevel(trustScore);

  // Rank: position among all agents sorted by trustScore descending
  let rank = null;
  let totalAgents = null;
  if (allAgents && allAgents.length > 0) {
    totalAgents = allAgents.length;
    const sorted = [...allAgents]
      .map((a) => ({ address: a.address, score: a.reputation + a.endorsementCount * 10 }))
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
          Trust Score
        </h3>
        <div className="flex items-center gap-2">
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

      {/* Big score + rank */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-5xl font-bold text-white tabular-nums">{trustScore.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">/ {MAX_SCORE.toLocaleString()} max</p>
        </div>
        {rank !== null && totalAgents !== null && (
          <div className="mb-1.5 text-right">
            <p className="text-lg font-semibold text-lukso-pink">
              #{rank}
            </p>
            <p className="text-xs text-gray-500">of {totalAgents} agents</p>
          </div>
        )}
      </div>

      {/* Total bar */}
      <div>
        <div className="w-full h-2.5 bg-lukso-darker rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${level.bar} transition-all duration-700`}
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
            No reputation updates or endorsements yet.
          </p>
        )}
      </div>

      {/* Activity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-lukso-darker rounded-lg p-3 border border-lukso-border/50">
          <p className="text-xs text-gray-500 mb-0.5">Days Active</p>
          <p className="text-base font-semibold text-white">
            {daysActive !== null ? `${daysActive}d` : "—"}
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
