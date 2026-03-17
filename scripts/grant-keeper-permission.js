#!/usr/bin/env node
/**
 * Helper: Print instructions for agents to grant SETDATA permission
 * to the keeper address on their Universal Profile.
 *
 * Computes keeper address from KEEPER_PRIVATE_KEY and prints:
 * 1. The exact `cast send` command an agent can run
 * 2. Explanation of what the permission does
 *
 * Usage:
 *   KEEPER_PRIVATE_KEY=0x... node scripts/grant-keeper-permission.js
 *
 * ethers v6
 */

const { ethers } = require("ethers");

// LSP6 Key Manager permission constants
// SETDATA permission = bit 2^18 in the AddressPermissions:Permissions:<address> mapping
// See: https://docs.lukso.tech/standards/access-control/lsp6-key-manager#permissions
const PERMISSION_SETDATA = "0x0000000000000000000000000000000000000000000000000000000000040000";

// ERC725Y data key prefixes for LSP6 permissions
// AddressPermissions:Permissions:<address> = bytes16(keccak256("AddressPermissions:Permissions")) + bytes2(0) + bytes20(address)
const PERMISSIONS_PREFIX = "0x4b80742de2bf82acb3630000"; // first 12 bytes of keccak256("AddressPermissions:Permissions") + 0000

// AddressPermissions[] array length key
const PERMISSIONS_ARRAY_KEY = "0xdf30dba06db6a30e65354d9a64c609861f089545ca58c6b4dbe31a5f338cb0e3";

// AddressPermissions[index] — first 16 bytes of keccak256("AddressPermissions[]")
const PERMISSIONS_ARRAY_INDEX_PREFIX = "0xdf30dba06db6a30e65354d9a64c60986";

function main() {
  const privateKey = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: KEEPER_PRIVATE_KEY environment variable not set");
    console.error("Usage: KEEPER_PRIVATE_KEY=0x... node scripts/grant-keeper-permission.js");
    process.exit(1);
  }

  const keeperWallet = new ethers.Wallet(privateKey);
  const keeperAddress = keeperWallet.address;

  // Compute the permissions data key for this keeper address
  const permissionsKey = PERMISSIONS_PREFIX + keeperAddress.slice(2).toLowerCase();

  console.log("=== Universal Trust — Grant Keeper SETDATA Permission ===\n");
  console.log(`Keeper address: ${keeperAddress}`);
  console.log(`Permission:     SETDATA (write ERC725Y data keys)`);
  console.log(`Data key used:  AgentTrustScore = keccak256("AgentTrustScore")`);
  console.log("");

  console.log("─────────────────────────────────────────────────────────");
  console.log("WHAT THIS DOES:");
  console.log("─────────────────────────────────────────────────────────");
  console.log("The keeper periodically reads your trust score from the");
  console.log("Universal Trust registry and writes it to your Universal");
  console.log("Profile as an ERC725Y data key (AgentTrustScore).");
  console.log("");
  console.log("This makes your trust score visible on universaleverything.io");
  console.log("and any UP viewer — no API call needed.");
  console.log("");
  console.log("SETDATA permission ONLY allows writing data keys. It does NOT");
  console.log("allow transferring LYX, executing calls, or any other action.");
  console.log("");

  console.log("─────────────────────────────────────────────────────────");
  console.log("OPTION 1: Using cast (foundry)");
  console.log("─────────────────────────────────────────────────────────");
  console.log("");
  console.log("Step 1 — Read current array length:");
  console.log(`  cast call <YOUR_UP_ADDRESS> "getData(bytes32)(bytes)" ${PERMISSIONS_ARRAY_KEY} --rpc-url https://rpc.mainnet.lukso.network`);
  console.log("");
  console.log("Step 2 — Set permission + add to array (batch setData):");
  console.log("  Replace <N> with the current array length (e.g., if 3 controllers exist, N=3).");
  console.log("  Replace <YOUR_UP_ADDRESS> with your Universal Profile address.");
  console.log("");

  // Compute the array index key placeholder
  console.log(`  # Set the keeper's SETDATA permission`);
  console.log(`  cast send <YOUR_UP_ADDRESS> \\`);
  console.log(`    "setData(bytes32,bytes)" \\`);
  console.log(`    ${permissionsKey} \\`);
  console.log(`    ${PERMISSION_SETDATA} \\`);
  console.log(`    --rpc-url https://rpc.mainnet.lukso.network \\`);
  console.log(`    --private-key $AGENT_PRIVATE_KEY`);
  console.log("");
  console.log(`  # Add keeper to AddressPermissions[] array`);
  console.log(`  # Array index key = ${PERMISSIONS_ARRAY_INDEX_PREFIX} + uint128(<N>) as 16 bytes`);
  console.log(`  # For index 0: ${PERMISSIONS_ARRAY_INDEX_PREFIX}00000000000000000000000000000000`);
  console.log(`  # For index 1: ${PERMISSIONS_ARRAY_INDEX_PREFIX}00000000000000000000000000000001`);
  console.log(`  # For index 2: ${PERMISSIONS_ARRAY_INDEX_PREFIX}00000000000000000000000000000002`);
  console.log(`  # etc.`);
  console.log("");
  console.log(`  cast send <YOUR_UP_ADDRESS> \\`);
  console.log(`    "setData(bytes32,bytes)" \\`);
  console.log(`    ${PERMISSIONS_ARRAY_INDEX_PREFIX}<N_AS_32_HEX_CHARS> \\`);
  console.log(`    ${ethers.zeroPadValue(keeperAddress, 32)} \\`);
  console.log(`    --rpc-url https://rpc.mainnet.lukso.network \\`);
  console.log(`    --private-key $AGENT_PRIVATE_KEY`);
  console.log("");
  console.log(`  # Update array length (N+1, abi-encoded as uint256)`);
  console.log(`  cast send <YOUR_UP_ADDRESS> \\`);
  console.log(`    "setData(bytes32,bytes)" \\`);
  console.log(`    ${PERMISSIONS_ARRAY_KEY} \\`);
  console.log(`    <ABI_ENCODED_N_PLUS_1> \\`);
  console.log(`    --rpc-url https://rpc.mainnet.lukso.network \\`);
  console.log(`    --private-key $AGENT_PRIVATE_KEY`);
  console.log("");

  console.log("─────────────────────────────────────────────────────────");
  console.log("OPTION 2: Using ethers v6 (recommended)");
  console.log("─────────────────────────────────────────────────────────");
  console.log("");
  console.log(`const { ethers } = require("ethers");

const RPC = "https://rpc.mainnet.lukso.network";
const KEEPER = "${keeperAddress}";
const YOUR_UP = "<YOUR_UP_ADDRESS>";  // Replace with your UP

const provider = new ethers.JsonRpcProvider(RPC, 42);
const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);

const UP_ABI = [
  "function setData(bytes32 dataKey, bytes memory dataValue) external",
  "function setDataBatch(bytes32[] memory dataKeys, bytes[] memory dataValues) external",
  "function getData(bytes32 dataKey) external view returns (bytes memory)",
];

const up = new ethers.Contract(YOUR_UP, UP_ABI, wallet);
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

// Read current array length
const lengthBytes = await up.getData("${PERMISSIONS_ARRAY_KEY}");
const currentLength = lengthBytes === "0x"
  ? 0n
  : BigInt(lengthBytes);
const newLength = currentLength + 1n;

// Compute keys
const permKey = "${permissionsKey}";
const indexKey = "${PERMISSIONS_ARRAY_INDEX_PREFIX}" +
  currentLength.toString(16).padStart(32, "0");

// Batch setData: permission + array entry + new length
const tx = await up.setDataBatch(
  [
    permKey,
    indexKey,
    "${PERMISSIONS_ARRAY_KEY}",
  ],
  [
    "${PERMISSION_SETDATA}",
    ethers.zeroPadValue(KEEPER, 32),
    abiCoder.encode(["uint256"], [newLength]),
  ]
);
await tx.wait();
console.log("SETDATA permission granted to keeper:", KEEPER);
console.log("TX:", tx.hash);`);
  console.log("");

  console.log("─────────────────────────────────────────────────────────");
  console.log("OPTION 3: Via universaleverything.io (no code)");
  console.log("─────────────────────────────────────────────────────────");
  console.log("");
  console.log("1. Go to https://universaleverything.io/<YOUR_UP_ADDRESS>");
  console.log("2. Connect your UP controller");
  console.log("3. Go to Settings → Permissions → Add Controller");
  console.log(`4. Enter keeper address: ${keeperAddress}`);
  console.log("5. Enable ONLY the 'SETDATA' permission");
  console.log("6. Confirm the transaction");
  console.log("");

  console.log("─────────────────────────────────────────────────────────");
  console.log("SECURITY NOTE:");
  console.log("─────────────────────────────────────────────────────────");
  console.log("SETDATA only allows writing ERC725Y data keys.");
  console.log("It does NOT allow: transferring LYX, calling contracts,");
  console.log("changing permissions, or any other privileged action.");
  console.log("The keeper writes only the AgentTrustScore data key.");
}

main();
