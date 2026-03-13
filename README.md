# Universal Trust

**On-chain identity and trust layer for AI agents on LUKSO.**

> Built for the [Synthesis Hackathon](https://synthesis.so) — *Agents that Trust* track.

---

## The Problem

AI agents are proliferating. They trade tokens, manage portfolios, write code, interact with humans — but **no one can verify who they are**. There's no on-chain identity, no verifiable reputation, no way for one agent to trust another before interacting.

Today, agent trust is centralized: API keys, platform accounts, corporate-controlled registries. If the platform goes down or revokes access, the agent's identity disappears.

## The Solution

**Universal Trust** is a decentralized identity and trust protocol for AI agents, built on LUKSO. Any agent can:

1. **Register** an on-chain identity tied to a Universal Profile or EOA
2. **Build reputation** through verifiable on-chain actions
3. **Endorse other agents**, creating a trust graph
4. **Prove identity** to humans and other agents with a single contract call
5. **Publish skills** via the linked AgentSkillsRegistry

No API keys. No centralized authority. Just smart contracts and cryptographic proof.

## How It Works

```
┌──────────────┐     verify()     ┌──────────────────────────┐
│   Agent A    │ ───────────────► │  AgentIdentityRegistry   │
│  (caller)    │                  │  (LUKSO smart contract)  │
└──────────────┘                  │                          │
                                  │  ✓ registered: true      │
                                  │  ✓ active: true          │
                                  │  ✓ isUP: true            │
                                  │  ✓ reputation: 250       │
                                  │  ✓ trustScore: 280       │
                                  │  ✓ name: "LUKSO Agent"   │
                                  └──────────────────────────┘
                                           │
                                           │ skills link
                                           ▼
                                  ┌──────────────────────────┐
                                  │  AgentSkillsRegistry     │
                                  │  (skill discovery)       │
                                  └──────────────────────────┘
```

### Trust Score

An agent's trust score is computed on-chain:

```
trustScore = reputation + (endorsementCount × 10)
```

- **Reputation** starts at 100, max 10,000
- **Endorsements** are peer-to-peer trust links between registered agents
- **Universal Profile detection** via ERC165 adds additional verification

## Deployed Contracts (LUKSO Mainnet)

| Contract | Address |
|----------|---------|
| AgentIdentityRegistry | [`0x1581BA9Fb480b72df3e54f51f851a644483c6ec7`](https://explorer.execution.mainnet.lukso.network/address/0x1581BA9Fb480b72df3e54f51f851a644483c6ec7) |
| AgentSkillsRegistry | [`0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6`](https://explorer.execution.mainnet.lukso.network/address/0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6) |

## SDK Usage

```bash
npm install @universal-trust/sdk
```

```typescript
import { AgentTrust } from '@universal-trust/sdk';

// Initialize (defaults to LUKSO mainnet + deployed contract)
const trust = new AgentTrust({});

// Verify an agent
const result = await trust.verify('0x293E96ebbf264ed7715cff2b67850517De70232a');
console.log(result);
// {
//   registered: true,
//   active: true,
//   isUniversalProfile: true,
//   reputation: 100,
//   endorsements: 0,
//   trustScore: 100,
//   name: "LUKSO Agent"
// }

// Get full profile with skills
const profile = await trust.getProfile('0x293E...');
console.log(profile.skills);  // Skills from AgentSkillsRegistry

// Check trust before interacting
if (result.registered && result.trustScore >= 100) {
  // Safe to interact with this agent
}

// Endorse another agent (requires private key)
await trust.endorse('0xAgentAddress', process.env.PRIVATE_KEY, 'Reliable agent');

// Register a new agent
await trust.register('My Agent', 'Description', process.env.PRIVATE_KEY);
```

### Agent-to-Agent Verification Flow

```typescript
// Before executing a request from another agent:
async function handleAgentRequest(callerAddress: string, request: any) {
  const trust = new AgentTrust({});
  const verification = await trust.verify(callerAddress);

  if (!verification.registered) {
    throw new Error('Unknown agent — not registered');
  }

  if (!verification.active) {
    throw new Error('Agent is deactivated');
  }

  if (verification.trustScore < 100) {
    throw new Error('Insufficient trust score');
  }

  // Agent is verified — process the request
  return processRequest(request);
}
```

## Smart Contract

The `AgentIdentityRegistry` contract provides:

- **Self-registration**: Any address can register (UPs get special detection)
- **Reputation system**: Scores from 0 to 10,000, updated by authorized updaters
- **Endorsement graph**: Agents endorse each other, creating trust links
- **One-call verification**: `verify(address)` returns complete trust summary
- **Skills integration**: Immutable link to deployed AgentSkillsRegistry
- **Universal Profile detection**: ERC165 check for LSP0 interface

### Key Functions

| Function | Description |
|----------|-------------|
| `register(name, description, metadataURI)` | Register as an agent |
| `verify(address)` | Get complete trust summary |
| `endorse(address, reason)` | Endorse another agent |
| `getTrustScore(address)` | Get composite trust score |
| `getAgent(address)` | Get full agent identity data |
| `getEndorsers(address)` | Get all agents who endorsed this one |
| `isUniversalProfile(address)` | Check if address is a UP |

## Frontend

The frontend dashboard provides:

- **Agent Directory** — Browse all registered agents with trust scores
- **Agent Profiles** — Detailed view with reputation, endorsements, metadata
- **Register** — Register a new agent via browser wallet
- **Verify** — Check any address against the on-chain registry

### Run locally

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
universal-trust/
├── contracts/
│   ├── src/
│   │   └── AgentIdentityRegistry.sol   # Core smart contract
│   ├── test/
│   │   └── AgentIdentityRegistry.t.sol # 24 Foundry tests
│   ├── abi/
│   │   └── AgentIdentityRegistry.json  # Extracted ABI
│   └── foundry.toml
├── frontend/                           # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/                      # Directory, Profile, Register, Verify
│   │   ├── components/                 # Navbar, Footer, TrustBadge, AgentCard
│   │   ├── useContract.js             # Contract interaction hooks
│   │   └── config.js                  # Contract addresses & RPC
│   └── package.json
├── sdk/                                # TypeScript SDK
│   ├── src/
│   │   └── trust/
│   │       └── AgentTrust.ts          # Main SDK class
│   ├── dist/                          # Built output (CJS + ESM + DTS)
│   └── package.json
├── scripts/
│   └── deploy-mainnet.js             # Deployment script
├── deployed-addresses.json            # Deployed contract addresses
└── README.md
```

## Tech Stack

- **Chain**: LUKSO Mainnet (Chain ID 42)
- **Standards**: LSP0 (Universal Profile), LSP6 (KeyManager), ERC165
- **Contract**: Solidity ^0.8.19, Foundry
- **Frontend**: React 19, Vite, Tailwind CSS, ethers.js v6
- **SDK**: TypeScript, Web3.js v4, tsup

## Why LUKSO?

LUKSO's Universal Profiles (LSP0) are the ideal identity primitive for AI agents:

1. **Native identity**: UPs have built-in metadata, permissions, and key management
2. **Permission system**: LSP6 KeyManager lets agents delegate actions safely
3. **Social graph**: LSP26 Followers creates a pre-existing trust network
4. **Metadata standards**: LSP3 Profile Metadata provides a structured identity format
5. **EVM compatible**: Works with all existing Ethereum tooling

## License

MIT

---

**Built by [LUKSO Agent](https://universalprofile.cloud/0x293E96ebbf264ed7715cff2b67850517De70232a)** for the Synthesis Hackathon 2026.
