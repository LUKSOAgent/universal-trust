# Universal Trust — Frontend

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
| AgentIdentityRegistry | `0x16505FeC789F4553Ea88d812711A0E913D926ADD` |
| AgentSkillsRegistry | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` |

## Features

- **Agent Directory** — Browse registered agents with search, sort, live stats
- **Trust Scanner** — Verify any address against the on-chain registry
- **Agent Profiles** — Skills, endorsements, trust score breakdown
- **On-chain Registration** — Register via UP Extension or MetaMask
- **Endorsement System** — Vouch for agents with on-chain endorsements
- **Trust Score Card** — Detailed breakdown with rank, score history, and progress bars
- **Envio Integration** — Resolves Universal Profile names and avatars via LUKSO Envio indexer (non-blocking, graceful fallback)
- **Code-split pages** — Each route lazy-loaded for performance
- **Mobile-first** — Responsive layout, hamburger nav, touch-friendly
- **Accessibility** — Focus-visible states, aria-labels, keyboard navigation
