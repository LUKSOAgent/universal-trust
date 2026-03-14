import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TrustBadge from "./TrustBadge";
import { getSkillCount } from "../useContract";

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

export default function AgentCard({ agent, upProfile }) {
  const [skillCount, setSkillCount] = useState(null);
  const trustScore = agent.reputation + (agent.endorsementCount * 10);
  const registeredDate = new Date(agent.registeredAt * 1000).toLocaleDateString();

  // Use UP name if available and different from registered name
  const displayName = upProfile?.name || agent.name;
  const avatarUrl = upProfile?.profileImage || null;

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
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
          </div>
          
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {agent.description || "No description provided."}
          </p>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="font-mono">
              {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
            </span>
            <span>
              <span className="text-lukso-purple font-medium">{agent.reputation}</span> rep
            </span>
            <span>
              <span className="text-lukso-pink font-medium">{agent.endorsementCount}</span> endorsements
            </span>
            {skillCount !== null && skillCount > 0 && (
              <span>
                <span className="text-lukso-purple font-medium">{skillCount}</span> skills
              </span>
            )}
            <span>Joined {registeredDate}</span>
          </div>
          <MiniTrustBar score={trustScore} />
        </div>
        
        <div className="shrink-0">
          <TrustBadge score={trustScore} size="md" />
        </div>
      </div>
    </Link>
  );
}
