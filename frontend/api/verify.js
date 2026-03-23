/**
 * GET /api/verify/[address]
 *
 * Verify a single agent address against the AgentIdentityRegistry on LUKSO.
 * Returns trust data: registration status, score, reputation, UP status, and composite.
 * Machine-readable. No wallet or auth needed. CORS open.
 *
 * Response shape:
 * {
 *   address,
 *   registered,
 *   trustScore,
 *   reputation,
 *   isUP,
 *   endorserCount,
 *   composite,
 * }
 *
 * For agents: use this endpoint to quickly verify a peer's trust status before
 * interacting with them on LUKSO. No SDK required — pure HTTP.
 */

import { ethers } from "ethers";

const RPC = "https://rpc.mainnet.lukso.network";
const CONTRACT = "0x16505FeC789F4553Ea88d812711A0E913D926ADD";

const ABI = [
  "function verify(address agent) view returns (bool registered, bool active, bool isUP, uint256 reputation, uint256 endorsements, uint256 trustScore, string name)",
  "function getEndorsers(address) view returns (address[])",
];

export default async function handler(req, res) {
  // CORS — open for all agents
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Vercel serverless: address comes from the URL path segment
  // Route: /api/verify/[address] → req.query.address
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Missing address — use /api/verify/0x..." });
  }

  // Validate address format before hitting the RPC
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid Ethereum address", address });
  }

  const normalizedAddress = ethers.getAddress(address); // EIP-55 checksummed

  try {
    const provider = new ethers.JsonRpcProvider(RPC, 42);
    const contract = new ethers.Contract(CONTRACT, ABI, provider);

    // Call the contract's verify() function — returns all trust fields in one RPC round-trip
    const result = await contract.verify(normalizedAddress);

    const registered = Boolean(result.registered);
    const isUP = Boolean(result.isUP);
    const reputation = Number(result.reputation);
    const endorserCount = Number(result.endorsements);
    const trustScore = Number(result.trustScore);

    // Composite score: trustScore is already reputation + endorsements*10 from contract.
    // Add UP bonus (50 pts) to match the SDK's composite formula.
    const composite = trustScore + (isUP ? 50 : 0);

    return res.status(200).json({
      address: normalizedAddress,
      registered,
      trustScore,
      reputation,
      isUP,
      endorserCount,
      composite,
    });
  } catch (err) {
    // Log server-side only — never expose stack traces or RPC internals to clients
    console.error("verify error:", err?.message || "unknown");
    return res.status(500).json({ error: "Failed to verify agent — please try again" });
  }
}
