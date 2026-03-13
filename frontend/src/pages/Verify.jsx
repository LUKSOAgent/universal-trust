import { useState } from "react";
import { ethers } from "ethers";
import { verifyAgent } from "../useContract";
import { EXPLORER_URL } from "../config";
import TrustBadge from "../components/TrustBadge";
import { Link } from "react-router-dom";

export default function Verify() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleVerify(e) {
    e.preventDefault();
    
    if (!ethers.isAddress(address)) {
      setError("Invalid Ethereum/LUKSO address.");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await verifyAgent(address);
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Verify Agent</h1>
      <p className="text-gray-400 mb-8">
        Check if an address is a registered and trusted agent on-chain. 
        This calls the <code className="text-lukso-purple">verify()</code> function directly on the smart contract.
      </p>

      <form onSubmit={handleVerify} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x... agent address"
            className="flex-1 bg-lukso-card border border-lukso-border rounded-lg px-4 py-3 text-white placeholder-gray-600 font-mono text-sm focus:border-lukso-pink focus:outline-none focus:ring-1 focus:ring-lukso-pink/50 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap"
          >
            {loading ? "Checking..." : "Verify"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-6">
          {!result.registered ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Not Registered</h2>
              <p className="text-gray-400">
                This address is not registered in the AgentIdentityRegistry.
              </p>
              <p className="text-gray-500 text-sm mt-2 font-mono">{address}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-white">{result.name}</h2>
                    <span className="text-2xl">✅</span>
                  </div>
                  <a
                    href={`${EXPLORER_URL}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-lukso-purple hover:text-lukso-pink transition"
                  >
                    {address}
                  </a>
                </div>
                <TrustBadge score={result.trustScore} size="lg" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <VerifyField
                  label="Registered"
                  value={result.registered ? "Yes" : "No"}
                  good={result.registered}
                />
                <VerifyField
                  label="Active"
                  value={result.active ? "Yes" : "No"}
                  good={result.active}
                />
                <VerifyField
                  label="Universal Profile"
                  value={result.isUP ? "Yes" : "No (EOA)"}
                  good={result.isUP}
                />
                <VerifyField
                  label="Reputation"
                  value={result.reputation.toString()}
                />
                <VerifyField
                  label="Endorsements"
                  value={result.endorsements.toString()}
                />
                <VerifyField
                  label="Trust Score"
                  value={result.trustScore.toString()}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-lukso-border">
                <Link
                  to={`/agent/${address}`}
                  className="text-lukso-pink hover:underline text-sm"
                >
                  View full profile →
                </Link>
                <div className="text-xs text-gray-500">
                  Data read directly from LUKSO mainnet smart contract
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SDK Code Example */}
      <div className="mt-8 bg-lukso-card border border-lukso-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">SDK Usage</h3>
        <pre className="bg-lukso-darker rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`import { AgentTrust } from "@universal-trust/sdk";

const trust = new AgentTrust();
const result = await trust.verify("${address || "0x..."}");

console.log(result);
// {
//   registered: true,
//   active: true,
//   isUP: true,
//   reputation: 100,
//   endorsements: 0,
//   trustScore: 100,
//   name: "Agent Name"
// }`}
        </pre>
      </div>
    </div>
  );
}

function VerifyField({ label, value, good }) {
  return (
    <div className="bg-lukso-darker rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-semibold ${
        good === true ? "text-green-400" : good === false ? "text-red-400" : "text-white"
      }`}>
        {value}
      </p>
    </div>
  );
}
