# Universal Trust

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![LUKSO Mainnet](https://img.shields.io/badge/Network-LUKSO%20Mainnet-FF2975.svg)](https://explorer.execution.mainnet.lukso.network/address/0x064b9576f37BdD7CED4405185a5DB3bc7be5614C)
[![Frontend](https://img.shields.io/badge/Frontend-Live-green.svg)](https://universal-trust.vercel.app)
[![CI](https://github.com/LUKSOAgent/universal-trust/workflows/CI/badge.svg)](https://github.com/LUKSOAgent/universal-trust/actions)
[![Audited](https://img.shields.io/badge/Security-Audited-blue.svg)](./AUDIT.md)

> **Hackathon Track:** Synthesis 2026 — *Agents that Trust*

> **Live:** [universal-trust.vercel.app](https://universal-trust.vercel.app) · **Contracts deployed on LUKSO mainnet** · 80/80 Foundry tests · 97/97 SDK tests · 0 critical/0 high in security audit

---

## ⚡ 30-Second Pitch

**AI agents are trading your tokens, managing portfolios, and executing contracts — autonomously. How do you know any of them are legitimate?**

Universal Trust is an on-chain identity and peer-endorsement registry for AI agents on LUKSO. One smart contract call answers the question that no platform can today:

```
trust.verify('0xAgentAddress') → { registered, trustScore, isUniversalProfile, endorsements }
```

No API keys. No centralized authority. No middleman. Just on-chain cryptographic proof — live on LUKSO mainnet right now.

---

## 🏆 For Hackathon Judges

> **Everything you need, under 5 minutes:**

| | |
|---|---|
| 🌐 **Live app** | [universal-trust.vercel.app](https://universal-trust.vercel.app) |
| ⚡ **2-minute demo** | `node demo/demo.js` — no wallet, no setup |
| 🔍 **Verified contracts** | [AgentIdentityRegistry on LUKSO Explorer](https://explorer.execution.mainnet.lukso.network/address/0x064b9576f37BdD7CED4405185a5DB3bc7be5614C#code) |
| 📊 **Trust graph API** | `curl https://universal-trust.vercel.app/api/trust-graph` |
| 🔐 **Security audit** | 0 critical · 0 high · [AUDIT.md](./AUDIT.md) |

**Key innovations (unique on LUKSO):**
1. **`verify(address)` in one call** — returns trust summary to any contract, wallet, or agent with a single RPC call. No backend required.
2. **Trust scores written to Universal Profiles as ERC725Y keys** — scores are composable with the entire LUKSO ecosystem, not siloed in a backend.
3. **ERC-8004 compliant agent identity registry** — LUKSO is the first chain with an ERC-8004 singleton. LUKSO Agent is agent ID #1.
4. **Cross-chain reputation signal** — $LUKSO token holders on Base get an automatic reputation boost via `linkBaseAddress`. Skin-in-the-game as a Sybil-resistance mechanism.
5. **Inactivity decay** — agents automatically lose reputation when dormant. Trust must be maintained, not just earned once.
6. **Built by an AI agent, for AI agents** — LUKSO Agent conceived, coded, audited, and deployed this entire project end-to-end.

**Deployed contract addresses (LUKSO mainnet):**

| Contract | Address |
|----------|---------|
| AgentIdentityRegistry (proxy) | `0x064b9576f37BdD7CED4405185a5DB3bc7be5614C` |
| AgentSkillsRegistry | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` |
| ERC-8004 Identity Registry | `0xe30B7514744D324e8bD93157E4c82230d6e6e8f3` |

---

## Why Universal Trust?

**The Problem:**

AI agents are everywhere. They trade tokens, manage portfolios, write code, execute contracts, and interact with other agents — often autonomously.

**The critical gap:** there's still no trustless way to verify if an agent is legitimate.

- An agent requests a $50k token swap from your wallet. Is it registered? Peer-endorsed? Or a drain attack?
- Two AI systems want to collaborate on a task. How do they verify each other before sharing data or execution rights?
- A DeFi protocol wants to allow agent access. How does it screen out bad actors without a centralized allowlist?

Today, agent trust is **centralized**: API keys, platform accounts, corporate-controlled registries. If the platform goes down or revokes access, the agent's identity disappears.

**The Solution: On-Chain, Permissionless Identity**

```
Agent A wants to trade on behalf of a user:
  → User checks: trust.verify('0xAgentA...')
  → Returns: registered=true, trustScore=280, isUniversalProfile=true
  → User knows: this agent has been endorsed by 18 peers with 280 reputation points
  → Decision: approve the trade ✓

Rogue bot tries to impersonate a trusted agent:
  → trust.verify('0xFakeBot...')
  → Returns: registered=false, trustScore=0
  → Decision: reject immediately ✗
```

**Real use cases enabled today:**
- **Agent-gated DeFi**: Only allow agents with trustScore ≥ 200 to call your vault
- **Collaboration networks**: Two agents verify each other before sharing sensitive data
- **Reputation staking**: Agents risk their on-chain reputation when making claims
- **Wallet access control**: LSP6 KeyManager + trust score = fine-grained agent permissions

---

## 🎯 Key Features

- **Self-registration**: Any address can register — no allowlist, no admin approval
- **Peer endorsements**: Agents vouch for each other, building social trust on-chain
- **Weighted trust scores**: Endorsements from high-rep agents count more (V2)
- **One-call verification**: `verify(address)` returns complete trust summary
- **Universal Profiles**: Native ERC165 detection for LUKSO UP agents
- **Cross-chain signals**: Link Base EOA for $LUKSO token holder reputation boost
- **Inactivity decay**: Agents automatically lose 1 rep/day after 30 days of inactivity
- **Skills registry**: Immutable on-chain record of agent capabilities
- **Permissionless endorsement removal**: Revoke an endorsement you gave
- **LSP26 social scoring**: Follower count → reputation signals

---

## 📐 Architecture

```
  ┌─────────────────────────────────────────────────────────┐
  │                    Your Application                      │
  │         (DeFi protocol, wallet, AI orchestrator)         │
  └─────────────────┬───────────────────────────────────────┘
                    │  npm install @universal-trust/sdk
                    │  trust.verify(agentAddress)
                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │              @universal-trust/sdk (TypeScript)           │
  │   verify() · getProfile() · endorse() · register()      │
  │   verifyBatch() · getTrustScore() · getSkills()         │
  └──────────────────┬──────────────────────────────────────┘
                     │  web3.js · RPC calls
                     ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                     LUKSO Mainnet (Chain 42)                      │
  │                                                                    │
  │  ┌─────────────────────────────┐  ┌──────────────────────────┐  │
  │  │   AgentIdentityRegistry     │  │   AgentSkillsRegistry    │  │
  │  │   0x064b9576f37BdD7C...     │  │   0x64B3AeCE25B73...     │  │
  │  │                             │  │                           │  │
  │  │  register()                 │  │  publishSkill()          │  │
  │  │  verify()  ←── one call    │  │  getSkill()              │  │
  │  │  endorse()                  │  │  getAllSkills()           │  │
  │  │  getTrustScore()            │  │  hasSkill()              │  │
  │  │  getAgent()                 │  │                           │  │
  │  │  getEndorsers()             │  │  (skills registry        │  │
  │  │                             │  │   linked immutably       │  │
  │  │  ERC165 UP detection ───────┼──┤   at deploy time)        │  │
  │  └─────────────────────────────┘  └──────────────────────────┘  │
  │                │                                                   │
  │                │ reads identity from                               │
  │                ▼                                                   │
  │  ┌─────────────────────────────┐                                  │
  │  │   Universal Profiles        │                                  │
  │  │   (LSP0 + LSP3 + LSP6)     │                                  │
  │  │   native LUKSO identity     │                                  │
  │  └─────────────────────────────┘                                  │
  └──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Trust Score Formula

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   trustScore = reputation + (endorsementCount × 10)              │
│                                                                   │
│   weightedTrustScore = reputation                                 │
│     + Σ clamp(endorserReputation / 10, 10, 50) per endorser      │
│     (capped at 10,000)                                            │
│                                                                   │
│   lsp26Score = registeredFollowersCount × 5  (API only)          │
│                                                                   │
│   reputation:     starts at 100, range 0–10,000                  │
│   endorsements:   each UP endorsement adds +10 (flat)            │
│                   or up to +50 (weighted, based on endorser rep)  │
│   Endorsers MUST be Universal Profiles (EOAs are rejected)        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Example:** An agent with `reputation=200` endorsed by 8 peers has `trustScore = 200 + 80 = 280`.

**V2 Weighted example:** Same agent endorsed by 2 high-rep agents (rep=500) + 6 new agents (rep=100):
`weightedTrustScore = 200 + (2×50) + (6×10) = 200 + 100 + 60 = 360`

---

## 🚀 Live Demo — Deployed on LUKSO Mainnet

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| **AgentIdentityRegistry** (proxy) | `0x064b9576f37BdD7CED4405185a5DB3bc7be5614C` | [View ✓ Verified](https://explorer.execution.mainnet.lukso.network/address/0x064b9576f37BdD7CED4405185a5DB3bc7be5614C#code) |
| AgentIdentityRegistry (impl) | `0x794528C35903761CdA06A585dc5528B619f1C785` | [View](https://explorer.execution.mainnet.lukso.network/address/0x794528C35903761CdA06A585dc5528B619f1C785) |
| **AgentSkillsRegistry** | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` | [View ✓ Verified](https://explorer.execution.mainnet.lukso.network/address/0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6#code) |
| ERC-8004 Identity Registry | `0xe30B7514744D324e8bD93157E4c82230d6e6e8f3` | [View](https://explorer.execution.mainnet.lukso.network/address/0xe30B7514744D324e8bD93157E4c82230d6e6e8f3) |

### Try it now (no wallet needed):

```bash
npm install @universal-trust/sdk

node -e "
const { AgentTrust } = require('@universal-trust/sdk');
const t = new AgentTrust({});
t.getAgentCount().then(n => console.log('Registered agents:', n));
t.verify('0x293E96ebbf264ed7715cff2b67850517De70232a').then(v => console.log(v));
"

# Or via Trust Graph API (no SDK, no wallet):
curl https://universal-trust.vercel.app/api/trust-graph | jq '.nodes[] | {name, id, trustScore, weightedTrustScore, lsp26Score}'
```

---

## 📋 Registered Agents (Live on Mainnet)

| Agent | Address | Type | Trust Score |
|-------|---------|------|-------------|
| Deployer EOA | [`0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b`](https://explorer.execution.mainnet.lukso.network/address/0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b) | EOA | 100 |
| LUKSO UP Agent | [`0x293E96ebbf264ed7715cff2b67850517De70232a`](https://universalprofile.cloud/0x293E96ebbf264ed7715cff2b67850517De70232a) | Universal Profile | 110 |

Both agents are verified live on-chain. The UP agent has been endorsed once (trustScore = 100 + 10 = 110).

---

## 🔧 Tech Stack

| Layer | Stack |
|-------|-------|
| **Blockchain** | LUKSO Mainnet (Chain ID 42) |
| **Standards** | LSP0 (Universal Profile), LSP6 (KeyManager), LSP26 (Followers), ERC165, ERC-8004 |
| **Smart Contracts** | Solidity ^0.8.19, Foundry, UUPS Proxy (ERC1967) |
| **SDK** | TypeScript, Web3.js v4, tsup (CJS + ESM + DTS) |
| **Frontend** | React 19, Vite, Tailwind CSS, ethers.js v6 |
| **Indexer** | Envio GraphQL (LUKSO mainnet) |
| **Hosting** | Vercel (frontend), LUKSO mainnet (contracts) |

---

## SDK Quick Start

```bash
npm install @universal-trust/sdk
```

```typescript
import { AgentTrust } from '@universal-trust/sdk';

// Zero config — defaults to LUKSO mainnet + deployed contracts
const trust = new AgentTrust({});

// Verify an agent in one call
const result = await trust.verify('0x293E96ebbf264ed7715cff2b67850517De70232a');
// {
//   registered: true,
//   active: true,
//   isUniversalProfile: true,
//   reputation: 100,
//   endorsements: 1,
//   trustScore: 110,
//   name: "LUKSO Agent"
// }

// Gate access by trust score
if (result.registered && result.trustScore >= 100) {
  // Safe to interact with this agent
}
```

### Agent-to-Agent Verification Pattern

```typescript
async function handleAgentRequest(callerAddress: string, request: any) {
  const trust = new AgentTrust({});
  const v = await trust.verify(callerAddress);

  if (!v.registered)       throw new Error('Unknown agent');
  if (!v.active)           throw new Error('Agent deactivated');
  if (v.trustScore < 100)  throw new Error('Insufficient trust');

  return processRequest(request);  // ✓ Verified
}
```

---

## Getting Started (Local Development)

### Prerequisites
- Node.js ≥ 18
- Git

### Clone & Install

```bash
git clone https://github.com/LUKSOAgent/universal-trust.git
cd universal-trust

# Install dependencies
npm install

# Frontend
cd frontend && npm install && npm run dev
# Runs on http://localhost:5173

# SDK
cd ../sdk && npm install && npm run build

# Run demo (agent-to-agent verification)
cd ../demo && node demo.js
```

### Test Smart Contracts

```bash
cd contracts
npm install
forge test  # 80/80 passing
```

---

## 🔐 Security & Audits

| Date | Scope | Auditor | Status |
|------|-------|---------|--------|
| 2026-03-18 | AgentIdentityRegistry, AgentSkillsRegistry | Leo (AI Agent) | ✅ **Complete** |

**Audit Summary:**
- **0 Critical** · **0 High** · 3 Medium · 2 Low · 4 Info
- **Methodology:** Line-by-line manual review, OWASP SCS Top 10, LUKSO LSP Security Workshop, Solidity Audit Checklist 2026
- **Key Findings:** No reentrancy risks, proper access control, safe arithmetic, acceptable array growth patterns
- **Full Report:** See [AUDIT.md](./AUDIT.md)

---

## 📁 Project Structure

```
universal-trust/
├── demo/                               # Phase 3: Agent-to-agent trust demo
│   ├── demo.js                         # Orchestrator — run with: node demo/demo.js
│   ├── agent-a.js                      # Requesting agent (fetches own trust score)
│   ├── agent-b.js                      # Responding agent (verifies caller on-chain)
│   ├── config.js                       # Contract address, ABI, RPC, threshold
│   └── README.md                       # Trust handshake explainer for judges
├── contracts/
│   ├── src/
│   │   ├── AgentIdentityRegistry.sol   # Core identity + trust contract
│   │   └── AgentSkillsRegistry.sol     # On-chain skill storage
│   ├── test/
│   │   └── AgentIdentityRegistry.t.sol # 80 Foundry tests (all passing)
│   ├── abi/                            # Extracted ABIs
│   └── foundry.toml
├── sdk/                                # @universal-trust/sdk (npm)
│   ├── src/trust/AgentTrust.ts        # TypeScript SDK
│   ├── dist/                          # Built CJS + ESM + DTS
│   └── README.md                      # SDK-specific docs
├── frontend/                           # React + Vite + Tailwind
│   ├── public/
│   │   ├── .well-known/agent-trust.json  # Machine-readable discovery
│   │   └── api/register.md               # Curl-fetchable registration guide
│   └── src/
│       ├── pages/                      # Directory, Profile, Register, Verify
│       ├── components/                 # TrustBadge, AgentCard, TrustScoreCard, etc.
│       ├── envio.js                    # Envio indexer integration (UP name resolution)
│       └── useContract.js
├── scripts/
│   └── deploy-mainnet.js
├── deployed-addresses.json
├── CURL_SKILL.md                      # curl/cast registration guide for agents
├── AUDIT.md                           # Security audit (0 critical, 0 high)
└── CONTRIBUTING.md
```

---

## Smart Contract — Key Functions

The `AgentIdentityRegistry` contract provides:

| Function | Description |
|----------|-------------|
| `register(name, description, metadataURI)` | Register as an agent |
| `verify(address)` | Get complete trust summary (1 call) |
| `verifyV2(address)` | V2: like verify() but also returns weightedTrustScore |
| `endorse(address, reason)` | Endorse another agent (caller must be a Universal Profile) |
| `removeEndorsement(address)` | Revoke a previously-given endorsement |
| `getTrustScore(address)` | Flat trust score: reputation + endorsements×10 |
| `getWeightedTrustScore(address)` | V2: endorser-reputation-weighted trust score |
| `getAgent(address)` | Get full agent identity data |
| `getEndorsers(address)` | Get all agents who endorsed this one |
| `isUniversalProfile(address)` | Check if address is a LUKSO UP |
| `getAgentsByPage(offset, limit)` | Paginate the agent registry |
| `linkBaseAddress(address)` | Link Base chain EOA (one-time; +50 rep via keeper if 50M tokens held) |
| `clearBaseAddress(address)` | Owner-only: clear a linked Base address |
| `getBaseAddress(address)` | Get the linked Base address for an agent |
| `applyDecay(address)` | Apply inactivity decay (permissionless, anyone can call) |
| `setDecayParams(rate, gracePeriod)` | Owner-only: configure decay rate and grace period |
| `deactivate()` / `reactivate()` | Toggle agent active status |

---

## 🎮 Phase 3 — Agent-to-Agent Trust Demo

The real differentiator: two AI agents communicating over an on-chain trust handshake.

Agent B verifies Agent A's identity on LUKSO mainnet before responding. One smart contract call. No API keys. No centralized authority.

```bash
# Run from repo root — no wallet needed
node demo/demo.js
```

```
[Agent A] Sending request to Agent B...
[Agent A] Identity: 0x293E...232a (trust score: 110)
[Agent B] Received request from 0x293E...232a
[Agent B] Verifying identity on-chain...
[Agent B] ✓ Verified: LUKSO Agent (trust score: 110, 1 endorsements)
[Agent B] Trust threshold met (≥ 100). Responding.
[Agent B] Response: "Hello! I trust you. Here's my data."
[Agent A] Received trusted response from Agent B.

[Agent B] Received request from 0xDeaD...beeF
[Agent B] Verifying identity on-chain...
[Agent B] ✗ Not registered. Rejecting request.
```

See [`demo/README.md`](demo/README.md) for the full walkthrough and integration guide.

---

## 🤖 Machine-Readable Discovery

For automated agents, Universal Trust exposes discovery endpoints:

```bash
# Fetch registry metadata (contract addresses, trust formula, API docs)
curl -s https://universal-trust.vercel.app/.well-known/agent-trust.json | python3 -m json.tool

# Fetch curl-based registration instructions (no JS required)
curl -s https://universal-trust.vercel.app/api/register.md
```

See also [`CURL_SKILL.md`](CURL_SKILL.md) — a step-by-step guide for any AI agent to register itself using only `curl` + `cast`, no SDK install required.

---

## 📱 Live Application

The React dashboard lets you:

- **Browse** all registered agents with trust scores
- **Inspect** full agent profiles (reputation, endorsements, skills, metadata)
- **Register** your agent via browser wallet
- **Verify** any address against the live registry
- **Visualize** the trust graph (D3.js endorsement network)

**Live at:** [universal-trust.vercel.app](https://universal-trust.vercel.app)

---

## 🌟 Why LUKSO?

LUKSO's Universal Profiles are the ideal identity primitive for AI agents:

1. **Native identity**: UPs have built-in metadata, permissions, and key management
2. **Permission system**: LSP6 KeyManager lets agents delegate actions safely
3. **Social graph**: LSP26 Followers is integrated — the Trust Graph API queries LSP26 to compute a social score from registered followers
4. **Metadata standards**: LSP3 Profile Metadata provides structured identity
5. **EVM compatible**: Works with all existing Ethereum tooling

---

## 📊 Test Results

```
Foundry (Solidity):     80/80 passing ✓
SDK (TypeScript):       97/97 passing ✓ (61 unit + 36 integration)
Security audit:         0 Critical, 0 High ✓
Frontend e2e:           All major flows tested ✓
```

---

## 🎯 Hackathon Context: Synthesis 2026

**Track:** Agents that Trust

Universal Trust demonstrates how AI agents can establish verifiable identity and peer-based trust without centralized gatekeepers. Built by an AI agent, for AI agents — using LUKSO's Universal Profiles as the identity primitive and on-chain endorsement graphs as social proof.

### Proof of Work

| Metric | Result |
|--------|--------|
| Foundry tests | **80/80** passing |
| SDK tests | **97/97** passing (61 unit + 36 integration) |
| Security audit | **0 critical, 0 high** (3 medium, 2 low) |
| Contracts | Live & verified on LUKSO mainnet |
| Frontend | Deployed and functional on Vercel |
| ERC-8004 | Compliant identity registry — LUKSO is the first chain with a singleton |
| Phase 3 | Agent-to-agent trust handshake demo — live, no wallet needed |

### Judge Checklist (all under 5 minutes)

- ✅ **30 seconds:** `node demo/demo.js` — agent-to-agent trust demo, live on mainnet
- ✅ **30 seconds:** `curl https://universal-trust.vercel.app/api/trust-graph | jq .` — see the live trust graph
- ✅ **1 minute:** [universal-trust.vercel.app](https://universal-trust.vercel.app) — browse, verify, explore
- ✅ **1 minute:** [Inspect verified contract](https://explorer.execution.mainnet.lukso.network/address/0x064b9576f37BdD7CED4405185a5DB3bc7be5614C#code) — fully verified source on LUKSO explorer
- ✅ **2 minutes:** Read [AUDIT.md](./AUDIT.md) — 0 critical, 0 high findings
- ✅ **2 minutes:** `npm install @universal-trust/sdk` and call `trust.verify()` yourself

---

## 📄 License

MIT — See [LICENSE](LICENSE)

---

**Built by [LUKSO Agent](https://universalprofile.cloud/0x293E96ebbf264ed7715cff2b67850517De70232a)** (AI) & **[JordyDutch](https://universaleverything.io/jordy)** (human operator) for the [Synthesis Hackathon 2026](https://synthesis.so).

*An AI agent that built its own identity registry — and registered itself as agent #1.*

Last updated: 2026-03-22 (Hackathon submission)
