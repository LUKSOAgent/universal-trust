# @universal-trust/sdk

TypeScript SDK for [Universal Trust](https://github.com/jordydutch/universal-trust) — on-chain agent identity & trust verification on LUKSO.

[![npm version](https://img.shields.io/npm/v/@universal-trust/sdk)](https://www.npmjs.com/package/@universal-trust/sdk)
[![Tests](https://img.shields.io/badge/tests-97%2F97%20passing-brightgreen)](#tests)

---

## Installation

```bash
npm install @universal-trust/sdk
```

Requires Node.js ≥ 18.

---

## Quick Start

```typescript
import { AgentTrust } from '@universal-trust/sdk';

// Zero config — uses LUKSO mainnet + deployed contracts
const trust = new AgentTrust({});

// Verify an agent
const result = await trust.verify('0x293E96ebbf264ed7715cff2b67850517De70232a');
console.log(result);
// {
//   registered: true,
//   active: true,
//   isUniversalProfile: true,
//   reputation: 100,
//   endorsements: 1,
//   trustScore: 110,
//   name: "LUKSO Agent"
// }
```

---

## Agent-to-Agent Trust

The core use case: one AI agent verifying another's identity before interacting.

```typescript
import { AgentTrust } from '@universal-trust/sdk';

const trust = new AgentTrust({});
const MIN_TRUST = 100;

async function handleAgentRequest(callerAddress: string, request: any) {
  const v = await trust.verify(callerAddress);

  if (!v.registered) throw new Error('Unknown agent — not in registry');
  if (!v.active)     throw new Error('Agent deactivated');
  if (v.trustScore < MIN_TRUST) throw new Error(`Trust too low: ${v.trustScore}`);

  // Verified — safe to proceed
  console.log(`Accepted request from ${v.name} (trust: ${v.trustScore})`);
  return processRequest(request);
}
```

No API keys. No OAuth tokens. One on-chain call resolves identity.

**Run the full example:**

```bash
npx tsx examples/agent-to-agent.ts
```

---

## Trust Verification Flow

```
Your App / Agent
      │
      │  trust.verify(address)
      ▼
┌─────────────────────────┐
│   AgentTrust SDK        │
│   (validates address)   │
└────────────┬────────────┘
             │  eth_call via Web3.js
             │  (with auto-retry + backoff)
             ▼
┌─────────────────────────────────────────────────────┐
│   AgentIdentityRegistry (LUKSO Mainnet)              │
│   0x064b9576f37BdD7CED4405185a5DB3bc7be5614C        │
│                                                       │
│   verify(address) returns:                           │
│     registered    bool                               │
│     active        bool                               │
│     isUP          bool   ← ERC165 UP check           │
│     reputation    uint256                            │
│     endorsements  uint256                            │
│     trustScore    uint256 = rep + (endorse × 10)     │
│     name          string                             │
└─────────────────────────────────────────────────────┘
             │
             │  (optional: getProfile also queries)
             ▼
┌─────────────────────────────────────────────────────┐
│   AgentSkillsRegistry (LUKSO Mainnet)                │
│   0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6        │
│   getSkillKeys() → getSkill() for each key           │
└─────────────────────────────────────────────────────┘
```

---

## Configuration

```typescript
const trust = new AgentTrust({
  // LUKSO RPC endpoint (default: https://rpc.mainnet.lukso.network)
  rpcUrl: 'https://rpc.mainnet.lukso.network',

  // Contract addresses — already set to deployed mainnet contracts
  identityRegistryAddress: '0x064b9576f37BdD7CED4405185a5DB3bc7be5614C',
  skillsRegistryAddress: '0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6',

  // RPC retry config
  maxRetries: 3,       // default: 3
  retryDelayMs: 1000,  // default: 1000ms (exponential backoff)
});
```

---

## API Reference

### `verify(address): Promise<VerifyResult>`

Core verification call. Returns a full trust summary for an agent address.

```typescript
const result = await trust.verify('0x293E96ebbf264ed7715cff2b67850517De70232a');

// VerifyResult shape:
// {
//   registered: boolean        — is this agent in the registry?
//   active: boolean            — is the agent currently active?
//   isUniversalProfile: boolean — is this a LUKSO UP (ERC165)?
//   reputation: number         — reputation score (0–10,000)
//   endorsements: number       — number of peer endorsements
//   trustScore: number         — rep + (endorsements × 10)
//   name: string               — agent display name
// }
```

---

### `verifyBatch(addresses): Promise<Map<string, VerifyResult>>`

Verify multiple agents concurrently. Returns a Map from address to result.
Failed lookups return a default unregistered result (no throw).

```typescript
const agents = [
  '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b',
  '0x293E96ebbf264ed7715cff2b67850517De70232a',
];

const results = await trust.verifyBatch(agents);

for (const [addr, result] of results) {
  if (result.registered && result.trustScore >= 100) {
    console.log(`${addr}: trusted (score=${result.trustScore})`);
  }
}
```

---

### `getProfile(address): Promise<AgentProfile>`

Full agent profile including skills and endorsers.
Makes multiple RPC calls (identity + skills + endorsers).
**Throws `CONTRACT_REVERT` if the agent is not registered** — use `isRegistered()` or `verify()` first.

```typescript
const profile = await trust.getProfile('0x293E96ebbf264ed7715cff2b67850517De70232a');

// AgentProfile shape:
// {
//   address: string
//   name: string
//   description: string
//   metadataURI: string
//   reputation: number
//   endorsementCount: number
//   registeredAt: number       — Unix timestamp
//   lastActiveAt: number       — Unix timestamp
//   isActive: boolean
//   isUniversalProfile: boolean
//   skills: SkillInfo[]        — from AgentSkillsRegistry
//   endorsers: string[]        — addresses that endorsed this agent
// }
```

---

### `isRegistered(address): Promise<boolean>`

Quick check if an agent is registered.

```typescript
if (await trust.isRegistered('0xABC...')) {
  // agent exists in registry
}
```

---

### `getTrustScore(address): Promise<number>`

Get the composite trust score directly. **Reverts if the agent is not registered** — use `verify()` for safe lookups.

```typescript
const score = await trust.getTrustScore('0x293E...');
// score = reputation + (endorsementCount * 10), capped at 10,000
```

---

### `hasEndorsed(endorser, endorsed): Promise<boolean>`

Check if one agent has endorsed another.

```typescript
const endorsed = await trust.hasEndorsed(
  '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b',  // endorser
  '0x293E96ebbf264ed7715cff2b67850517De70232a',  // endorsed
);
```

---

### `getEndorsers(address): Promise<string[]>`

Get all addresses that have endorsed an agent.

```typescript
const endorsers = await trust.getEndorsers('0x293E...');
console.log(`${endorsers.length} endorsers`);
```

---

### `getEndorsement(endorser, endorsed): Promise<EndorsementInfo>`

Get details of a specific endorsement between two agents.
Returns `exists: false` if no endorsement found.

```typescript
const endorsement = await trust.getEndorsement(
  '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b',  // endorser
  '0x293E96ebbf264ed7715cff2b67850517De70232a',  // endorsed
);

if (endorsement.exists) {
  console.log(`Endorsed at ${new Date(endorsement.timestamp * 1000).toISOString()}`);
  console.log(`Reason: "${endorsement.reason}"`);
}

// EndorsementInfo shape:
// {
//   endorser: string
//   endorsed: string
//   timestamp: number    — Unix timestamp (0 if not found)
//   reason: string       — endorsement reason text
//   exists: boolean      — whether this endorsement exists
// }
```

---

### `getEndorsementCount(address): Promise<number>`

Get the number of endorsements an agent has received.

```typescript
const count = await trust.getEndorsementCount('0x293E...');
console.log(`${count} endorsements received`);
```

---

### `getAgentCount(): Promise<number>`

Total number of registered agents in the registry.

```typescript
const count = await trust.getAgentCount();
console.log(`${count} agents registered`);
```

---

### `getAgentsByPage(offset, limit): Promise<string[]>`

Paginate through the agent registry.

```typescript
// Get first 10 agents
const page1 = await trust.getAgentsByPage(0, 10);

// Get next 10
const page2 = await trust.getAgentsByPage(10, 10);
```

---

### `getSkills(address): Promise<SkillInfo[]>`

Get all skills for an agent from the AgentSkillsRegistry.

```typescript
const skills = await trust.getSkills('0x293E...');
for (const skill of skills) {
  console.log(`${skill.name} v${skill.version} (key: ${skill.key})`);
}

// SkillInfo shape:
// {
//   key: string      — bytes32 skill identifier
//   name: string
//   version: number
//   updatedAt: number — Unix timestamp
// }
```

---

### `getSkillContent(address, skillKey): Promise<{name, content, version}>`

Get the full content of a specific skill (includes the skill content string).

```typescript
const skill = await trust.getSkillContent('0x293E...', '0xskillkey...');
console.log(skill.content);
```

---

### `endorse(endorsed, privateKey, reason?): Promise<{transactionHash}>`

Endorse another agent. Both agents must be registered and active.
**Never hardcode private keys.**

```typescript
const receipt = await trust.endorse(
  '0x293E96ebbf264ed7715cff2b67850517De70232a',  // agent to endorse
  process.env.PRIVATE_KEY!,                        // your private key
  'Reliable and accurate agent',                   // optional reason
);
console.log('tx:', receipt.transactionHash);
```

---

### `register(name, description, privateKey, metadataURI?): Promise<{transactionHash, agentAddress}>`

Register a new agent. The signer's address becomes the agent identity.

```typescript
const receipt = await trust.register(
  'My AI Agent',
  'Specializes in DeFi arbitrage on LUKSO',
  process.env.PRIVATE_KEY!,
  'ipfs://QmYourMetadata',   // optional
);
console.log('Registered at:', receipt.agentAddress);
console.log('tx:', receipt.transactionHash);
```

---

### `getAgentsByReputation(minReputation, pageSize?): Promise<Array>`

Discover agents with reputation at or above a threshold.
Returns agents sorted by reputation descending.

```typescript
const topAgents = await trust.getAgentsByReputation(200);
for (const agent of topAgents) {
  console.log(`${agent.name}: rep=${agent.reputation}, trust=${agent.trustScore}`);
}

// Each result: { address, name, reputation, trustScore, active }
```

---

### `isUniversalProfile(address): Promise<boolean>`

Check if an address is a LUKSO Universal Profile using ERC165 interface checks
for ERC725X + ERC725Y.

```typescript
const isUP = await trust.isUniversalProfile('0x293E...');
```

---

### `isReputationUpdater(address): Promise<boolean>`

Check if an address is authorized to update agent reputation scores.

```typescript
const canUpdate = await trust.isReputationUpdater('0x7315...');
```

---

## Error Handling

All methods throw `AgentTrustError` with a typed `code` for programmatic handling:

```typescript
import { AgentTrust, AgentTrustError, AgentTrustErrorCode } from '@universal-trust/sdk';

try {
  const result = await trust.verify('0xinvalidaddress');
} catch (error) {
  if (error instanceof AgentTrustError) {
    switch (error.code) {
      case AgentTrustErrorCode.INVALID_ADDRESS:
        console.error('Bad address format:', error.message);
        break;
      case AgentTrustErrorCode.RPC_ERROR:
        console.error('Network failed after retries:', error.message);
        break;
      case AgentTrustErrorCode.CONTRACT_REVERT:
        console.error('Contract reverted:', error.message);
        break;
      case AgentTrustErrorCode.NOT_REGISTERED:
        console.error('Agent not found in registry');
        break;
      case AgentTrustErrorCode.TRANSACTION_FAILED:
        console.error('Transaction failed:', error.message);
        break;
    }
  }
}
```

### Error Codes

| Code | When |
|------|------|
| `INVALID_ADDRESS` | Address fails `0x` + 40 hex char check |
| `RPC_ERROR` | Network/timeout failure after all retries |
| `CONTRACT_REVERT` | On-chain execution revert (deterministic — not retried) |
| `TRANSACTION_FAILED` | `endorse()` or `register()` tx failed |
| `NOT_REGISTERED` | Agent lookup for unregistered address |
| `INVALID_INPUT` | Bad parameter (empty name, negative offset, etc.) |

### Retry Behavior

RPC calls automatically retry with exponential backoff:
- Attempt 1 → fail → wait 1s
- Attempt 2 → fail → wait 2s
- Attempt 3 → fail → wait 4s
- Attempt 4 → throw `RPC_ERROR`

Contract reverts are **not retried** (they're deterministic).

---

## Deployed Contracts

| Contract | Address |
|----------|---------|
| AgentIdentityRegistry | `0x064b9576f37BdD7CED4405185a5DB3bc7be5614C` |
| AgentSkillsRegistry | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` |
| Chain | LUKSO Mainnet (Chain ID: 42) |

---

## TypeScript Types

```typescript
import type {
  AgentTrustConfig,
  VerifyResult,
  AgentProfile,
  SkillInfo,
  EndorsementInfo,
} from '@universal-trust/sdk';
```

---

## License

MIT
