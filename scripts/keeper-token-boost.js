const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const BASE_RPC = "https://mainnet.base.org";
const LUKSO_RPC = "https://rpc.mainnet.lukso.network";
const TOKEN_ADDRESS = "0x81040cfd2bb62062525d958aD01931988a590B07";
const REGISTRY_ADDRESS = "0x16505FeC789F4553Ea88d812711A0E913D926ADD";
const UP_ADDRESS = "0x293E96ebbf264ed7715cff2b67850517De70232a";
const TOKEN_BOOST = 50;
const STATE_FILE = path.join(__dirname, ".token-boost-state.json");

const ERC20_ABI = ["function balanceOf(address) external view returns (uint256)"];
const REGISTRY_ABI = [
  "function getAgentCount() external view returns (uint256)",
  "function getAgentsByPage(uint256 offset, uint256 limit) external view returns (address[])",
  "function getAgent(address agent) external view returns (tuple(string name, string description, string metadataURI, uint256 reputation, uint256 endorsementCount, uint64 registeredAt, uint64 lastActiveAt, bool isActive))",
  "function updateReputation(address agent, int256 delta, string calldata reason) external"
];
const UP_ABI = [
  "function execute(uint256 operationType, address target, uint256 value, bytes calldata data) external payable returns (bytes memory)"
];

function loadState() {
  if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  return { boostedAgents: [], lastRun: null };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey && !dryRun) { console.error("PRIVATE_KEY required"); process.exit(1); }

  const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
  const luksoProvider = new ethers.JsonRpcProvider(LUKSO_RPC);
  const signer = privateKey ? new ethers.Wallet(privateKey, luksoProvider) : null;

  const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, baseProvider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, luksoProvider);
  const up = signer ? new ethers.Contract(UP_ADDRESS, UP_ABI, signer) : null;

  const state = loadState();
  const alreadyBoosted = new Set(state.boostedAgents.map(a => a.toLowerCase()));

  console.log(`[${dryRun ? "DRY RUN" : "LIVE"}] Checking agents for Base token balance...`);

  // Get all agents
  const count = await registry.getAgentCount();
  console.log(`Total agents: ${count}`);
  const addresses = await registry.getAgentsByPage(0, Number(count));

  let boosted = 0;
  for (const addr of addresses) {
    const agentData = await registry.getAgent(addr);
    if (alreadyBoosted.has(addr.toLowerCase())) {
      console.log(`  ${addr} — already boosted, skip`);
      continue;
    }
    let balance;
    try {
      balance = await token.balanceOf(addr);
    } catch (e) {
      console.log(`  ${addr} — balance check failed: ${e.message}`);
      continue;
    }
    if (balance === 0n) {
      console.log(`  ${addr} — no token balance`);
      continue;
    }
    console.log(`  ${addr} — holds ${ethers.formatUnits(balance, 18)} tokens → boost +${TOKEN_BOOST}`);
    if (!dryRun) {
      const registryInterface = new ethers.Interface(REGISTRY_ABI);
      const calldata = registryInterface.encodeFunctionData("updateReputation", [addr, TOKEN_BOOST, "LUKSO Fan Token holder on Base"]);
      const tx = await up.execute(0, REGISTRY_ADDRESS, 0, calldata);
      console.log(`    Tx: ${tx.hash}`);
      await tx.wait();
      console.log(`    Confirmed!`);
      state.boostedAgents.push(addr);
      boosted++;
    } else {
      boosted++;
    }
  }

  state.lastRun = new Date().toISOString();
  if (!dryRun) saveState(state);

  console.log(`\nDone. ${boosted} agent(s) ${dryRun ? "would be" : "were"} boosted.`);
}

main().catch(console.error);
