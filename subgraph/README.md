# Universal Trust Agent Identity Registry Subgraph

A The Graph subgraph for indexing `AgentIdentityRegistry` events on LUKSO mainnet.

## Overview

This subgraph tracks:
- **Agent Registration**: Agent name, description, metadata URI, initial reputation
- **Agent Updates**: Profile changes (name, description, metadata)
- **Agent Status**: Activation/deactivation state
- **Reputation**: Changes to agent reputation scores
- **Endorsements**: Peer-to-peer trust endorsements with active/inactive status
- **Trust Scores**: Computed trust scores (reputation + endorsements*10)
- **Global Stats**: Total agents, active agents, total endorsements

## Contract Details

- **Network**: LUKSO mainnet (Chain ID: 42)
- **Proxy Address**: `0x16505FeC789F4553Ea88d812711A0E913D926ADD`
- **Events Indexed**:
  - `AgentRegistered` — New agent joins registry
  - `AgentUpdated` — Agent profile update
  - `AgentDeactivated` — Agent deactivation
  - `AgentReactivated` — Agent reactivation
  - `ReputationUpdated` — Reputation change with delta and reason
  - `EndorsementAdded` — New endorsement between agents
  - `EndorsementRemoved` — Endorsement removed
  - `ReputationUpdaterSet` — Authorization for reputation updates
  - `OwnershipTransferred` — Registry ownership change

## Data Model

### Entities

#### `Agent`
```graphql
type Agent @entity {
  id: ID!                    # agent address (hex)
  name: String!
  description: String
  metadataURI: String
  reputation: BigInt!        # current reputation score
  endorsementCount: BigInt!  # active endorsement count
  trustScore: BigInt!        # reputation + endorsementCount*10
  isActive: Boolean!
  registeredAt: BigInt!      # timestamp
  lastActiveAt: BigInt!      # timestamp of last activity
  endorsementsGiven: [Endorsement!]! @derivedFrom(field: "endorser")
  endorsementsReceived: [Endorsement!]! @derivedFrom(field: "endorsed")
  reputationHistory: [ReputationEvent!]! @derivedFrom(field: "agent")
}
```

#### `Endorsement`
```graphql
type Endorsement @entity {
  id: ID!                    # endorser-endorsed
  endorser: Agent!
  endorsed: Agent!
  reason: String!
  timestamp: BigInt!
  active: Boolean!           # false if removed
}
```

#### `ReputationEvent`
```graphql
type ReputationEvent @entity {
  id: ID!                    # txHash-logIndex
  agent: Agent!
  oldReputation: BigInt!
  newReputation: BigInt!
  delta: BigInt!
  reason: String!
  timestamp: BigInt!
  type: String!              # "update" or "decay"
}
```

#### `RegistryStats`
```graphql
type RegistryStats @entity {
  id: ID!                    # "global"
  totalAgents: BigInt!
  totalEndorsements: BigInt!
  activeAgents: BigInt!
}
```

## Deployment

### Prerequisites

- Node.js 18+
- The Graph CLI: `npm install -g @graphprotocol/graph-cli`

### Setup

```bash
npm install
```

### Codegen (from ABI)

```bash
npm run codegen
```

This generates TypeScript types from the ABI and GraphQL schema.

### Build

```bash
npm run build
```

This compiles the AssemblyScript mapping to WebAssembly.

### Deploy to The Graph Studio

```bash
# Authenticate first
graph auth --studio <your-studio-api-key>

# Deploy
npm run deploy
```

For more info: https://thegraph.com/studio

### Deploy to Custom Graph Node

If LUKSO is not yet supported by The Graph hosted service, deploy to a custom Graph Node:

```bash
graph deploy --node http://localhost:8020 --ipfs http://localhost:5001 universal-trust-subgraph
```

Ensure your Graph Node has LUKSO mainnet configured in `docker-compose.yml`:

```yaml
ethereum: 'lukso:http://your-lukso-rpc:8545'
```

## Testing

**Note**: Subgraph testing requires a synced LUKSO node and Graph Node instance.

For local development:
1. Start a LUKSO node (or use public RPC)
2. Run a Graph Node pointing to that RPC
3. Deploy subgraph: `graph deploy --node http://localhost:8020 ...`
4. Query at `http://localhost:8000/subgraphs/name/universal-trust-subgraph`

## Example Queries

### Get all agents

```graphql
query {
  agents(first: 10) {
    id
    name
    reputation
    endorsementCount
    trustScore
    isActive
  }
}
```

### Get agent with endorsements

```graphql
query {
  agent(id: "0x...") {
    id
    name
    reputation
    endorsementsReceived {
      endorser {
        id
        name
      }
      reason
      timestamp
      active
    }
  }
}
```

### Get reputation history

```graphql
query {
  reputationEvents(where: { agent: "0x..." }, orderBy: timestamp, orderDirection: desc) {
    id
    oldReputation
    newReputation
    delta
    reason
    type
    timestamp
  }
}
```

### Get global stats

```graphql
query {
  registryStats(id: "global") {
    totalAgents
    totalEndorsements
    activeAgents
  }
}
```

## Design Decisions

1. **Trust Score Computation**: `reputation + (endorsementCount * 10)`, capped at `MAX_REPUTATION` (10000). This balances intrinsic reputation with community validation.

2. **Endorsement ID Format**: `endorser-endorsed` (hex addresses) allows lookup by (endorser, endorsed) pair.

3. **ReputationEvent Storage**: Each `ReputationUpdated` is recorded with `txHash-logIndex` ID for guaranteed uniqueness and transaction tracing.

4. **Active Flag on Endorsement**: Instead of deleting, endorsements are marked inactive. This preserves historical data while tracking current endorsement state.

5. **RegistryStats**: Single global entity with ID `"global"` to track cumulative metrics efficiently.

6. **lastActiveAt**: Updated on agent profile updates, reputation changes, and endorsement additions to track activity freshness.

## Monitoring

- Use The Graph Studio dashboard to monitor sync status
- Query the subgraph for real-time data
- Set up alerts for anomalies in reputation changes or endorsement activity

## License

MIT
