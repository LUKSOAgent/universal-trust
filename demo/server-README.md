# Universal Trust — REST API Server Demo

Shows how to use on-chain agent trust verification in a real HTTP context.

Agent B runs as an Express server. Every incoming request is verified against the
[AgentIdentityRegistry](https://explorer.execution.mainnet.lukso.network/address/0x1581BA9Fb480b72df3e54f51f851a644483c6ec7)
on LUKSO mainnet before the server responds.

## Quick Start

```bash
cd demo
npm install          # installs ethers + express
node server.js       # starts on port 3042
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/verify/:address` | Verify any agent's on-chain trust status |
| `POST` | `/request` | Agent-to-agent request (trust-gated) |
| `GET` | `/agents` | List all registered agents |
| `GET` | `/health` | Health check + LUKSO block number |

## Try It

### Verify an agent

```bash
curl http://localhost:3042/verify/0x293E96ebbf264ed7715cff2b67850517De70232a
```

Returns:

```json
{
  "address": "0x293E96ebbf264ed7715cff2b67850517De70232a",
  "registered": true,
  "active": true,
  "isUniversalProfile": true,
  "reputation": 100,
  "endorsements": 1,
  "trustScore": 110,
  "name": "LUKSO Agent",
  "endorsers": ["0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b"],
  "contract": "0x1581BA9Fb480b72df3e54f51f851a644483c6ec7",
  "network": "LUKSO Mainnet",
  "chainId": 42
}
```

### Agent-to-agent request (trust-gated)

```bash
curl -X POST http://localhost:3042/request \
  -H "Content-Type: application/json" \
  -d '{"from": "0x293E96ebbf264ed7715cff2b67850517De70232a", "payload": "hello"}'
```

Trusted agent (registered, active, trustScore ≥ 100) → **200 OK** with response data.

Untrusted agent → **403 Forbidden** with rejection reason.

### Untrusted request (rejected)

```bash
curl -X POST http://localhost:3042/request \
  -H "Content-Type: application/json" \
  -d '{"from": "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF", "payload": "hello"}'
```

Returns `403`:

```json
{
  "error": "Agent not registered",
  "address": "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF",
  "trustScore": 0,
  "required": 100
}
```

## Trust Gate Middleware

The key pattern is the `trustGate(minScore)` middleware:

```javascript
const { trustGate } = require('./server');

// Require trust score ≥ 200 for sensitive endpoints
app.post('/sensitive', trustGate(200), (req, res) => {
  // req.agentTrust contains { registered, active, isUP, reputation, ... }
  // req.agentAddress is the verified address
  res.json({ data: 'sensitive response' });
});
```

Agents identify themselves via:
- `x-agent-address` HTTP header, or
- `from` field in the JSON request body

The middleware calls `verify()` on-chain (one RPC call) and returns:
- **400** — Missing or invalid agent address
- **403** — Not registered / deactivated / trust score too low
- **502** — RPC call failed
- **next()** — Verified! `req.agentTrust` and `req.agentAddress` available

## Architecture

```
Agent A (client)                    Agent B (this server)
     │                                    │
     │  POST /request                     │
     │  { from: "0xAgentA", payload }     │
     │───────────────────────────────────→│
     │                                    │ trustGate(100)
     │                                    │   → registry.verify(0xAgentA)
     │                                    │   → LUKSO Mainnet (Chain 42)
     │                                    │
     │  200 OK / 403 Forbidden            │
     │←───────────────────────────────────│
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3042` | Server port |

## Requirements

- Node.js ≥ 18
- `npm install` (ethers + express)
- Internet connection to LUKSO mainnet RPC
- No wallet or private key needed (read-only)
