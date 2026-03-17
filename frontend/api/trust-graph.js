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
const CONTRACT = "0x16505FeC789F4553Ea88d812711A0E913D926ADD";

const ABI = [
  "function getAgentCount() view returns (uint256)",
  "function getAgentsByPage(uint256 offset, uint256 limit) view returns (address[])",
  "function getAgent(address) view returns (tuple(string name, string description, string metadataURI, uint256 reputation, uint256 endorsementCount, uint64 registeredAt, uint64 lastActiveAt, bool isActive))",
  "function getEndorsers(address) view returns (address[])",
  "function getEndorsement(address endorser, address endorsed) view returns (tuple(address endorser, address endorsed, uint64 timestamp, string reason))",
  "function isUniversalProfile(address) view returns (bool)",
];

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

    // Fetch all agents in parallel
    const agentResults = await Promise.allSettled(
      addresses.map(async (addr) => {
        const a = await contract.getAgent(addr);
        const isUP = await contract.isUniversalProfile(addr);
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
                timestamp: Number(e.timestamp),
                reason: e.reason || undefined,
              };
            } catch {
              return { source: endorser, target: node.id };
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

    return res.status(200).json({
      meta: {
        generatedAt: new Date().toISOString(),
        chainId: 42,
        contract: CONTRACT,
        agentCount: nodes.length,
        endorsementCount: edges.length,
        trustFormula: "trustScore = reputation + (endorsements × 10)",
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
