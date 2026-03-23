const { ethers } = require("ethers");

const LUKSO_RPC = "https://rpc.mainnet.lukso.network";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const UP_ADDRESS = "0x293E96ebbf264ed7715cff2b67850517De70232a";
const PROXY_ADDRESS = "0x16505FeC789F4553Ea88d812711A0E913D926ADD";
const NEW_IMPL = process.env.NEW_IMPL; // pass as env var

const UP_ABI = [
  "function execute(uint256 operationType, address target, uint256 value, bytes calldata data) external payable returns (bytes memory)"
];

const PROXY_ABI = [
  "function upgradeToAndCall(address newImplementation, bytes calldata data) external payable"
];

async function main() {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY env var required");
  if (!NEW_IMPL) throw new Error("NEW_IMPL env var required");

  const provider = new ethers.JsonRpcProvider(LUKSO_RPC);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const up = new ethers.Contract(UP_ADDRESS, UP_ABI, signer);

  // Encode upgradeToAndCall(newImpl, "") call
  const proxyInterface = new ethers.Interface(PROXY_ABI);
  const upgradeCalldata = proxyInterface.encodeFunctionData("upgradeToAndCall", [NEW_IMPL, "0x"]);

  console.log("Upgrading proxy to:", NEW_IMPL);
  console.log("Calldata:", upgradeCalldata);
  console.log("Sender:", signer.address);
  console.log("UP:", UP_ADDRESS);
  console.log("Proxy:", PROXY_ADDRESS);

  // Call UP.execute(CALL=0, proxy, 0, upgradeCalldata)
  const tx = await up.execute(0, PROXY_ADDRESS, 0, upgradeCalldata);
  console.log("Tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);
  console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
}

main().catch(console.error);
