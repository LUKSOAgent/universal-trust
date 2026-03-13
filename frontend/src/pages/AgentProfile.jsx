import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyAgent, getEndorsers, getAgent, getSkills, getEndorsement, isRegistered } from "../useContract";
import { EXPLORER_URL } from "../config";
import TrustBadge from "../components/TrustBadge";

export default function AgentProfile() {
  const { address } = useParams();
  const [agent, setAgent] = useState(null);
  const [verification, setVerification] = useState(null);
  const [endorsers, setEndorsers] = useState([]);
  const [endorsementDetails, setEndorsementDetails] = useState({});
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
        setVerification(verifyResult);
        setAgent(agentData);
        setEndorsers(endorserList);
        setSkills(skillList);

        // Fetch endorsement details + check if endorsers are registered agents
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
          setEndorsementDetails(details);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error || !verification?.registered) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Agent Not Found</h2>
          <p className="text-gray-400 mb-4">
            Address <span className="font-mono text-sm">{address}</span> is not registered in the AgentIdentityRegistry.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-lukso-pink hover:underline">
            ← Back to directory
          </Link>
          {error && (
            <button
              onClick={() => window.location.reload()}
              className="ml-4 px-4 py-2 rounded-lg bg-lukso-card border border-lukso-border text-gray-300 hover:text-white transition text-sm"
            >
              Retry
            </button>
          )}
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
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-8 mb-6 animate-fade-in">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <TrustBadge score={verification.trustScore} size="lg" />
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
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
                className="font-mono text-sm text-lukso-purple hover:text-lukso-pink transition break-all"
              >
                {address}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <StatCard label="Reputation" value={verification.reputation} />
        <StatCard label="Endorsements" value={verification.endorsements} />
        <StatCard label="Trust Score" value={verification.trustScore} />
        <StatCard label="Skills" value={skills.length} />
      </div>

      {/* Timeline */}
      <div className="grid md:grid-cols-2 gap-4 mb-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Registered</h3>
          <p className="text-white">{registeredDate}</p>
        </div>
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Last Active</h3>
          <p className="text-white">{lastActive}</p>
        </div>
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
          <EmptyState icon="skills" message="No skills registered yet." />
        ) : (
          <div className="space-y-3">
            {skills.map((skill, i) => (
              <div
                key={i}
                className="bg-lukso-darker rounded-lg p-4 border border-lukso-border/50 hover:border-lukso-purple/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{skill.name}</h3>
                    {skill.content && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{skill.content}</p>
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
          <EmptyState icon="endorsements" message="No endorsements yet." />
        ) : (
          <div className="space-y-3">
            {endorsers.map((endorser) => {
              const detail = endorsementDetails[endorser];
              return (
                <div
                  key={endorser}
                  className="bg-lukso-darker rounded-lg p-4 border border-lukso-border/50 hover:border-lukso-pink/30 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    {detail?.isAgent && detail?.endorserName ? (
                      <Link
                        to={`/agent/${endorser}`}
                        className="font-medium text-lukso-purple hover:text-lukso-pink transition"
                      >
                        {detail.endorserName}
                        <span className="text-gray-500 font-mono text-xs ml-2">
                          {endorser.slice(0, 6)}...{endorser.slice(-4)}
                        </span>
                      </Link>
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

function StatCard({ label, value }) {
  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl p-4 text-center hover:border-lukso-pink/30 transition">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
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
      
      {/* Header skeleton */}
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

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-lukso-card border border-lukso-border rounded-xl p-4 text-center">
            <div className="h-8 w-12 bg-lukso-border rounded mx-auto mb-2" />
            <div className="h-3 w-16 bg-lukso-border/50 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-lukso-card border border-lukso-border rounded-xl p-5">
            <div className="h-3 w-20 bg-lukso-border/50 rounded mb-2" />
            <div className="h-5 w-40 bg-lukso-border rounded" />
          </div>
        ))}
      </div>

      {/* Skills/Endorsements skeleton */}
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
