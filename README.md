# Universal Trust

> **Hackathon Track:** Synthesis 2026 — *Agents that Trust*

**On-chain identity and trust layer for AI agents on LUKSO.**

No API keys. No centralized authority. Just smart contracts and cryptographic proof.

---

## Why This Matters

AI agents are everywhere. They trade tokens, manage portfolios, write code, execute contracts, and interact with other agents — often autonomously.

**The problem: there's no way to know if an agent is trustworthy.**

- An agent requests a $50k token swap from your wallet. Is it legitimate?
- Two AI systems want to collaborate on a task. How do they verify each other?
- A DeFi protocol wants to allow agent access. How does it screen out bad actors?

Today, agent trust is centralized: API keys, platform accounts, corporate-controlled registries. If the platform goes down or revokes access, the agent's identity disappears.

**Universal Trust solves this with on-chain, permissionless identity:**

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

Real use cases enabled today:
- **Agent-gated DeFi**: Only allow agents with trustScore ≥ 200 to call your vault
- **Collaboration networks**: Two agents verify each other before sharing sensitive data
- **Reputation staking**: Agents risk their on-chain reputation when making claims
- **Wallet access control**: LSP6 KeyManager + trust score = fine-grained agent permissions

---

## Architecture

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
  │  │   0x1581BA9Fb480b72...      │  │   0x64B3AeCE25B73...     │  │
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
  │  │   Universal Profiles        │                                   │
  │  │   (LSP0 + LSP3 + LSP6)     │                                   │
  │  │   native LUKSO identity     │                                   │
  │  └─────────────────────────────┘                                  │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Trust Score Formula

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│   trustScore = reputation + (endorsementCount × 10)  │
│                                                       │
│   reputation:     starts at 100, range 0–10,000      │
│   endorsements:   each peer endorsement adds +10      │
│   Universal Profile: ERC165 check, no score bonus     │
│                                                       │
└─────────────────────────────────────────────────────┘
```

Example: An agent with `reputation=200` endorsed by 8 peers has `trustScore = 200 + 80 = 280`.

---

## Live Demo — Deployed on LUKSO Mainnet

| Contract | Address | Explorer |
|----------|---------|----------|
| AgentIdentityRegistry | `0x1581BA9Fb480b72df3e54f51f851a644483c6ec7` | [View ✓ Verified →](https://explorer.execution.mainnet.lukso.network/address/0x1581BA9Fb480b72df3e54f51f851a644483c6ec7) |
| AgentSkillsRegistry | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` | [View →](https://explorer.execution.mainnet.lukso.network/address/0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6) |

### Try it now (no wallet needed):

```bash
npm install @universal-trust/sdk

node -e "
const { AgentTrust } = require('@universal-trust/sdk');
const t = new AgentTrust({});
t.getAgentCount().then(n => console.log('Registered agents:', n));
t.verify('0x293E96ebbf264ed7715cff2b67850517De70232a').then(v => console.log(v));
"
```

---

## Registered Agents (Live on Mainnet)

| Agent | Address | Type | Trust Score |
|-------|---------|------|-------------|
| Deployer EOA | [`0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b`](https://explorer.execution.mainnet.lukso.network/address/0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b) | EOA | 100 |
| LUKSO UP Agent | [`0x293E96ebbf264ed7715cff2b67850517De70232a`](https://universalprofile.cloud/0x293E96ebbf264ed7715cff2b67850517De70232a) | Universal Profile | 110 |

Both agents are verified live on-chain. The UP agent has been endorsed once (trustScore = 100 + 10 = 110).

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

## Smart Contract

The `AgentIdentityRegistry` contract:

- **Self-registration**: Any address can register (UPs get ERC165 detection)
- **Reputation system**: Scores 0–10,000, updated by authorized updaters
- **Endorsement graph**: Peer-to-peer trust links between registered agents
- **One-call verification**: `verify(address)` returns complete trust summary
- **Skills integration**: Immutable link to deployed AgentSkillsRegistry

### Key Functions

| Function | Description |
|----------|-------------|
| `register(name, description, metadataURI)` | Register as an agent |
| `verify(address)` | Get complete trust summary (1 call) |
| `endorse(address, reason)` | Endorse another registered agent |
| `getTrustScore(address)` | Get composite trust score |
| `getAgent(address)` | Get full agent identity data |
| `getEndorsers(address)` | Get all agents who endorsed this one |
| `isUniversalProfile(address)` | Check if address is a LUKSO UP |
| `getAgentsByPage(offset, limit)` | Paginate the agent registry |

---

## Phase 3 — Agent-to-Agent Trust Demo

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

## Machine-Readable Discovery

For automated agents, Universal Trust exposes a `.well-known` discovery endpoint:

```bash
# Fetch registry metadata (contract addresses, trust formula, API docs)
curl -s https://universal-trust.vercel.app/.well-known/agent-trust.json | python3 -m json.tool

# Fetch curl-based registration instructions (no JS required)
curl -s https://universal-trust.vercel.app/api/register.md
```

See also [`CURL_SKILL.md`](CURL_SKILL.md) — a step-by-step guide for any AI agent to register itself using only `curl` + `cast`, no SDK install required.

---

## Frontend

The React dashboard lets you:

- **Browse** all registered agents with trust scores
- **Inspect** full agent profiles (reputation, endorsements, skills, metadata)
- **Register** your agent via browser wallet
- **Verify** any address against the live registry

```bash
cd frontend && npm install && npm run dev
```

---

## Project Structure

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
├── AUDIT.md                           # Security audit (no issues found)
└── CONTRIBUTING.md
```

---

## Tests

```
Foundry (Solidity):  80/80 passing
SDK (TypeScript):    97/97 passing (61 unit + 36 integration)
Security audit:      No issues found (see AUDIT.md)
```

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Chain | LUKSO Mainnet (Chain ID 42) |
| Standards | LSP0 (Universal Profile), LSP6 (KeyManager), ERC165 |
| Contracts | Solidity ^0.8.19, Foundry |
| SDK | TypeScript, Web3.js v4, tsup |
| Frontend | React 19, Vite, Tailwind CSS, ethers.js v6 |

---

## Why LUKSO?

LUKSO's Universal Profiles are the ideal identity primitive for AI agents:

1. **Native identity**: UPs have built-in metadata, permissions, and key management
2. **Permission system**: LSP6 KeyManager lets agents delegate actions safely
3. **Social graph**: LSP26 Followers creates a pre-existing trust network
4. **Metadata standards**: LSP3 Profile Metadata provides structured identity
5. **EVM compatible**: Works with all existing Ethereum tooling

---

## License

MIT

---

**Built by [LUKSO Agent](https://universalprofile.cloud/0x293E96ebbf264ed7715cff2b67850517De70232a)** for the [Synthesis Hackathon 2026](https://synthesis.so).
