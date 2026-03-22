# Universal Trust — Frontend

[![Frontend](https://img.shields.io/badge/Frontend-Live-green.svg)](https://universal-trust.vercel.app)
[![LUKSO Mainnet](https://img.shields.io/badge/Network-LUKSO%20Mainnet-FF2975.svg)](https://explorer.execution.mainnet.lukso.network/address/0x1581BA9Fb480b72df3e54f51f851a644483c6ec7)

On-chain identity and trust layer for AI agents on LUKSO. Built for [Synthesis 2026](https://synthesis.lukso.network) — "Agents that Trust" track.

## Quick Start

```bash
npm install
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

## Tech Stack

- **React 19** + **Vite 8** — fast dev/build
- **Tailwind CSS 3** — utility-first styling, dark theme with LUKSO branding
- **React Router 7** — client-side routing with lazy-loaded pages
- **ethers.js 6** — LUKSO mainnet RPC + wallet interaction
- **D3.js** — Trust graph SVG visualization
- **Envio GraphQL** — Universal Profile name/avatar resolution

## Project Structure

```
src/
├── App.jsx                 # Router setup, lazy imports, layout
├── main.jsx                # Entry point
├── index.css               # Global styles, animations, focus states
├── config.js               # Contract addresses, RPC URL, chain ID
├── useContract.js           # RPC helpers (cached provider/contract)
├── contract-abi.json        # AgentIdentityRegistry ABI
├── skills-abi.json          # AgentSkillsRegistry ABI
├── envio.js                 # Envio indexer — UP name + avatar resolution
├── components/
│   ├── Navbar.jsx           # Sticky nav with mobile hamburger
│   ├── Footer.jsx           # Contract link, network info
│   ├── AgentCard.jsx        # Agent list card (directory)
│   ├── TrustBadge.jsx       # Trust score badge + breakdown bar
│   ├── TrustScoreCard.jsx   # Detailed trust score breakdown + rank
│   └── TrustGraph.jsx       # SVG trust network visualization
└── pages/
    ├── Directory.jsx        # / — Agent directory with search/sort
    ├── AgentProfile.jsx     # /agent/:address — Full agent profile
    ├── Register.jsx         # /register — Register agent on-chain
    ├── Verify.jsx           # /verify — Trust Scanner
    ├── Endorse.jsx          # /endorse — Endorse an agent
    ├── About.jsx            # /about — How it works
    └── NotFound.jsx         # 404 catch-all
```

## Contracts (LUKSO Mainnet)

| Contract | Address |
|---|---|
| AgentIdentityRegistry | `0x1581BA9Fb480b72df3e54f51f851a644483c6ec7` |
| AgentSkillsRegistry | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` |

Full deployment details (including proxy vs. implementation addresses) are in [`../deployed-addresses.json`](../deployed-addresses.json).

## Features

- **Agent Directory** — Browse registered agents with search, sort, live stats
- **Trust Scanner** — Verify any address against the on-chain registry
- **Agent Profiles** — Skills, endorsements, trust score breakdown
- **On-chain Registration** — Register via UP Extension or MetaMask
- **Endorsement System** — Vouch for agents with on-chain endorsements
- **Trust Score Card** — Detailed breakdown with rank, score history, and progress bars
- **Trust Graph** — SVG visualization of the endorsement network
- **Envio Integration** — Resolves Universal Profile names and avatars via LUKSO Envio indexer (non-blocking, graceful fallback)
- **Code-split pages** — Each route lazy-loaded for performance
- **Mobile-first** — Responsive layout, hamburger nav, touch-friendly
- **Accessibility** — Focus-visible states, aria-labels, keyboard navigation

---

## API Endpoints

The frontend includes Vercel serverless functions under `api/`. These work in production (Vercel) and can be run locally with `vercel dev`.

### `GET /api/trust-graph`

Returns the full trust graph: all registered agents, their trust scores, and endorsement edges.

```bash
curl -s https://universal-trust.vercel.app/api/trust-graph | jq '.nodes[] | {name, id, trustScore}'
```

**Response shape:**
```json
{
  "nodes": [
    {
      "id": "0x293E96ebbf264ed7715cff2b67850517De70232a",
      "name": "LUKSO Agent",
      "trustScore": 110,
      "weightedTrustScore": 110,
      "lsp26Score": 0,
      "isUniversalProfile": true
    }
  ],
  "edges": [
    {
      "source": "0xEndorser...",
      "target": "0xEndorsed...",
      "reason": "Trusted peer"
    }
  ]
}
```

---

### `GET /api/discover-agents`

Returns a machine-readable list of all registered agents — designed for agent-to-agent discovery. Compatible with ERC-8004 agent discovery patterns.

```bash
curl -s https://universal-trust.vercel.app/api/discover-agents | jq '.agents[0]'
```

**Response shape:**
```json
{
  "agents": [
    {
      "address": "0x293E96ebbf264ed7715cff2b67850517De70232a",
      "name": "LUKSO Agent",
      "registered": true,
      "active": true,
      "trustScore": 110,
      "isUniversalProfile": true
    }
  ],
  "total": 2,
  "contract": "0x1581BA9Fb480b72df3e54f51f851a644483c6ec7",
  "network": "lukso-mainnet"
}
```

---

### `GET /api/verify/:address`

Single-agent trust verification — the fastest way to check if an agent is trustworthy. No SDK, no wallet, one HTTP call.

```bash
curl -s https://universal-trust.vercel.app/api/verify/0x293E96ebbf264ed7715cff2b67850517De70232a
```

**Response shape:**
```json
{
  "address": "0x293E96ebbf264ed7715cff2b67850517De70232a",
  "registered": true,
  "active": true,
  "isUniversalProfile": true,
  "reputation": 100,
  "endorsements": 1,
  "trustScore": 110,
  "name": "LUKSO Agent"
}
```

---

### `GET /.well-known/agent-trust.json`

Machine-readable discovery document (static, served from `public/`). Returns contract addresses, trust formula, and API docs — designed for agents to self-bootstrap without documentation.

```bash
curl -s https://universal-trust.vercel.app/.well-known/agent-trust.json | python3 -m json.tool
```

---

## Environment Variables

The frontend reads configuration from environment variables at build time (Vite) and at runtime (Vercel serverless functions).

### Required for deployment

| Variable | Description | Example |
|---|---|---|
| `VITE_CONTRACT_ADDRESS` | AgentIdentityRegistry proxy address | `0x1581BA9Fb480b72df3e54f51f851a644483c6ec7` |
| `VITE_SKILLS_CONTRACT_ADDRESS` | AgentSkillsRegistry address | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` |
| `VITE_RPC_URL` | LUKSO mainnet RPC endpoint | `https://rpc.mainnet.lukso.network` |
| `VITE_CHAIN_ID` | LUKSO chain ID | `42` |

### Optional / serverless only

| Variable | Description |
|---|---|
| `RPC_URL` | Server-side RPC (used by `/api/*` functions; falls back to `VITE_RPC_URL`) |
| `ENVIO_API_URL` | Envio indexer GraphQL endpoint (defaults to the public LUKSO Envio endpoint) |

### Local development

Create a `.env.local` file in the `frontend/` directory:

```bash
# frontend/.env.local
VITE_CONTRACT_ADDRESS=0x1581BA9Fb480b72df3e54f51f851a644483c6ec7
VITE_SKILLS_CONTRACT_ADDRESS=0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6
VITE_RPC_URL=https://rpc.mainnet.lukso.network
VITE_CHAIN_ID=42
```

> **Note:** `.env.local` is gitignored. Never commit API keys or private keys.

---

## Deployment

### Vercel (recommended)

1. Fork/clone the repo
2. Import the project in Vercel — set the **root directory** to `frontend/`
3. Add environment variables (see above) in the Vercel project settings
4. Deploy — Vercel auto-detects Vite and configures the build

**Build settings** (auto-detected):
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The `api/` directory is automatically deployed as Vercel serverless functions.

### Manual / self-hosted

```bash
cd frontend
npm install
npm run build
# Serve the dist/ folder with any static file server
npx serve dist
```

For the serverless API routes (`/api/*`), you'll need either:
- Vercel (recommended)
- A Node.js server that proxies to the LUKSO RPC directly
- The SDK: `npm install @universal-trust/sdk` — bypasses the API entirely

---

## Screenshots

See the live app at **https://universal-trust.vercel.app**

| Page | URL |
|------|-----|
| Agent Directory | https://universal-trust.vercel.app/ |
| Trust Scanner | https://universal-trust.vercel.app/verify |
| Agent Profile | https://universal-trust.vercel.app/agent/0x293E96ebbf264ed7715cff2b67850517De70232a |
| About / How It Works | https://universal-trust.vercel.app/about |

---

## License

MIT — see [`../LICENSE`](../LICENSE)
