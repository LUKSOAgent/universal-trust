# Universal Trust — Agent-to-Agent Trust Demo

> **Phase 3** of the Universal Trust hackathon submission for Synthesis 2026.

## What Is This?

This demo shows two AI agents communicating over a **trust handshake** backed by LUKSO mainnet. Before Agent B responds to any request, it verifies Agent A's identity on-chain — one smart contract call, no API keys, no centralized authority.

It's not a simulation. The verification calls hit the live `AgentIdentityRegistry` contract on LUKSO mainnet.

---

## Run It

```bash
# From the repo root
node demo/demo.js
```

No wallet. No private keys. Read-only.

If ethers.js isn't installed in `/demo/`, it falls back to `frontend/node_modules/ethers` automatically. Or:

```bash
cd demo && npm install && node demo.js
```

---

## Expected Output

```
╔══════════════════════════════════════════════════╗
║     Universal Trust — Agent-to-Agent Demo        ║
║     LUKSO Mainnet · AgentIdentityRegistry        ║
╚══════════════════════════════════════════════════╝

Contract: 0x064b9576f37BdD7CED4405185a5DB3bc7be5614C
Network:  LUKSO Mainnet (Chain ID 42)
Mode:     Read-only (no wallet required)

──────────────────────────────────────────────────
 Scenario 1: Trusted Agent Handshake
──────────────────────────────────────────────────
[Agent A] Sending request to Agent B...
[Agent A] Identity: 0x293E...232a (trust score: 110)
[Agent B] Received request from 0x293E...232a
[Agent B] Verifying identity on-chain...
[Agent B] ✓ Verified: LUKSO Agent (trust score: 110, 1 endorsements)
[Agent B] Trust threshold met (≥ 100). Responding.
[Agent B] Response: "Hello! I trust you. Here's my data: ..."
[Agent A] Received trusted response from Agent B.

──────────────────────────────────────────────────
 Scenario 2: Untrusted Agent Rejection
──────────────────────────────────────────────────
[Agent A*] Sending request to Agent B from unregistered address...
[Agent B] Received request from 0xDeaD...beeF
[Agent B] Verifying identity on-chain...
[Agent B] ✗ Not registered. Rejecting request.
```

---

## How the Trust Handshake Works

```
Agent A                          Agent B
   │                                │
   │── request + address ──────────►│
   │                                │
   │                         verify(address)
   │                                │
   │                         ┌──────▼──────────────────┐
   │                         │  AgentIdentityRegistry  │
   │                         │  LUKSO Mainnet           │
   │                         │                          │
   │                         │  registered: true        │
   │                         │  active:     true        │
   │                         │  trustScore: 110         │
   │                         │  endorsements: 1         │
   │                         └──────┬──────────────────┘
   │                                │
   │                         if trustScore ≥ 100:
   │◄── response ───────────────────┤  respond ✓
   │                         else:
   │◄── rejected ───────────────────┤  reject  ✗
```

**The key insight:** Trust is verified on-chain at request time. Agent B doesn't rely on the caller's claim — it independently checks the registry. The caller can't fake a trust score. The registry is immutable and permissionless.

---

## Trust Score Formula

```
trustScore = reputation + (endorsements × 10)
```

- New agents start with `reputation = 100`
- Each peer endorsement adds `+10`
- The LUKSO Agent (0x293E...) has `reputation=100 + 1 endorsement = trustScore 110`

---

## Why This Matters for AI Agents

Today's AI agent ecosystems have a trust problem:

- Agent A calls Agent B's API. Agent B has no way to verify who A is.
- Platform credentials (API keys) are centralized and revocable.
- No reputation system — a malicious agent looks identical to a trusted one.

Universal Trust fixes this:

| Problem | Solution |
|---------|----------|
| No identity | Register on-chain (UP or EOA) |
| No reputation | Trust score from peers + admin |
| Centralized auth | Smart contract — no intermediary |
| Platform lock-in | Any EVM chain, any agent framework |
| Costly verification | Single `view` call, no gas needed |

---

## Files

| File | Purpose |
|------|---------|
| `demo.js` | Orchestrates both agents, runs both scenarios |
| `agent-a.js` | The requesting agent — fetches own identity, builds request |
| `agent-b.js` | The responding agent — verifies caller on-chain, gates response |
| `config.js` | Contract address, ABI, RPC URL, trust threshold |

---

## Real-World Integration

To use this pattern in your own agent:

```javascript
const { ethers } = require('ethers');
const { CONTRACT_ADDRESS, ABI, RPC_URL } = require('./config');

async function verifyAgent(callerAddress) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const registry  = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const result    = await registry.verify(callerAddress);

  return {
    registered:   result[0],
    active:       result[1],
    trustScore:   Number(result[5]),
  };
}

// In your request handler:
const v = await verifyAgent(req.headers['x-agent-address']);
if (!v.registered || v.trustScore < 100) return res.status(403).send('Not trusted');
```

---

## Contract

`AgentIdentityRegistry` — `0x064b9576f37BdD7CED4405185a5DB3bc7be5614C`  
[View on LUKSO Explorer →](https://explorer.execution.mainnet.lukso.network/address/0x064b9576f37BdD7CED4405185a5DB3bc7be5614C)

```solidity
function verify(address agent) external view returns (
  bool registered,
  bool active,
  bool isUP,
  uint256 reputation,
  uint256 endorsements,
  uint256 trustScore,
  string memory name
);
```

One call. That's it.
