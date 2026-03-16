// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/AgentIdentityRegistry.sol";

/**
 * @title DeployIdentityRegistry
 * @notice Deploy AgentIdentityRegistry behind a UUPS proxy to LUKSO mainnet.
 *         The proxy address is permanent. The implementation can be upgraded
 *         by the owner without losing any state.
 *
 * @dev Run with:
 *   PRIVATE_KEY=0x... forge script script/DeployIdentityRegistry.s.sol:DeployIdentityRegistry \
 *     --rpc-url https://rpc.mainnet.lukso.network \
 *     --broadcast
 */
contract DeployIdentityRegistry is Script {

    address constant SKILLS_REGISTRY = 0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6;
    address constant AGENT_UP        = 0x293E96ebbf264ed7715cff2b67850517De70232a;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== AgentIdentityRegistry UUPS Proxy Deployment ===");
        console.log("Deployer:        ", deployer);
        console.log("Chain ID:        ", block.chainid);
        console.log("Skills Registry: ", SKILLS_REGISTRY);
        console.log("Owner (agent UP):", AGENT_UP);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation (no constructor args — disabled initializers)
        AgentIdentityRegistry impl = new AgentIdentityRegistry();
        console.log("Implementation:  ", address(impl));

        // 2. Encode initialize() call for the proxy
        bytes memory initData = abi.encodeCall(
            AgentIdentityRegistry.initialize,
            (SKILLS_REGISTRY, AGENT_UP)
        );

        // 3. Deploy ERC1967 proxy pointing to implementation, call initialize()
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        console.log("Proxy (use this):", address(proxy));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("Proxy (permanent address):", address(proxy));
        console.log("Implementation:            ", address(impl));
        console.log("Owner:                     ", AGENT_UP);
        console.log("Skills Registry:           ", SKILLS_REGISTRY);
    }
}
