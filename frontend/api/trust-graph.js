/**
 * GET /api/trust-graph
 *
 * Returns the full trust graph as JSON — nodes (agents) and edges (endorsements).
 * Machine-readable. No wallet or auth needed. CORS open.
 *
 * Response shape:
 * {
 *   meta: { generatedAt, chainId, agentCount, endorsementCount, contract },
 *   nodes: [{ id, name, trustScore, reputation, endorsementCount, isUP, registeredAt }],
 *   edges: [{ source, target, reason?, timestamp? }]
 * }
 *
 * For agents: fetch this endpoint to discover the full trust network,
 * find highly-trusted peers, or verify who endorsed whom.
 */

import { ethers } from "ethers";

const RPC = "https://rpc.mainnet.lukso.network";
const CONTRACT = "0x064b9576f37BdD7CED4405185a5DB3bc7be5614C";
const ENVIO_ENDPOINT = "https://envio.lukso-mainnet.universal.tech/v1/graphql";

const ABI = [
  "function getAgentCount() view returns (uint256)",
  "function getAgentsByPage(uint256 offset, uint256 limit) view returns (address[])",
  "function getAgent(address) view returns (tuple(string name, string description, string metadataURI, uint256 reputation, uint256 endorsementCount, uint64 registeredAt, uint64 lastActiveAt, bool isActive))",
  "function getEndorsers(address) view returns (address[])",
  "function getEndorsement(address endorser, address endorsed) view returns (tuple(address endorser, address endorsed, uint64 timestamp, string reason))",
  "function isUniversalProfile(address) view returns (bool)",
];



/**
 * Fetch LSP26 followers for an address from Envio, return only those in registeredSet.
 */
async function fetchLSP26Followers(address, registeredSet) {
  const addr = address.toLowerCase();
  try {
    const query = `
      query LSP26Followers($addr: String!) {
        Follow(where: { followee_id: { _eq: $addr } }, limit: 500) {
          follower_id
        }
      }
    `;
    const res = await fetch(ENVIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { addr } }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { count: 0, addresses: [] };
    const { data, errors } = await res.json();
    if (errors || !data?.Follow) return { count: 0, addresses: [] };
    const registered = data.Follow
      .map((f) => f.follower_id.toLowerCase())
      .filter((f) => registeredSet.has(f));
    return { count: registered.length, addresses: registered };
  } catch {
    return { count: 0, addresses: [] };
  }
}

export default async function handler(req, res) {
  // CORS — open for all agents
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const provider = new ethers.JsonRpcProvider(RPC, 42);
    const contract = new ethers.Contract(CONTRACT, ABI, provider);

    const count = Number(await contract.getAgentCount());
    if (count === 0) {
      return res.status(200).json({
        meta: { generatedAt: new Date().toISOString(), chainId: 42, agentCount: 0, endorsementCount: 0, contract: CONTRACT },
        nodes: [],
        edges: [],
      });
    }

    const addresses = await contract.getAgentsByPage(0, count);
    if (!addresses || addresses.length === 0) {
      return res.status(200).json({
        meta: { generatedAt: new Date().toISOString(), chainId: 42, agentCount: 0, endorsementCount: 0, contract: CONTRACT },
        nodes: [],
        edges: [],
      });
    }

    // Fetch all agents in parallel
    // isUniversalProfile is fetched separately to avoid one revert taking down the whole agent fetch
    const agentResults = await Promise.allSettled(
      addresses.map(async (addr) => {
        const a = await contract.getAgent(addr);
        let isUP = false;
        try {
          isUP = await contract.isUniversalProfile(addr);
        } catch {
          // isUniversalProfile can revert for some addresses — default to false
        }
        return {
          id: addr,
          name: a.name || "",
          description: a.description || "",
          metadataURI: a.metadataURI || "",
          reputation: Number(a.reputation),
          endorsementCount: Number(a.endorsementCount),
          trustScore: Number(a.reputation) + Number(a.endorsementCount) * 10,
          registeredAt: Number(a.registeredAt),
          lastActiveAt: Number(a.lastActiveAt),
          isActive: Boolean(a.isActive),
          isUP: Boolean(isUP),
        };
      })
    );

    const nodes = agentResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    // Build a reputation lookup map for weightedTrustScore computation
    const reputationByAddr = {};
    for (const node of nodes) {
      reputationByAddr[node.id.toLowerCase()] = node.reputation;
    }

    // Fetch endorsement edges in parallel (inner endorser lookups also parallelized)
    const edgeResults = await Promise.allSettled(
      nodes.map(async (node) => {
        const endorsers = await contract.getEndorsers(node.id);
        if (!endorsers || endorsers.length === 0) return [];
        const innerResults = await Promise.allSettled(
          endorsers.map(async (endorser) => {
            try {
              const e = await contract.getEndorsement(endorser, node.id);
              return {
                source: endorser,
                target: node.id,
                timestamp: Number(e.timestamp || 0),
                reason: e.reason || undefined,
              };
            } catch {
              // Endorsement data unavailable — still include the edge for graph connectivity
              return { source: endorser, target: node.id, timestamp: 0 };
            }
          })
        );
        return innerResults
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
      })
    );

    const edges = edgeResults
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);

    // Compute weightedTrustScore for each node:
    // reputation + sum(min(50, max(10, floor(endorserReputation / 10)))) for each endorser, capped at 10000
    // Build endorser-set per node from edges
    const endorsersByTarget = {};
    for (const edge of edges) {
      const target = edge.target.toLowerCase();
      if (!endorsersByTarget[target]) endorsersByTarget[target] = [];
      endorsersByTarget[target].push(edge.source.toLowerCase());
    }

    for (const node of nodes) {
      const endorsers = endorsersByTarget[node.id.toLowerCase()] || [];
      const endorsementBonus = endorsers.reduce((sum, endorserAddr) => {
        const endorserRep = reputationByAddr[endorserAddr] ?? 0;
        const contribution = Math.min(50, Math.max(10, Math.floor(endorserRep / 10)));
        return sum + contribution;
      }, 0);
      node.weightedTrustScore = Math.min(10000, node.reputation + endorsementBonus);
    }

    // Fetch LSP26 registered followers for all agents (parallel, best-effort)
    const registeredSet = new Set(nodes.map((n) => n.id.toLowerCase()));
    const lsp26Results = await Promise.allSettled(
      nodes.map((n) => fetchLSP26Followers(n.id, registeredSet))
    );
    for (let i = 0; i < nodes.length; i++) {
      const lsp26 = lsp26Results[i].status === "fulfilled"
        ? lsp26Results[i].value
        : { count: 0, addresses: [] };
      nodes[i].lsp26FollowerCount = lsp26.count;
      nodes[i].lsp26Score = lsp26.count * 5;
    }

    return res.status(200).json({
      meta: {
        generatedAt: new Date().toISOString(),
        chainId: 42,
        contract: CONTRACT,
        agentCount: nodes.length,
        endorsementCount: edges.length,
        trustFormula: "trustScore = reputation + (endorsements × 10)",
        compositeFormula: "compositeScore = trustScore + Math.round(onChainScore × 3) + Math.min(skillsCount, 20) × 10 + lsp26Score",
        lsp26Formula: "lsp26Score = registeredFollowersCount × 5 (soft endorsement signal from LSP26 social graph)",
        weightedTrustFormula: "weightedTrustScore = reputation + sum(min(50, max(10, floor(endorserReputation / 10)))) per endorser, capped at 10000",
        sdk: "npm install @universal-trust/sdk",
        docs: "https://universal-trust.vercel.app/.well-known/agent-trust.json",
      },
      nodes,
      edges,
    });
  } catch (err) {
    // Log error server-side only — never expose stack traces or RPC details to clients
    console.error("trust-graph error:", err?.message || "unknown");
    return res.status(500).json({ error: "Failed to fetch trust graph — please try again" });
  }
}
