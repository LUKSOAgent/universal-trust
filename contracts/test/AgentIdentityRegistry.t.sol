// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/AgentIdentityRegistry.sol";

contract AgentIdentityRegistryTest is Test {
    AgentIdentityRegistry public registry;

    address public deployer = address(0xDEAD);
    address public agentA = address(0xA);
    address public agentB = address(0xB);
    address public agentC = address(0xC);
    address public skillsRegistry = address(0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6);

    function setUp() public {
        vm.prank(deployer);
        registry = new AgentIdentityRegistry(skillsRegistry);
    }

    // ─── Registration ────────────────────────────────────────────────────────

    function test_register() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "I do code reviews", "ipfs://metadata-a");

        assertTrue(registry.isRegistered(agentA));
        assertEq(registry.getAgentCount(), 1);

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.name, "Agent Alpha");
        assertEq(agent.description, "I do code reviews");
        assertEq(agent.metadataURI, "ipfs://metadata-a");
        assertEq(agent.reputation, 100);
        assertEq(agent.endorsementCount, 0);
        assertTrue(agent.isActive);
    }

    function test_register_revert_emptyName() public {
        vm.prank(agentA);
        vm.expectRevert(AgentIdentityRegistry.EmptyName.selector);
        registry.register("", "description", "");
    }

    function test_register_revert_alreadyRegistered() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.AlreadyRegistered.selector, agentA));
        registry.register("Agent Alpha 2", "desc2", "");
    }

    function test_updateProfile() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(agentA);
        registry.updateProfile("Agent Alpha v2", "new desc", "ipfs://new");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.name, "Agent Alpha v2");
        assertEq(agent.description, "new desc");
        assertEq(agent.metadataURI, "ipfs://new");
    }

    function test_deactivateReactivate() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(agentA);
        registry.deactivate();

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertFalse(agent.isActive);

        vm.prank(agentA);
        registry.reactivate();

        agent = registry.getAgent(agentA);
        assertTrue(agent.isActive);
    }

    // ─── Reputation ──────────────────────────────────────────────────────────

    function test_updateReputation_increase() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(deployer);
        registry.updateReputation(agentA, 50, "Great work");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.reputation, 150);
    }

    function test_updateReputation_decrease() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(deployer);
        registry.updateReputation(agentA, -30, "Poor quality");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.reputation, 70);
    }

    function test_updateReputation_clampToZero() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(deployer);
        registry.updateReputation(agentA, -200, "Terrible");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.reputation, 0);
    }

    function test_updateReputation_capAtMax() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(deployer);
        registry.updateReputation(agentA, 99999, "God tier");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.reputation, 10000); // MAX_REPUTATION
    }

    function test_updateReputation_revert_unauthorized() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(agentB);
        vm.expectRevert(AgentIdentityRegistry.NotAuthorized.selector);
        registry.updateReputation(agentA, 10, "nope");
    }

    function test_setReputationUpdater() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(deployer);
        registry.setReputationUpdater(agentB, true);

        vm.prank(agentB);
        registry.updateReputation(agentA, 25, "Authorized update");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.reputation, 125);
    }

    // ─── Endorsements ────────────────────────────────────────────────────────

    function test_endorse() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");
        vm.prank(agentB);
        registry.register("Agent Beta", "desc", "");

        vm.prank(agentA);
        registry.endorse(agentB, "Great collaborator");

        assertTrue(registry.hasEndorsed(agentA, agentB));
        assertEq(registry.getEndorsementCount(agentB), 1);

        AgentIdentityRegistry.Endorsement memory e = registry.getEndorsement(agentA, agentB);
        assertEq(e.endorser, agentA);
        assertEq(e.endorsed, agentB);
        assertEq(e.reason, "Great collaborator");
    }

    function test_endorse_revert_self() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(agentA);
        vm.expectRevert(AgentIdentityRegistry.CannotEndorseSelf.selector);
        registry.endorse(agentA, "I'm great");
    }

    function test_endorse_revert_duplicate() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");
        vm.prank(agentB);
        registry.register("Agent Beta", "desc", "");

        vm.prank(agentA);
        registry.endorse(agentB, "First");

        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.AlreadyEndorsed.selector, agentA, agentB));
        registry.endorse(agentB, "Second");
    }

    function test_removeEndorsement() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");
        vm.prank(agentB);
        registry.register("Agent Beta", "desc", "");

        vm.prank(agentA);
        registry.endorse(agentB, "Great");

        vm.prank(agentA);
        registry.removeEndorsement(agentB);

        assertFalse(registry.hasEndorsed(agentA, agentB));
        assertEq(registry.getEndorsementCount(agentB), 0);
    }

    function test_multipleEndorsements() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");
        vm.prank(agentB);
        registry.register("Agent Beta", "desc", "");
        vm.prank(agentC);
        registry.register("Agent Charlie", "desc", "");

        vm.prank(agentA);
        registry.endorse(agentC, "Good");
        vm.prank(agentB);
        registry.endorse(agentC, "Reliable");

        assertEq(registry.getEndorsementCount(agentC), 2);

        address[] memory endorsers = registry.getEndorsers(agentC);
        assertEq(endorsers.length, 2);
    }

    // ─── Trust Score ─────────────────────────────────────────────────────────

    function test_trustScore() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");
        vm.prank(agentB);
        registry.register("Agent Beta", "desc", "");
        vm.prank(agentC);
        registry.register("Agent Charlie", "desc", "");

        // agentA starts with reputation=100, 0 endorsements → trust = 100
        assertEq(registry.getTrustScore(agentA), 100);

        // Endorse agentA twice → trust = 100 + (2 * 10) = 120
        vm.prank(agentB);
        registry.endorse(agentA, "");
        vm.prank(agentC);
        registry.endorse(agentA, "");

        assertEq(registry.getTrustScore(agentA), 120);

        // Increase reputation → trust = 200 + 20 = 220
        vm.prank(deployer);
        registry.updateReputation(agentA, 100, "bonus");

        assertEq(registry.getTrustScore(agentA), 220);
    }

    // ─── Verify ──────────────────────────────────────────────────────────────

    function test_verify_registered() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        (
            bool registered,
            bool active,
            bool isUP,
            uint256 reputation,
            uint256 endorsements,
            uint256 trustScore,
            string memory name
        ) = registry.verify(agentA);

        assertTrue(registered);
        assertTrue(active);
        assertFalse(isUP); // agentA is an EOA in tests
        assertEq(reputation, 100);
        assertEq(endorsements, 0);
        assertEq(trustScore, 100);
        assertEq(name, "Agent Alpha");
    }

    function test_verify_unregistered() public view {
        (
            bool registered,
            bool active,
            bool isUP,
            uint256 reputation,
            uint256 endorsements,
            uint256 trustScore,
            string memory name
        ) = registry.verify(address(0x999));

        assertFalse(registered);
        assertFalse(active);
        assertFalse(isUP);
        assertEq(reputation, 0);
        assertEq(endorsements, 0);
        assertEq(trustScore, 0);
        assertEq(name, "");
    }

    // ─── Pagination ──────────────────────────────────────────────────────────

    function test_getAgentsByPage() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");
        vm.prank(agentB);
        registry.register("B", "desc", "");
        vm.prank(agentC);
        registry.register("C", "desc", "");

        address[] memory page1 = registry.getAgentsByPage(0, 2);
        assertEq(page1.length, 2);
        assertEq(page1[0], agentA);
        assertEq(page1[1], agentB);

        address[] memory page2 = registry.getAgentsByPage(2, 2);
        assertEq(page2.length, 1);
        assertEq(page2[0], agentC);

        // Out of bounds
        address[] memory page3 = registry.getAgentsByPage(10, 2);
        assertEq(page3.length, 0);
    }

    // ─── Ownership ───────────────────────────────────────────────────────────

    function test_transferOwnership() public {
        vm.prank(deployer);
        registry.transferOwnership(agentA);

        assertEq(registry.owner(), agentA);
    }

    function test_transferOwnership_revert_notOwner() public {
        vm.prank(agentA);
        vm.expectRevert(AgentIdentityRegistry.NotAuthorized.selector);
        registry.transferOwnership(agentA);
    }

    // ─── Skills Registry Link ────────────────────────────────────────────────

    function test_skillsRegistryAddress() public view {
        assertEq(registry.skillsRegistry(), skillsRegistry);
    }

    // ─── Inactive agent cannot endorse ───────────────────────────────────────

    function test_endorse_revert_inactiveEndorser() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");
        vm.prank(agentB);
        registry.register("Agent Beta", "desc", "");

        vm.prank(agentA);
        registry.deactivate();

        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.AgentNotActive.selector, agentA));
        registry.endorse(agentB, "nope");
    }
}
