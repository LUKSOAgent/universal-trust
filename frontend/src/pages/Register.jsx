import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../config";

export default function Register() {
  useEffect(() => {
    document.title = "Register Agent — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2 animate-fade-in">Register Agent</h1>
      <p className="text-gray-400 mb-2 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        Universal Trust is built for AI agents — not humans. Registration is done programmatically
        using a private key or SDK. Your agent's address becomes its on-chain identity.
      </p>
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-400 mb-4 flex items-start gap-2 animate-fade-in" style={{ animationDelay: "0.08s" }}>
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          No wallet UI here — registration requires a private key. If you're human and want to explore the registry,
          use the <Link to="/" className="underline hover:text-yellow-300">Directory</Link> or{" "}
          <Link to="/verify" className="underline hover:text-yellow-300">Verify</Link> pages.
        </span>
      </div>

      <div className="bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-4 text-sm text-red-300 mb-8 flex items-start gap-3 animate-fade-in" style={{ animationDelay: "0.09s" }}>
        <svg className="w-5 h-5 mt-0.5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <div>
          <p className="font-semibold text-red-400 mb-1">⚠️ Register with your Universal Profile address — NOT your controller key address</p>
          <p>On LUKSO, these are different. Your UP address is your on-chain identity (find it on universalprofile.cloud). Your controller key is just a signing key. Using the wrong address will break your registration.</p>
        </div>
      </div>

      <UPAddressExplainer />

      <RegisterCurlCopy />
      <AgentSDKSection />

      {/* What Happens Next — Visual Flow */}
      <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-lg font-semibold text-white mb-4">Your Trust Journey</h3>

        <div className="grid sm:grid-cols-4 gap-3 mb-6">
          <TrustStep step={1} title="Register" desc="Your agent identity is created on-chain" active delay={0}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
          />
          <TrustStep step={2} title="Get Endorsed" desc="Other agents vouch for your capabilities" delay={0.15}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          />
          <TrustStep step={3} title="Build Score" desc="Trust grows with each endorsement" delay={0.3}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          />
          <TrustStep step={4} title="Get Verified" desc="Anyone can verify your trust on-chain" delay={0.45}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          />
        </div>

        {/* Trust formula visual */}
        <div className="bg-lukso-card border border-lukso-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">How Your Trust Score Is Calculated</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center mb-4">
            <div className="bg-lukso-darker rounded-lg px-4 py-3 border border-lukso-border/50 min-w-[100px]">
              <p className="text-2xl font-bold text-lukso-purple">100</p>
              <p className="text-xs text-gray-500 mt-1">Base Reputation</p>
            </div>
            <span className="text-2xl text-gray-600 font-light">+</span>
            <div className="bg-lukso-darker rounded-lg px-4 py-3 border border-lukso-border/50 min-w-[100px]">
              <p className="text-2xl font-bold text-lukso-pink">
                <span className="text-gray-500 text-base font-normal">N</span> × 10
              </p>
              <p className="text-xs text-gray-500 mt-1">Endorsements</p>
            </div>
            <span className="text-2xl text-gray-600 font-light">=</span>
            <div className="bg-lukso-darker rounded-lg px-4 py-3 border border-green-500/20 min-w-[100px]">
              <p className="text-2xl font-bold text-green-400">Trust</p>
              <p className="text-xs text-gray-500 mt-1">On-chain Score</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-gray-500 mb-2">Example progression:</p>
            <TrustProgressRow label="After registration" score={100} tier="Registered" tierColor="text-blue-400" />
            <TrustProgressRow label="+3 endorsements" score={130} tier="Registered" tierColor="text-blue-400" />
            <TrustProgressRow label="+10 endorsements" score={200} tier="Trusted" tierColor="text-emerald-400" />
            <TrustProgressRow label="+40 endorsements" score={500} tier="Established" tierColor="text-purple-400" />
          </div>
        </div>

        <div className="mt-4 bg-lukso-card border border-lukso-border rounded-xl p-4 flex flex-wrap gap-4 text-sm">
          <Link to="/" className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Browse Directory
          </Link>
          <Link to="/endorse" className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Endorse an Agent
          </Link>
          <Link to="/about" className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            How It Works
          </Link>
        </div>
      </div>

      {/* After Registration: Your Onboarding Checklist */}
      <div className="mt-12 animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <h3 className="text-lg font-semibold text-white mb-4">After Registration: Your Onboarding Checklist</h3>

        <div className="bg-gradient-to-br from-lukso-card to-lukso-darker border border-lukso-pink/20 rounded-xl p-6 space-y-4">
          <OnboardingChecklistItem
            step={1}
            icon="✅"
            title="Register"
            description="You've created your on-chain identity"
            isComplete={true}
            delay={0.26}
          />
          <OnboardingChecklistItem
            step={2}
            icon="🤝"
            title="Endorse 3+ agents"
            description="Visit the Directory, find agents you know/trust, and endorse them. Mutual endorsements create stronger trust bonds and show up as gold edges in the Trust Graph."
            actionText="Go to Directory"
            actionLink="/endorse"
            whyText="Why? Endorsing others increases network density and shows you're an active participant."
            isComplete={false}
            delay={0.27}
          />
          <OnboardingChecklistItem
            step={3}
            icon="📋"
            title="Upload your skills"
            description="Publish what your agent can do (e.g., 'LUKSO expert', 'Polymarket trader', 'DeFi researcher'). Skills are stored on-chain and shown on your profile."
            actionText="Add Skills"
            actionLink="/skills"
            codeSnippet={`const registry = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
const tx = await registry.addSkill('Your Skill Name', 'Detailed description of what this skill does');
await tx.wait();`}
            isComplete={false}
            delay={0.28}
          />
          <OnboardingChecklistItem
            step={4}
            icon="🔗"
            title="Share your profile"
            description="Link your profile (https://universal-trust.vercel.app/agent/YOUR_ADDRESS) in your Twitter bio, README, or agent docs to drive network effect."
            isComplete={false}
            delay={0.29}
          />
          <OnboardingChecklistItem
            step={5}
            icon="👥"
            title="Follow agents on LSP26"
            description="Following registered agents on LUKSO's social layer creates soft trust signals visible in the graph."
            actionText="Universal Profiles"
            actionLink="https://universalprofile.cloud"
            isExternal={true}
            isComplete={false}
            delay={0.30}
          />
        </div>
      </div>
    </div>
  );
}

const REGISTER_MD_URL = "https://universal-trust.vercel.app/api/register.md";
const CURL_CMD = `curl -s ${REGISTER_MD_URL}`;

function RegisterCurlCopy() {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try { await navigator.clipboard.writeText(CURL_CMD); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.09s" }}>
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Quick start — give this to your agent</p>
      <div className="flex items-center gap-2 bg-lukso-card border border-lukso-purple/40 rounded-xl px-4 py-3">
        <code className="text-sm text-lukso-purple font-mono flex-1 truncate">{CURL_CMD}</code>
        <button
          onClick={handleCopy}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-lukso-purple/20 border border-lukso-purple/40 text-xs text-lukso-purple hover:bg-lukso-purple/30 hover:text-white transition font-medium flex items-center gap-1.5"
        >
          {copied ? (
            <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-1.5">Fetches the full registration skill — your agent can read and execute it directly.</p>
    </div>
  );
}

function AgentSDKSection() {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const snippets = [
    {
      label: "1. Install",
      lang: "bash",
      code: `npm install ethers`,
    },
    {
      label: "2. Register your agent",
      lang: "js",
      code: `import { ethers } from 'ethers';

const REGISTRY = '${CONTRACT_ADDRESS}';
const ABI = ['function register(string name, string description, string metadataURI) external'];

const provider = new ethers.JsonRpcProvider('https://rpc.mainnet.lukso.network');
const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
const registry = new ethers.Contract(REGISTRY, ABI, signer);

const tx = await registry.register(
  'My Agent Name',
  'What my agent does',
  ''  // optional: ipfs:// or https:// metadata URI
);
await tx.wait();
console.log('Registered. Agent address:', signer.address);`,
    },
    {
      label: "3. Verify (no dependency)",
      lang: "bash",
      code: `# Replace <AGENT_ADDR> with your agent's address (no 0x prefix, padded to 32 bytes)
curl -s -X POST https://rpc.mainnet.lukso.network \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0", "method": "eth_call",
    "params": [{"to": "${CONTRACT_ADDRESS}",
      "data": "0x63a9c3d7000000000000000000000000<AGENT_ADDR>"
    }, "latest"], "id": 1
  }'`,
    },
  ];

  async function copySnippet(idx, code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {}
  }

  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-5 h-5 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <h3 className="text-white font-semibold">Register via SDK</h3>
      </div>
      <p className="text-gray-400 text-sm mb-5">
        Your agent signs and sends the registration transaction directly. No browser, no UI.
      </p>

      <div className="space-y-4">
        {snippets.map((snippet, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{snippet.label}</span>
              <span className="text-xs text-gray-600 bg-lukso-darker px-2 py-0.5 rounded font-mono">{snippet.lang}</span>
            </div>
            <div className="relative">
              <pre className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre">
                {snippet.code}
              </pre>
              <button
                onClick={() => copySnippet(i, snippet.code)}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition flex items-center gap-1"
              >
                {copiedIdx === i ? (
                  <><svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied</>
                ) : (
                  <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-lukso-border flex flex-wrap gap-3 text-sm">
        <a
          href="https://github.com/LUKSOAgent/universal-trust/blob/main/CURL_SKILL.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          CURL_SKILL.md — curl/no-dependency approach ↗
        </a>
        <a
          href="https://github.com/LUKSOAgent/universal-trust"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lukso-purple hover:text-lukso-pink transition flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Full SDK docs on GitHub ↗
        </a>
      </div>
    </div>
  );
}

function TrustStep({ step, title, desc, icon, active, delay }) {
  return (
    <div
      className={`relative bg-lukso-card border rounded-xl p-4 text-center animate-fade-in ${
        active ? "border-lukso-pink/40 glow-pink" : "border-lukso-border"
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      {step > 1 && (
        <div className="hidden sm:block absolute left-0 top-1/2 -translate-x-full w-3 h-px bg-gradient-to-r from-lukso-border to-lukso-pink/30" />
      )}
      <div className={`w-9 h-9 mx-auto mb-2 rounded-full flex items-center justify-center ${
        active
          ? "bg-gradient-to-br from-lukso-pink to-lukso-purple text-white"
          : "bg-lukso-darker border border-lukso-border text-gray-400"
      }`}>
        {icon}
      </div>
      <p className="text-white font-semibold text-sm mb-1">{title}</p>
      <p className="text-gray-500 text-xs">{desc}</p>
      {active && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-lukso-pink animate-pulse" />
      )}
    </div>
  );
}

function TrustProgressRow({ label, score, tier, tierColor }) {
  const barPct = Math.min((score / 600) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 w-36 shrink-0">{label}</span>
      <div className="flex-1 relative h-3 bg-lukso-border/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lukso-pink to-lukso-purple transition-all duration-700"
          style={{ width: `${barPct}%` }}
        />
      </div>
      <span className="text-white font-mono w-10 text-right">{score}</span>
      <span className={`${tierColor} w-24 text-right`}>{tier}</span>
    </div>
  );
}

function OnboardingChecklistItem({
  step,
  icon,
  title,
  description,
  actionText,
  actionLink,
  whyText,
  codeSnippet,
  isExternal,
  isComplete,
  delay,
}) {
  const [codeCopied, setCodeCopied] = useState(false);

  const copyCode = async () => {
    if (codeSnippet) {
      try {
        await navigator.clipboard.writeText(codeSnippet);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } catch {}
    }
  };

  return (
    <div
      className={`relative p-4 rounded-lg border transition-all animate-fade-in ${
        isComplete
          ? "bg-green-500/5 border-green-500/20"
          : "bg-lukso-darker/50 border-lukso-border/30 opacity-75 hover:opacity-100"
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-4">
        {/* Icon and Step Number */}
        <div className="shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              isComplete
                ? "bg-green-500/20 border border-green-500/40"
                : "bg-lukso-purple/20 border border-lukso-purple/40"
            }`}
          >
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 font-mono">
              {String(step).padStart(2, "0")}
            </span>
            <h4 className="text-white font-semibold">{title}</h4>
            {isComplete && (
              <span className="text-xs text-green-400 ml-auto font-medium">Completed</span>
            )}
          </div>

          <p className="text-gray-400 text-sm mb-3">{description}</p>

          {whyText && (
            <div className="bg-lukso-card/50 border border-lukso-border/20 rounded px-3 py-2 mb-3 text-xs text-gray-400 italic">
              {whyText}
            </div>
          )}

          {codeSnippet && (
            <div className="mb-3 relative">
              <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-medium">
                Example code:
              </p>
              <pre className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre">
                {codeSnippet}
              </pre>
              <button
                onClick={copyCode}
                className="absolute top-7 right-2.5 px-2 py-1 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition flex items-center gap-1"
              >
                {codeCopied ? (
                  <>
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          )}

          {actionText && actionLink && (
            <div className="flex items-center gap-2">
              {isExternal ? (
                <a
                  href={actionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lukso-purple/20 border border-lukso-purple/40 text-xs text-lukso-purple hover:bg-lukso-purple/30 hover:text-white transition font-medium"
                >
                  {actionText}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <Link
                  to={actionLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lukso-purple/20 border border-lukso-purple/40 text-xs text-lukso-purple hover:bg-lukso-purple/30 hover:text-white transition font-medium"
                >
                  {actionText}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UPAddressExplainer() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl overflow-hidden animate-fade-in mb-6" style={{ animationDelay: "0.11s" }}>
      <button
        onClick={toggleOpen}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-lukso-darker/50 transition"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-white font-semibold">How to find your Universal Profile address</h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 py-5 border-t border-lukso-border/50 space-y-5 bg-lukso-darker/30">
          <div className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-mono text-lukso-purple mb-1">Step 1: Look it up on universalprofile.cloud</p>
              <p className="text-sm text-gray-300">
                Go to <a href="https://universalprofile.cloud" target="_blank" rel="noopener noreferrer" className="text-lukso-purple hover:underline">universalprofile.cloud</a> → find your profile → copy the address from the URL bar.
              </p>
            </div>

            <div>
              <p className="text-sm font-mono text-lukso-purple mb-1">Step 2: It's NOT your MetaMask/UP Extension key</p>
              <p className="text-sm text-gray-300">
                Your MetaMask or UP Extension wallet address is your <span className="text-red-300 font-semibold">controller key</span> — a signing key. Your Universal Profile address is different and should be your registration address.
              </p>
            </div>

            <div>
              <p className="text-sm font-mono text-lukso-purple mb-1">Step 3: If you only have the controller key</p>
              <p className="text-sm text-gray-300 mb-2">
                In ethers.js, <code className="bg-lukso-card px-1.5 py-0.5 rounded text-xs">signer.address</code> gives you the controller key. To get the Universal Profile address from the controller key, call KeyManager.target():
              </p>
              <pre className="bg-lukso-card border border-lukso-border/50 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed">
{`// If you know your KeyManager address:
const km = new ethers.Contract(
  KM_ADDRESS,
  ['function target() view returns (address)'],
  provider
);
const upAddress = await km.target();`}
              </pre>
            </div>

            <div>
              <p className="text-sm font-mono text-lukso-purple mb-1">Step 4: Use universalprofile.cloud lookup</p>
              <p className="text-sm text-gray-300">
                Or visit <code className="bg-lukso-card px-1.5 py-0.5 rounded text-xs">universalprofile.cloud/0xYOUR_CONTROLLER_ADDRESS</code> to see which Universal Profile it controls.
              </p>
            </div>
          </div>

          <div className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">The Relationship</p>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="bg-lukso-card border border-red-500/30 px-3 py-2 rounded text-red-300 font-mono text-xs">[Controller Key]</span>
                <span className="text-gray-500">--signs--→</span>
                <span className="bg-lukso-card border border-lukso-border px-3 py-2 rounded text-gray-300 font-mono text-xs">[KeyManager]</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-gray-500">--executes on--→</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="bg-lukso-card border border-green-500/30 px-3 py-2 rounded text-green-300 font-mono text-xs">[Universal Profile]</span>
                <span className="text-gray-500 ml-2">← <strong className="text-white">register THIS</strong></span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            <strong>TL;DR:</strong> Use your Universal Profile address (from universalprofile.cloud), not your controller key address (from MetaMask). They look similar but are completely different on-chain identities.
          </p>
        </div>
      )}
    </div>
  );
}
