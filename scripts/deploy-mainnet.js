#!/usr/bin/env node
/**
 * Deploy AgentIdentityRegistry to LUKSO mainnet
 * Uses ethers v6
 * 
 * NEVER hardcode private keys - reads from environment variable
 */
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC_URL = "https://rpc.mainnet.lukso.network";
const CHAIN_ID = 42;
const SKILLS_REGISTRY = "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6";

// Agent to register after deployment
const LUKSO_AGENT_UP = "0x293E96ebbf264ed7715cff2b67850517De70232a";
const LUKSO_AGENT_NAME = "LUKSO Agent";
const LUKSO_AGENT_DESC = "AI agent operating on LUKSO with a Universal Profile. Expert in LSP standards, token operations, and blockchain interactions.";
const LUKSO_AGENT_METADATA = "";

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  // Load ABI and bytecode from Foundry output
  const artifactPath = path.join(__dirname, "..", "contracts", "out", "AgentIdentityRegistry.sol", "AgentIdentityRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode.object;

  console.log("Connecting to LUKSO mainnet...");
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} LYX`);

  if (balance === 0n) {
    console.error("ERROR: No LYX balance for deployment");
    process.exit(1);
  }

  // Deploy
  console.log("\nDeploying AgentIdentityRegistry...");
  console.log(`Skills Registry (constructor arg): ${SKILLS_REGISTRY}`);
  
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(SKILLS_REGISTRY);
  
  console.log(`TX hash: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  
  await contract.waitForDeployment();
  const deployedAddress = await contract.getAddress();
  
  console.log(`\n✅ AgentIdentityRegistry deployed at: ${deployedAddress}`);
  console.log(`   Block explorer: https://explorer.execution.mainnet.lukso.network/address/${deployedAddress}`);

  // Save deployed address
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  const addresses = {
    network: "lukso-mainnet",
    chainId: CHAIN_ID,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      AgentIdentityRegistry: deployedAddress,
      AgentSkillsRegistry: SKILLS_REGISTRY
    }
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`\nSaved to deployed-addresses.json`);

  // Register the LUKSO Agent
  console.log(`\nRegistering LUKSO Agent (${LUKSO_AGENT_UP})...`);
  
  // The register function requires msg.sender == agent, but we're deploying from EOA
  // We need to use the owner functions instead, or register from the EOA wallet
  // Since the contract uses self-registration (msg.sender becomes the agent),
  // we'll register the deployer EOA as the LUKSO Agent for now
  // NOTE: The UP would need to call register() itself via KeyManager
  
  // Actually, let's register the wallet (deployer) as "LUKSO Agent" 
  // since the UP needs to call register() via its own KeyManager
  console.log("Registering deployer EOA as LUKSO Agent...");
  const registerTx = await contract.register(
    LUKSO_AGENT_NAME,
    LUKSO_AGENT_DESC,
    LUKSO_AGENT_METADATA
  );
  await registerTx.wait();
  console.log(`✅ Registered deployer as "${LUKSO_AGENT_NAME}"`);
  
  // Verify
  const verifyResult = await contract.verify(wallet.address);
  console.log("\nVerification result:");
  console.log(`  registered: ${verifyResult[0]}`);
  console.log(`  active: ${verifyResult[1]}`);
  console.log(`  isUP: ${verifyResult[2]}`);
  console.log(`  reputation: ${verifyResult[3]}`);
  console.log(`  endorsements: ${verifyResult[4]}`);
  console.log(`  trustScore: ${verifyResult[5]}`);
  console.log(`  name: ${verifyResult[6]}`);

  console.log("\n🎉 Deployment complete!");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
