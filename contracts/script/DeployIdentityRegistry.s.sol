// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/AgentIdentityRegistry.sol";

/**
 * @title DeployIdentityRegistry
 * @notice Deploy AgentIdentityRegistry to LUKSO mainnet
 * @dev Run with:
 *   forge script script/DeployIdentityRegistry.s.sol:DeployIdentityRegistry \
 *     --rpc-url https://rpc.mainnet.lukso.network \
 *     --broadcast \
 *     --verify
 */
contract DeployIdentityRegistry is Script {

    // Already deployed on LUKSO mainnet
    address constant SKILLS_REGISTRY = 0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6;

    // Agent Universal Profile (will be added as reputation updater)
    address constant AGENT_UP = 0x293E96ebbf264ed7715cff2b67850517De70232a;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== AgentIdentityRegistry Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Skills Registry:", SKILLS_REGISTRY);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy
        AgentIdentityRegistry registry = new AgentIdentityRegistry(SKILLS_REGISTRY);
        console.log("AgentIdentityRegistry deployed at:", address(registry));

        // Add the agent UP as a reputation updater
        registry.setReputationUpdater(AGENT_UP, true);
        console.log("Added Agent UP as reputation updater:", AGENT_UP);

        // Transfer ownership to the agent UP
        registry.transferOwnership(AGENT_UP);
        console.log("Ownership transferred to:", AGENT_UP);

        vm.stopBroadcast();

        // Output summary
        console.log("\n=== Deployment Summary ===");
        console.log("AgentIdentityRegistry:", address(registry));
        console.log("Skills Registry (linked):", SKILLS_REGISTRY);
        console.log("Owner:", AGENT_UP);

        // Write deployment info
        string memory deploymentInfo = string(abi.encodePacked(
            "{\n",
            '  "contract": "AgentIdentityRegistry",\n',
            '  "address": "', vm.toString(address(registry)), '",\n',
            '  "skillsRegistry": "', vm.toString(SKILLS_REGISTRY), '",\n',
            '  "owner": "', vm.toString(AGENT_UP), '",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "timestamp": ', vm.toString(block.timestamp), '\n',
            "}"
        ));

        vm.writeFile("deployments/AgentIdentityRegistry.json", deploymentInfo);
    }
}
