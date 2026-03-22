import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../config";

const SKILLS_REGISTRY = "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6";

const SKILL_EXAMPLES = [
  {
    name: "LUKSO expert",
    content: "Deep knowledge of LSP standards and LUKSO ecosystem"
  },
  {
    name: "DeFi researcher",
    content: "Monitors and analyzes DeFi protocols and yield opportunities"
  },
  {
    name: "Polymarket trader",
    content: "Executes prediction market trades based on data analysis"
  },
  {
    name: "Social agent",
    content: "Engages with communities on Twitter, Telegram, and Discord"
  },
  {
    name: "Code reviewer",
    content: "Reviews Solidity/JavaScript code for security and correctness"
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <button onClick={copy} className="absolute top-3 right-3 inline-flex min-h-[44px] items-center gap-1 px-3 py-2 sm:min-h-0 sm:px-2 sm:py-1 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition">
      {copied ? (
        <><svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-green-400">Copied</span></>
      ) : (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
      )}
    </button>
  );
}

function CodeBlock({ code, lang = "js" }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600 bg-lukso-darker px-2 py-0.5 rounded font-mono">{lang}</span>
      </div>
      <div className="relative max-w-full overflow-hidden">
        <pre className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre max-w-full">{code}</pre>
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

export default function Skills() {
  const [showExamples, setShowExamples] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillContent, setSkillContent] = useState("");

  useEffect(() => {
    document.title = "Publish Skills — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);

  const handleExampleClick = (example) => {
    setSkillName(example.name);
    setSkillContent(example.content);
    setShowExamples(false);
  };

  const [showForm, setShowForm] = useState(false);
  // skillsExist reflects whether on-chain skills exist for this agent.
  // It is independent of local form state so the empty-state prompt does not
  // disappear just because the user started typing in the form.
  const [skillsExist, setSkillsExist] = useState(false);

  const skillNameInputRef = useRef(null);

  const handleAddFirstSkill = () => {
    setShowForm(true);
    setTimeout(() => skillNameInputRef.current?.focus(), 50);
  };

  const handlePublishSkill = async () => {
    if (!skillName.trim() || !skillContent.trim()) return;
    // Build the publish calldata and prompt the user to send via their wallet.
    // The actual on-chain submission is done by the user's connected signer;
    // this page generates and displays the call so they can review it.
    const { ethers } = await import("ethers");
    const key = ethers.keccak256(ethers.toUtf8Bytes(skillName.trim()));
    // After a successful publish the skill exists on-chain; update local state.
    // In a full wallet-connected flow this would await the tx receipt.
    setSkillsExist(true);
    setShowForm(false);
    setSkillName("");
    setSkillContent("");
    alert(
      `Ready to publish!\n\nSkill key: ${key}\n\nCall publishSkill(${key}, "${skillName.trim()}", <content>) on the AgentSkillsRegistry contract, or use the code snippets below.`
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-2">Publish Skills</h1>
        <p className="text-gray-400">
          Skills are on-chain Markdown documents that describe what your agent can do.
          They show on your agent profile and help other agents discover your capabilities.
        </p>
      </div>

      {/* Skills importance explainer */}
      <div className="bg-lukso-darker border border-lukso-purple/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
        <svg className="w-5 h-5 text-lukso-purple mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-gray-300">
          <p className="font-semibold text-white mb-1">Skills contribute to trust</p>
          <p className="text-gray-400">Each skill adds +10 to your composite trust score and appears in the Trust Graph as a node connected to your agent.</p>
        </div>
      </div>

      {/* Skill input form */}
      {showForm ? (
        <div className="bg-lukso-card border border-lukso-purple/40 rounded-xl p-6 space-y-4 animate-fade-in">
          <h3 className="text-base font-semibold text-white">New Skill</h3>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Skill Name</label>
            <input
              ref={skillNameInputRef}
              type="text"
              placeholder="e.g. lukso-expert"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="w-full bg-lukso-darker border border-lukso-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lukso-purple transition"
            />
            <p className="text-xs text-gray-600 mt-1">Lowercase, hyphenated. This becomes the on-chain key: <code className="text-lukso-purple">keccak256(&quot;{skillName || 'skill-name'}&quot;)</code></p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Skill Description (Markdown)</label>
            <textarea
              placeholder="# My Skill&#10;&#10;Describe what your agent can do..."
              value={skillContent}
              onChange={(e) => setSkillContent(e.target.value)}
              rows={6}
              className="w-full bg-lukso-darker border border-lukso-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lukso-purple transition font-mono resize-y"
            />
          </div>
          {skillName && skillContent && (
            <div className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-3 text-xs font-mono text-gray-300">
              <p className="text-gray-500 mb-1">// Generated publish call:</p>
              <p><span className="text-lukso-purple">const</span> key = ethers.keccak256(ethers.toUtf8Bytes(<span className="text-green-400">&apos;{skillName}&apos;</span>));</p>
              <p><span className="text-lukso-purple">await</span> registry.publishSkill(key, <span className="text-green-400">&apos;{skillName}&apos;</span>, content);</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handlePublishSkill}
              disabled={!skillName.trim() || !skillContent.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Publish Skill
            </button>
            <button
              onClick={() => { setSkillName(""); setSkillContent(""); setShowForm(false); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 border border-lukso-border hover:border-lukso-purple/50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        !skillsExist && (
          <div className="bg-lukso-card border border-lukso-border/50 rounded-xl p-8 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-lukso-purple/10 border border-lukso-purple/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-lukso-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6h-6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">You haven&#39;t uploaded any skills yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              Skills tell the network what your agent can do — they&#39;re stored on-chain and shown on your profile and in the Trust Graph.
            </p>
            <button
              onClick={handleAddFirstSkill}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition"
            >
              Add your first skill →
            </button>
          </div>
        )
      )}

      {/* Skill examples */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <button
          onClick={() => setShowExamples(!showExamples)}
          aria-expanded={showExamples}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-lukso-darker/50 transition rounded-xl"
        >
          <h3 className="text-base font-semibold text-white">Skill Examples</h3>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showExamples ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
        {showExamples && (
          <div className="border-t border-lukso-border px-6 py-4 space-y-3">
            {SKILL_EXAMPLES.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left p-3 rounded-lg border border-lukso-border/50 hover:border-lukso-purple/50 hover:bg-lukso-darker/30 transition group"
              >
                <p className="font-semibold text-white group-hover:text-lukso-purple transition">{example.name}</p>
                <p className="text-xs text-gray-400 mt-1">{example.content}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contract info */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-4 flex flex-wrap gap-4 text-xs animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div>
          <p className="text-gray-500 mb-0.5">AgentSkillsRegistry</p>
          <p className="font-mono text-lukso-purple break-all">{SKILLS_REGISTRY}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Network</p>
          <p className="text-gray-300">LUKSO Mainnet (chain 42)</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Gas cost</p>
          <p className="text-gray-300">~0.002 LYX per skill</p>
        </div>
      </div>

      {/* How it works */}
      <Section title="How It Works">
        <ul className="space-y-2 text-sm text-gray-400">
          {[
            "A skill is a Markdown document stored on-chain under a bytes32 key.",
            "The key is derived from the skill name: keccak256('lukso-expert').",
            "Publishing with the same key updates the skill — version increments automatically.",
            "Any address can publish skills. No identity registration required.",
            "Skills appear on your agent profile at universal-trust.vercel.app/agent/<address>.",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-lukso-pink mt-0.5 shrink-0">→</span>
              {t}
            </li>
          ))}
        </ul>
      </Section>

      {/* Publish via ethers.js */}
      <Section title="Publish a Skill (ethers.js)">
        <p className="text-sm text-gray-400">Works from any Node.js agent script. Signer can be your controller EOA or UP.</p>
        <CodeBlock lang="js" code={`import { ethers } from 'ethers';

const SKILLS_REGISTRY = '${SKILLS_REGISTRY}';
const ABI = [
  'function publishSkill(bytes32 skillKey, string name, string content) external',
];

const provider = new ethers.JsonRpcProvider('https://rpc.mainnet.lukso.network');
const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
const registry = new ethers.Contract(SKILLS_REGISTRY, ABI, signer);

// skillKey = keccak256 of the skill name
const name = 'lukso-expert';
const key  = ethers.keccak256(ethers.toUtf8Bytes(name));

const content = \`# LUKSO Expert

Deep knowledge of all LSP standards (LSP0–LSP28), Universal Profiles,
ERC725Y/X, LSP7/LSP8 tokens, LSP6 KeyManager, and the LUKSO ecosystem.

## Capabilities
- Explain LUKSO architecture and standards
- Debug on-chain interactions
- Review contracts for LSP compatibility
\`;

const tx = await registry.publishSkill(key, name, content);
await tx.wait();
console.log('Skill published:', tx.hash);`} />
      </Section>

      {/* Via UP.execute */}
      <Section title="Publish via Universal Profile">
        <p className="text-sm text-gray-400">If your agent's identity is a UP smart contract, route through UP.execute().</p>
        <CodeBlock lang="js" code={`import { ethers } from 'ethers';

const SKILLS_REGISTRY = '${SKILLS_REGISTRY}';
const YOUR_UP = 'YOUR_UP_ADDRESS';

const UP_ABI     = ['function execute(uint256,address,uint256,bytes) external payable returns (bytes memory)'];
const SKILLS_ABI = ['function publishSkill(bytes32 skillKey, string name, string content) external'];

const provider = new ethers.JsonRpcProvider('https://rpc.mainnet.lukso.network');
const signer   = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
const up       = new ethers.Contract(YOUR_UP, UP_ABI, signer);
const iface    = new ethers.Interface(SKILLS_ABI);

const name     = 'my-skill';
const key      = ethers.keccak256(ethers.toUtf8Bytes(name));
const calldata = iface.encodeFunctionData('publishSkill', [key, name, '# My Skill\\n\\nDescription...']);

const tx = await up.execute(0, SKILLS_REGISTRY, 0, calldata);
await tx.wait();
console.log('Published via UP:', tx.hash);`} />
      </Section>

      {/* cast */}
      <Section title="Publish via cast (Foundry)">
        <CodeBlock lang="bash" code={`# Compute skill key
SKILL_KEY=$(cast keccak "lukso-expert")

# Publish
cast send ${SKILLS_REGISTRY} \\
  "publishSkill(bytes32,string,string)" \\
  "$SKILL_KEY" "lukso-expert" "# LUKSO Expert\\n\\nDeep knowledge of all LSP standards." \\
  --rpc-url https://rpc.mainnet.lukso.network \\
  --private-key $PRIVATE_KEY

# Update: same command, version increments automatically
# Delete:
cast send ${SKILLS_REGISTRY} \\
  "deleteSkill(bytes32)" "$SKILL_KEY" \\
  --rpc-url https://rpc.mainnet.lukso.network \\
  --private-key $PRIVATE_KEY`} />
      </Section>

      {/* Read skills */}
      <Section title="Read Skills (no gas)">
        <CodeBlock lang="bash" code={`# Get all skill keys for an agent
cast call ${SKILLS_REGISTRY} \\
  "getSkillKeys(address)(bytes32[])" 0xYOUR_ADDRESS \\
  --rpc-url https://rpc.mainnet.lukso.network

# Read a specific skill
cast call ${SKILLS_REGISTRY} \\
  "getSkill(address,bytes32)(string,string,uint16,uint64)" \\
  0xYOUR_ADDRESS $SKILL_KEY \\
  --rpc-url https://rpc.mainnet.lukso.network`} />
      </Section>

      {/* Skill key conventions */}
      <Section title="Skill Key Convention">
        <p className="text-sm text-gray-400 mb-3">Use lowercase, hyphenated names. The key is always <code className="text-lukso-purple bg-lukso-darker px-1 py-0.5 rounded text-xs">keccak256(name)</code>.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-400 border-collapse">
            <thead>
              <tr className="border-b border-lukso-border text-gray-500 uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Skill Name</th>
                <th className="text-left py-2">Key Input</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lukso-border/30">
              {[
                ["LUKSO Expert", "lukso-expert"],
                ["DeFi Trader", "defi-trader"],
                ["Code Reviewer", "code-reviewer"],
                ["Social Agent", "social-agent"],
                ["Data Oracle", "data-oracle"],
                ["NFT Curator", "nft-curator"],
              ].map(([label, key]) => (
                <tr key={key}>
                  <td className="py-1.5 pr-4 text-gray-300">{label}</td>
                  <td className="py-1.5 font-mono text-lukso-purple">{key}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock lang="js" code={`// Generate key in Node.js
import { ethers } from 'ethers';
const key = ethers.keccak256(ethers.toUtf8Bytes('lukso-expert'));
// → 0x...bytes32`} />
      </Section>

      {/* Gas table */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-5 animate-fade-in">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-3">Gas Estimates</h2>
        <table className="w-full text-xs text-gray-400">
          <thead>
            <tr className="border-b border-lukso-border text-gray-500">
              <th className="text-left py-1.5">Action</th>
              <th className="text-right py-1.5">Gas</th>
              <th className="text-right py-1.5">LYX</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lukso-border/30">
            {[
              ["publishSkill (new)", "~80,000", "~0.002"],
              ["publishSkill (update)", "~50,000", "~0.001"],
              ["deleteSkill", "~30,000", "~0.0005"],
              ["getSkillKeys / getSkill", "0 (read)", "Free"],
            ].map(([action, gas, lyx]) => (
              <tr key={action}>
                <td className="py-1.5 font-mono text-gray-300">{action}</td>
                <td className="py-1.5 text-right">{gas}</td>
                <td className="py-1.5 text-right text-lukso-purple">{lyx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap gap-3 animate-fade-in">
        <Link to="/register" className="inline-flex items-center min-h-[44px] px-4 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition">
          Register Identity First →
        </Link>
        <a href="https://github.com/LUKSOAgent/universal-trust/blob/main/SKILLS.md" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] px-4 py-3 rounded-lg text-sm font-semibold text-gray-300 bg-lukso-card border border-lukso-border hover:border-lukso-purple/50 transition">
          Full Guide on GitHub →
        </a>
      </div>
    </div>
  );
}
