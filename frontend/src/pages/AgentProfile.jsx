import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyAgent, getEndorsers, getAgent } from "../useContract";
import { EXPLORER_URL } from "../config";
import TrustBadge from "../components/TrustBadge";

export default function AgentProfile() {
  const { address } = useParams();
  const [agent, setAgent] = useState(null);
  const [verification, setVerification] = useState(null);
  const [endorsers, setEndorsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [verifyResult, agentData, endorserList] = await Promise.all([
          verifyAgent(address),
          getAgent(address).catch(() => null),
          getEndorsers(address).catch(() => []),
        ]);
        setVerification(verifyResult);
        setAgent(agentData);
        setEndorsers(endorserList);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-lukso-border border-t-lukso-pink rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading agent profile...</p>
      </div>
    );
  }

  if (error || !verification?.registered) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Agent Not Found</h2>
          <p className="text-gray-400 mb-4">
            Address <span className="font-mono text-sm">{address}</span> is not registered in the AgentIdentityRegistry.
          </p>
          <Link to="/" className="text-lukso-pink hover:underline">← Back to directory</Link>
        </div>
      </div>
    );
  }

  const registeredDate = agent ? new Date(Number(agent.registeredAt) * 1000).toLocaleString() : "Unknown";
  const lastActive = agent ? new Date(Number(agent.lastActiveAt) * 1000).toLocaleString() : "Unknown";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-gray-400 hover:text-lukso-pink transition text-sm mb-6 inline-block">
        ← Back to directory
      </Link>

      {/* Profile Header */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <TrustBadge score={verification.trustScore} size="lg" />
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{verification.name}</h1>
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
            
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Address:</span>
              <a
                href={`${EXPLORER_URL}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-lukso-purple hover:text-lukso-pink transition"
              >
                {address}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Reputation" value={verification.reputation} />
        <StatCard label="Endorsements" value={verification.endorsements} />
        <StatCard label="Trust Score" value={verification.trustScore} />
        <StatCard label="Type" value={verification.isUP ? "Universal Profile" : "EOA"} />
      </div>

      {/* Timeline */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Registered</h3>
          <p className="text-white">{registeredDate}</p>
        </div>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Last Active</h3>
          <p className="text-white">{lastActive}</p>
        </div>
      </div>

      {/* Endorsers */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Endorsements ({endorsers.length})
        </h2>
        {endorsers.length === 0 ? (
          <p className="text-gray-500">No endorsements yet.</p>
        ) : (
          <div className="space-y-2">
            {endorsers.map((endorser) => (
              <Link
                key={endorser}
                to={`/agent/${endorser}`}
                className="block font-mono text-sm text-lukso-purple hover:text-lukso-pink transition py-2 px-3 rounded-lg hover:bg-lukso-border/30"
              >
                {endorser}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
