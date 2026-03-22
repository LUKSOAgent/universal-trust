#!/usr/bin/env node
/**
 * Keeper: Sync trust scores to Universal Profiles as ERC725Y data
 *
 * Reads each agent's trustScore from the AgentIdentityRegistry and writes it
 * to the agent's Universal Profile using setData(bytes32, bytes).
 *
 * Data key:  AgentTrustScore = keccak256("AgentTrustScore")
 * Value:     abi.encode(uint256 trustScore)
 *
 * Requires KEEPER_PRIVATE_KEY env var. The keeper address must have SETDATA
 * permission on each target UP (granted via LSP6 KeyManager).
 *
 * Usage:
 *   KEEPER_PRIVATE_KEY=0x... node scripts/keeper-up-sync.js
 *
 * ethers v6
 */

const { ethers } = require("ethers");

// --- Config ---
const RPC_URL = "https://rpc.mainnet.lukso.network";
const CHAIN_ID = 42;
const REGISTRY_ADDRESS = "0x1581BA9Fb480b72df3e54f51f851a644483c6ec7";
const PAGE_SIZE = 50;

// Data key: keccak256("AgentTrustScore")
const TRUST_SCORE_DATA_KEY = ethers.keccak256(ethers.toUtf8Bytes("AgentTrustScore"));

// --- ABIs ---
const REGISTRY_ABI = [
  "function getAgentCount() external view returns (uint256)",
  "function getAgentsByPage(uint256 offset, uint256 limit) external view returns (address[])",
  "function getTrustScore(address agent) external view returns (uint256)",
  "function verify(address agent) external view returns (bool registered, bool active, bool isUP, uint256 reputation, uint256 endorsements, uint256 trustScore, string name)",
];

// ERC725Y setData — works on Universal Profiles (LSP0)
const UP_ABI = [
  "function setData(bytes32 dataKey, bytes memory dataValue) external",
  "function getData(bytes32 dataKey) external view returns (bytes memory)",
];

async function main() {
  const privateKey = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: KEEPER_PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const keeper = new ethers.Wallet(privateKey, provider);

  console.log("=== Universal Trust — UP Trust Score Keeper ===");
  console.log(`Keeper address: ${keeper.address}`);
  console.log(`Data key: AgentTrustScore = ${TRUST_SCORE_DATA_KEY}`);
  console.log(`Registry: ${REGISTRY_ADDRESS}`);
  console.log("");

  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

  // 1. Get all agents
  const agentCount = await registry.getAgentCount();
  console.log(`Total agents registered: ${agentCount}`);

  const allAgents = [];
  for (let offset = 0; offset < agentCount; offset += PAGE_SIZE) {
    const limit = Math.min(PAGE_SIZE, Number(agentCount) - offset);
    const page = await registry.getAgentsByPage(offset, limit);
    allAgents.push(...page);
  }

  console.log(`Fetched ${allAgents.length} agent addresses\n`);

  // Stats
  const results = { updated: 0, skipped: 0, failed: 0, unchanged: 0 };

  // 2. Process each agent
  for (const agentAddr of allAgents) {
    try {
      // Verify the agent — check isUP and get trustScore
      const [registered, active, isUP, , , trustScore, name] = await registry.verify(agentAddr);

      if (!registered || !active) {
        console.log(`  SKIP ${agentAddr} (${name || "?"}) — inactive/unregistered`);
        results.skipped++;
        continue;
      }

      if (!isUP) {
        console.log(`  SKIP ${agentAddr} (${name || "?"}) — not a Universal Profile (EOA)`);
        results.skipped++;
        continue;
      }

      // Encode value: abi.encode(uint256)
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedValue = abiCoder.encode(["uint256"], [trustScore]);

      // Check current on-chain value to avoid unnecessary writes
      const up = new ethers.Contract(agentAddr, UP_ABI, keeper);
      try {
        const currentValue = await up.getData(TRUST_SCORE_DATA_KEY);
        if (currentValue === encodedValue) {
          console.log(`  UNCHANGED ${agentAddr} (${name}) — trustScore=${trustScore} already set`);
          results.unchanged++;
          continue;
        }
      } catch {
        // getData might fail if not a proper UP, proceed anyway
      }

      // Try to setData
      console.log(`  WRITING ${agentAddr} (${name}) — trustScore=${trustScore}...`);
      const tx = await up.setData(TRUST_SCORE_DATA_KEY, encodedValue);
      const receipt = await tx.wait();
      console.log(`    ✓ Updated! TX: ${receipt.hash}`);
      results.updated++;
    } catch (err) {
      const name = await getAgentName(registry, agentAddr);
      const msg = err.message || String(err);

      if (
        msg.includes("NotAuthorised") ||
        msg.includes("not authorised") ||
        msg.includes("LSP6") ||
        msg.includes("NoPermissionsSet") ||
        msg.includes("not allowed") ||
        msg.includes("execution reverted")
      ) {
        console.log(`  FAILED ${agentAddr} (${name}) — needs permission grant`);
        console.log(`    → Agent must grant SETDATA permission to keeper ${keeper.address}`);
      } else {
        console.log(`  FAILED ${agentAddr} (${name}) — ${msg.slice(0, 120)}`);
      }
      results.failed++;
    }
  }

  // 3. Summary
  console.log("\n=== Summary ===");
  console.log(`Updated:   ${results.updated}`);
  console.log(`Unchanged: ${results.unchanged}`);
  console.log(`Skipped:   ${results.skipped} (not UP or inactive)`);
  console.log(`Failed:    ${results.failed} (no permission or error)`);

  if (results.failed > 0) {
    console.log("\n=== Permission Grant Instructions ===");
    console.log(`Agents whose UPs failed need to grant SETDATA permission to the keeper.`);
    console.log(`Keeper address: ${keeper.address}`);
    console.log(`\nRun: KEEPER_PRIVATE_KEY=0x... node scripts/grant-keeper-permission.js`);
    console.log(`This prints the exact commands each agent needs to execute.`);
  }
}

async function getAgentName(registry, addr) {
  try {
    const [, , , , , , name] = await registry.verify(addr);
    return name || "?";
  } catch {
    return "?";
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message || err);
  process.exit(1);
});
