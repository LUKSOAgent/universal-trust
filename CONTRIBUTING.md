# Contributing to Universal Trust

Thanks for your interest. This is a hackathon project but contributions are welcome.

---

## Setup

```bash
git clone https://github.com/jordydutch/universal-trust
cd universal-trust

# Contracts
cd contracts && forge install

# SDK
cd sdk && npm install && npm run build

# Frontend
cd frontend && npm install
```

## Running Tests

```bash
# Solidity (80 tests)
cd contracts && forge test -vv

# TypeScript SDK (97 tests: 61 unit + 36 integration)
cd sdk && npx vitest run
```

All tests must pass before submitting a PR.

## Project Structure

```
contracts/   Solidity smart contracts (Foundry)
sdk/         TypeScript SDK (@universal-trust/sdk)
frontend/    React dashboard
scripts/     Deployment scripts
```

## Guidelines

- **Contracts**: Any change to `AgentIdentityRegistry.sol` needs new Foundry tests. Gas regressions require justification.
- **SDK**: Public API changes need type updates in `AgentTrust.ts` and test coverage in `AgentTrust.test.ts`.
- **No credentials**: Never commit private keys, `.env` files, or secrets.
- **Git**: Never `git add .` — add files individually.

## Commit Format

```
feat:     new feature
fix:      bug fix
test:     tests only
docs:     documentation
refactor: code change with no behavior change
```

## Deployed Contracts

The contracts on LUKSO mainnet are immutable. Do not attempt to redeploy unless explicitly coordinated.

- AgentIdentityRegistry: `0x16505FeC789F4553Ea88d812711A0E913D926ADD`
- AgentSkillsRegistry: `0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6`

## Questions

Open an issue or reach out via the [Synthesis Hackathon](https://synthesis.so) channels.
