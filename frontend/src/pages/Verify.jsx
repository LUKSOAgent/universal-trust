import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyAgent } from "../useContract";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "../config";
import TrustBadge, { TrustScoreBar } from "../components/TrustBadge";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [address, setAddress] = useState(searchParams.get("address") || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [scanPhase, setScanPhase] = useState(null);

  useEffect(() => {
    document.title = "Trust Scanner — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);

  // Auto-verify if address provided via URL
  useEffect(() => {
    const urlAddr = searchParams.get("address");
    if (urlAddr && /^0x[0-9a-fA-F]{40}$/.test(urlAddr)) {
      doVerify(urlAddr);
    }
  }, []);

  function validateAddress(value) {
    if (!value) {
      setValidationError(null);
      return;
    }
    if (!value.startsWith("0x")) {
      setValidationError("Address must start with 0x");
    } else if (value.length > 2 && !/^0x[0-9a-fA-F]*$/.test(value)) {
      setValidationError("Address contains invalid characters");
    } else if (value.length > 42) {
      setValidationError("Address too long — must be exactly 42 characters");
    } else {
      setValidationError(null);
    }
  }

  async function doVerify(addr) {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setScanPhase("scanning");
      const data = await verifyAgent(addr);
      setScanPhase("done");
      setResult(data);
    } catch (err) {
      setScanPhase(null);
      if (err.message?.includes("network") || err.message?.includes("fetch")) {
        setError("Failed to connect to LUKSO network. Please try again.");
      } else {
        setError(err.message);
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();

    const isAddr = /^0x[0-9a-fA-F]{40}$/.test(address);
    if (!isAddr) {
      setValidationError("Invalid address. Must be a valid 0x... address (42 characters).");
      setResult(null);
      return;
    }

    doVerify(address);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Scanner Header */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-lukso-pink/20 to-lukso-purple/20 border border-lukso-border flex items-center justify-center">
          <svg className="w-8 h-8 text-lukso-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Trust Scanner</h1>
        <p className="text-gray-400">
          Paste any address to check its on-chain trust status.
          Reads directly from the <code className="text-lukso-purple font-mono text-sm">verify()</code> smart contract function.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleVerify} className="mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                validateAddress(e.target.value);
              }}
              placeholder="0x... agent or Universal Profile address"
              aria-label="Agent address to verify"
              className={`w-full bg-lukso-card border rounded-lg px-4 py-3 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:ring-1 transition ${
                validationError
                  ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/50"
                  : "border-lukso-border focus:border-lukso-pink focus:ring-lukso-pink/50"
              }`}
            />
            {address && !loading && (
              <button
                type="button"
                onClick={() => {
                  setAddress("");
                  setResult(null);
                  setError(null);
                  setValidationError(null);
                  setScanPhase(null);
                }}
                aria-label="Clear address"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap shrink-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scanning...
              </span>
            ) : (
              "Scan"
            )}
          </button>
        </div>
        {validationError && (
          <p className="mt-2 text-sm text-red-400">{validationError}</p>
        )}
        {!result && !loading && !address && (
          <p className="mt-3 text-xs text-gray-600">
            Try it:{" "}
            <button
              type="button"
              onClick={() => {
                setAddress("0x293E96ebbf264ed7715cff2b67850517De70232a");
                setValidationError(null);
              }}
              className="text-lukso-purple hover:text-lukso-pink transition font-mono"
            >
              0x293E...0232a
            </button>
            {" "}(registered agent)
          </p>
        )}
      </form>

      {/* Scanning Animation */}
      {loading && scanPhase === "scanning" && (
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-2 border-lukso-pink/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-lukso-purple/40 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-lukso-pink border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-lukso-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <ScanPhaseText />
          <p className="text-gray-600 text-xs mt-2 font-mono">{address}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-red-400 font-medium">Scan failed</p>
              <p className="text-red-400/70 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="animate-fade-in">
          {!result.registered ? (
            /* NOT REGISTERED */
            <div className="bg-lukso-card border border-red-500/30 rounded-xl p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">Scan Result</p>
                <h2 className="text-3xl font-bold text-red-400 mb-2">NOT REGISTERED</h2>
                <p className="text-gray-400 mb-1">
                  This address is not in the AgentIdentityRegistry.
                </p>
                <p className="text-gray-600 text-sm font-mono mb-6">{address}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/register"
                    className="px-5 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm"
                  >
                    Register This Agent
                  </Link>
                  <a
                    href={`https://universalprofile.cloud/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition text-sm"
                  >
                    Check Universal Profile ↗
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* REGISTERED — verified result */
            <div className="bg-lukso-card border border-green-500/30 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
              
              {/* Verified Banner */}
              <div className="relative z-10 p-6 border-b border-lukso-border">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-widest text-green-400/70 mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Verified Agent
                    </p>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold text-white truncate">{result.name}</h2>
                      <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`${EXPLORER_URL}/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-lukso-purple hover:text-lukso-pink transition"
                      >
                        {address.slice(0, 10)}...{address.slice(-8)}
                      </a>
                      <CopyButton text={address} />
                    </div>
                  </div>
                  <TrustBadge score={result.trustScore} size="lg" />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="relative z-10 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
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

                {/* Trust score breakdown */}
                <div className="bg-lukso-darker rounded-lg p-4 mb-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Trust Score Breakdown</p>
                  <TrustScoreBar
                    reputation={result.reputation}
                    endorsements={result.endorsements}
                    trustScore={result.trustScore}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-lukso-border">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/agent/${address}`}
                      className="text-lukso-pink hover:underline text-sm font-medium"
                    >
                      View full profile →
                    </Link>
                    <Link
                      to={`/endorse?address=${address}`}
                      className="text-lukso-purple hover:underline text-sm"
                    >
                      Endorse this agent
                    </Link>
                    {result.isUP && (
                      <a
                        href={`https://universalprofile.cloud/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white text-sm transition"
                      >
                        View UP ↗
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    On-chain data · LUKSO Mainnet
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raw Contract Data — collapsible, shown after verification */}
      {result && !loading && result.registered && (
        <RawContractData result={result} address={address} />
      )}

      {/* SDK Code Example */}
      <div className="mt-8 bg-lukso-card border border-lukso-border rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Integrate in Your Agent
          </h3>
          <span className="text-xs text-gray-600 bg-lukso-darker px-2 py-1 rounded">ethers.js v6</span>
        </div>
        <pre className="bg-lukso-darker rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`const result = await contract.verify("${address || "0x..."}");
// → { registered, active, isUP, reputation,
//      endorsements, trustScore, name }`}
        </pre>
        <p className="text-xs text-gray-500 mt-3">
          Full SDK and integration docs on{" "}
          <a
            href="https://github.com/LUKSOAgent/universal-trust"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lukso-purple hover:text-lukso-pink transition"
          >
            GitHub →
          </a>
        </p>
      </div>
    </div>
  );
}

function RawContractData({ result, address }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawJson = JSON.stringify(
    {
      address,
      registered: result.registered,
      active: result.active,
      isUP: result.isUP,
      name: result.name,
      reputation: result.reputation,
      endorsements: result.endorsements,
      trustScore: result.trustScore,
    },
    null,
    2
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="mt-4 bg-lukso-card border border-lukso-border rounded-xl overflow-hidden animate-fade-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-lukso-darker/40 transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="text-sm font-medium text-gray-300">Raw contract data</span>
          <span className="text-xs text-gray-600 font-mono">verify() → JSON</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-lukso-border">
          <div className="relative">
            <pre className="bg-lukso-darker px-5 py-4 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed">
              {rawJson}
            </pre>
            <button
              onClick={handleCopy}
              title="Copy JSON"
              className="absolute top-3 right-3 px-2.5 py-1.5 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="px-5 py-3 border-t border-lukso-border/50 flex items-center justify-between text-xs text-gray-600">
            <span>Returned by <code className="font-mono text-lukso-purple">AgentIdentityRegistry.verify("{address.slice(0, 8)}...")</code></span>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}#readContract`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lukso-purple hover:text-lukso-pink transition"
            >
              Read on Explorer ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanPhaseText() {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Connecting to LUKSO mainnet...",
    "Querying AgentIdentityRegistry...",
    "Reading on-chain trust data...",
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-1">
      {phases.slice(0, phase + 1).map((text, i) => (
        <p key={i} className={`text-sm transition-all duration-300 ${i === phase ? "text-gray-300" : "text-gray-600"}`}>
          {i < phase ? "✓ " : ""}{text}
        </p>
      ))}
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
