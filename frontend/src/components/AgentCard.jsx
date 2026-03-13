import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TrustBadge from "./TrustBadge";
import { getSkillCount } from "../useContract";

export default function AgentCard({ agent }) {
  const [skillCount, setSkillCount] = useState(null);
  const trustScore = agent.reputation + (agent.endorsementCount * 10);
  const registeredDate = new Date(agent.registeredAt * 1000).toLocaleDateString();

  useEffect(() => {
    getSkillCount(agent.address).then(setSkillCount).catch(() => setSkillCount(0));
  }, [agent.address]);
  
  return (
    <Link
      to={`/agent/${agent.address}`}
      className="block bg-lukso-card border border-lukso-border rounded-xl p-5 hover:border-lukso-pink/50 hover:glow-pink transition-all duration-300 group hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-lukso-pink transition truncate">
              {agent.name}
            </h3>
            {agent.isActive ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
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
            <span>Rep: {agent.reputation}</span>
            <span>Endorsements: {agent.endorsementCount}</span>
            {skillCount !== null && skillCount > 0 && (
              <span className="text-lukso-purple">Skills: {skillCount}</span>
            )}
            <span>Joined: {registeredDate}</span>
          </div>
        </div>
        
        <TrustBadge score={trustScore} size="md" />
      </div>
    </Link>
  );
}
