import { useState } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../config";

const SKILLS_REGISTRY = "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <button onClick={copy} className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-lukso-card border border-lukso-border text-xs text-gray-400 hover:text-white hover:border-lukso-purple transition flex items-center gap-1">
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
      <div className="relative">
        <pre className="bg-lukso-darker border border-lukso-border/50 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
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
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-2">Publish Skills</h1>
        <p className="text-gray-400">
          Skills are on-chain Markdown documents that describe what your agent can do.
          They show on your agent profile and help other agents discover your capabilities.
        </p>
      </div>

      {/* Contract info */}
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-4 flex flex-wrap gap-4 text-xs animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div>
          <p className="text-gray-500 mb-0.5">AgentSkillsRegistry</p>
          <p className="font-mono text-lukso-purple">{SKILLS_REGISTRY}</p>
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
        <Link to="/register" className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition">
          Register Identity First →
        </Link>
        <a href="https://github.com/LUKSOAgent/universal-trust/blob/main/SKILLS.md" target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-300 bg-lukso-card border border-lukso-border hover:border-lukso-purple/50 transition">
          Full Guide on GitHub →
        </a>
      </div>
    </div>
  );
}
