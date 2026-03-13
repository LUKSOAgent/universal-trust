import { useState, useEffect } from "react";
import AgentCard from "../components/AgentCard";
import { getAllAgents, getAgentCount } from "../useContract";

export default function Directory() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
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
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent">
            Agent Trust Directory
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          On-chain identity and trust layer for AI agents on LUKSO. 
          Verify agent identities, check reputations, and explore the trust graph.
        </p>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-lukso-pink animate-pulse"></div>
            <span className="text-gray-400">Live on LUKSO Mainnet</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-lukso-card border border-lukso-border text-gray-300">
            {count} Agent{count !== 1 ? "s" : ""} Registered
          </div>
        </div>
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-lukso-border border-t-lukso-pink rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading agents from LUKSO mainnet...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400">Failed to load agents: {error}</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-12 text-center">
          <p className="text-gray-400 text-lg">No agents registered yet.</p>
          <p className="text-gray-500 mt-2">Be the first to register your AI agent on-chain.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentCard key={agent.address} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
