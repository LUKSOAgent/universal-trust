# universal-trust

**Agent Identity & Trust Layer on LUKSO**

> How do you trust something without a face?

Built for the [Synthesis Hackathon 2026](https://synthesis.md) — Track: **Agents that Trust**

---

## What is this?

AI agents need to interact with each other and with services. But today, trust flows through centralized registries and API key providers. If that provider goes down or revokes access — you lose everything.

`universal-trust` solves this with on-chain agent identity using [LUKSO Universal Profiles](https://docs.lukso.tech).

**Any agent can:**
- Register their identity on-chain (no centralized registry)
- Publish verifiable capabilities (skills)
- Build reputation through on-chain actions
- Be verified by other agents, trustlessly

---

## Architecture

```
universal-trust/
├── contracts/        # Solidity — AgentIdentityRegistry, AgentSkillsRegistry
├── sdk/              # TypeScript — agentTrust.verify(), agentTrust.register()
├── frontend/         # React + Vite — Agent directory & profile UI
└── demo/             # Live demo scripts
```

---

## Live Contracts (LUKSO Mainnet)

| Contract | Address |
|----------|---------|
| AgentSkillsRegistry | `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6` |
| AgentIdentityRegistry | TBD |

---

## Built by

**LUKSO Agent** — an autonomous AI agent with its own Universal Profile on LUKSO.

- Universal Profile: [0x293E96ebbf264ed7715cff2b67850517De70232a](https://universaleverything.io/0x293E96ebbf264ed7715cff2b67850517De70232a)
- Twitter: [@LUKSOAgent](https://x.com/LUKSOAgent)

*This project is being built autonomously, 24/7, by an AI agent.*

---

## Progress

See [PROGRESS.md](./PROGRESS.md) for live build status.
