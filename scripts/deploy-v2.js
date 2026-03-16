#!/usr/bin/env node
/**
 * Deploy AgentIdentityRegistry v2 to LUKSO mainnet
 * Changes: endorse() now requires endorser to be a Universal Profile (not a registered agent)
 *
 * Uses ethers v6. Private key from environment.
 */
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC_URL    = "https://rpc.mainnet.lukso.network";
const CHAIN_ID   = 42;
const SKILLS_REGISTRY = "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6";

// LUKSO Agent identity
const AGENT_UP        = "0x293E96ebbf264ed7715cff2b67850517De70232a";
const AGENT_UP_NAME   = "LUKSO Agent";
const AGENT_UP_DESC   = "AI agent operating on LUKSO with a Universal Profile. Expert in LSP standards, token operations, and blockchain interactions.";
const AGENT_UP_META   = "";

// KeyManager ABI (minimal — just execute)
const KM_ABI = [
  "function execute(bytes calldata payload) external payable returns (bytes memory)"
];

// UP ABI (minimal — execute + owner)
const UP_ABI = [
  "function execute(uint256 operationType, address target, uint256 value, bytes calldata data) external payable returns (bytes memory)",
  "function owner() external view returns (address)"
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  // Load compiled artifact
  const artifactPath = path.join(__dirname, "..", "contracts", "out", "AgentIdentityRegistry.sol", "AgentIdentityRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi      = artifact.abi;
  const bytecode = artifact.bytecode.object;

  console.log("Connecting to LUKSO mainnet...");
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const wallet   = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer EOA : ${wallet.address}`);
  console.log(`Balance      : ${ethers.formatEther(balance)} LYX`);

  if (balance === 0n) {
    console.error("ERROR: No LYX balance");
    process.exit(1);
  }

  // ── 1. Compile check ──────────────────────────────────────────────────────
  console.log("\n── Step 1: Deploy AgentIdentityRegistry v2 ──");
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(SKILLS_REGISTRY);
  console.log(`TX: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();
  const newAddress = await contract.getAddress();
  console.log(`✅ Deployed at: ${newAddress}`);
  console.log(`   Explorer   : https://explorer.execution.mainnet.lukso.network/address/${newAddress}`);

  // ── 2. Save addresses ─────────────────────────────────────────────────────
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  const addresses = {
    network: "lukso-mainnet",
    chainId: CHAIN_ID,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      AgentIdentityRegistry: newAddress,
      AgentSkillsRegistry: SKILLS_REGISTRY
    }
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Saved deployed-addresses.json");

  // ── 3. Register the UP via KeyManager ────────────────────────────────────
  console.log(`\n── Step 2: Register LUKSO Agent UP (${AGENT_UP}) via KeyManager ──`);

  // Build register() calldata
  const registry = new ethers.Contract(newAddress, abi, wallet);
  const registerCalldata = registry.interface.encodeFunctionData("register", [
    AGENT_UP_NAME,
    AGENT_UP_DESC,
    AGENT_UP_META
  ]);

  // Build UP.execute() calldata (operationType=0 CALL)
  const up = new ethers.Contract(AGENT_UP, UP_ABI, wallet);
  const upCalldata = up.interface.encodeFunctionData("execute", [
    0,           // CALL
    newAddress,  // to: new registry
    0,           // value
    registerCalldata
  ]);

  // Get KeyManager address (UP owner)
  const kmAddress = await up.owner();
  console.log(`KeyManager: ${kmAddress}`);

  const km = new ethers.Contract(kmAddress, KM_ABI, wallet);
  const kmTx = await km.execute(upCalldata);
  console.log(`TX: ${kmTx.hash}`);
  await kmTx.wait();
  console.log(`✅ LUKSO Agent UP registered as "${AGENT_UP_NAME}"`);

  // ── 4. Verify ─────────────────────────────────────────────────────────────
  console.log("\n── Step 3: Verify ──");
  const result = await registry.verify(AGENT_UP);
  console.log(`  registered   : ${result[0]}`);
  console.log(`  active       : ${result[1]}`);
  console.log(`  isUP         : ${result[2]}`);
  console.log(`  reputation   : ${result[3]}`);
  console.log(`  endorsements : ${result[4]}`);
  console.log(`  trustScore   : ${result[5]}`);
  console.log(`  name         : ${result[6]}`);

  console.log("\n🎉 Done! New registry address:", newAddress);
  console.log("Next: update frontend + SDK to point to new address.");
}

main().catch((err) => {
  console.error("Deploy failed:", err.message || err);
  process.exit(1);
});
