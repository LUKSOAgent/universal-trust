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

    // ═════════════════════════════════════════════════════════════════════════
    // Extended Edge Case Tests
    // ═════════════════════════════════════════════════════════════════════════

    // ─── Endorse inactive endorsed agent ─────────────────────────────────────

    function test_endorse_revert_inactiveEndorsed() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");
        vm.prank(agentB);
        registry.register("Agent Beta", "desc", "");

        // Deactivate the endorsed agent
        vm.prank(agentB);
        registry.deactivate();

        // Try to endorse a deactivated agent
        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.AgentNotActive.selector, agentB));
        registry.endorse(agentB, "nope");
    }

    // ─── updateProfile with empty name on already registered ─────────────────

    function test_updateProfile_revert_emptyName() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(agentA);
        vm.expectRevert(AgentIdentityRegistry.EmptyName.selector);
        registry.updateProfile("", "new desc", "ipfs://new");
    }

    // ─── getAgentsByPage with limit=0 ────────────────────────────────────────

    function test_getAgentsByPage_limitZero() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");

        address[] memory page = registry.getAgentsByPage(0, 0);
        assertEq(page.length, 0);
    }

    // ─── Swap-and-pop with 3+ endorsers ──────────────────────────────────────

    function test_removeEndorsement_swapAndPop_threeEndorsers() public {
        // Register 4 agents
        vm.prank(agentA);
        registry.register("A", "desc", "");
        vm.prank(agentB);
        registry.register("B", "desc", "");
        vm.prank(agentC);
        registry.register("C", "desc", "");

        address agentD = address(0xD);
        vm.prank(agentD);
        registry.register("D", "desc", "");

        // A, B, C all endorse D (endorsers array: [A, B, C])
        vm.prank(agentA);
        registry.endorse(agentD, "");
        vm.prank(agentB);
        registry.endorse(agentD, "");
        vm.prank(agentC);
        registry.endorse(agentD, "");

        assertEq(registry.getEndorsementCount(agentD), 3);

        // Remove A's endorsement (first element) → triggers swap with C (last)
        vm.prank(agentA);
        registry.removeEndorsement(agentD);

        assertEq(registry.getEndorsementCount(agentD), 2);
        assertFalse(registry.hasEndorsed(agentA, agentD));
        assertTrue(registry.hasEndorsed(agentB, agentD));
        assertTrue(registry.hasEndorsed(agentC, agentD));

        // Verify endorsers array integrity
        address[] memory endorsers = registry.getEndorsers(agentD);
        assertEq(endorsers.length, 2);

        // Remove B's endorsement (middle-ish)
        vm.prank(agentB);
        registry.removeEndorsement(agentD);

        assertEq(registry.getEndorsementCount(agentD), 1);
        assertTrue(registry.hasEndorsed(agentC, agentD));
        assertFalse(registry.hasEndorsed(agentB, agentD));

        // Remove last endorsement
        vm.prank(agentC);
        registry.removeEndorsement(agentD);

        assertEq(registry.getEndorsementCount(agentD), 0);
        address[] memory empty = registry.getEndorsers(agentD);
        assertEq(empty.length, 0);
    }

    // ─── verify() for deactivated agent ──────────────────────────────────────

    function test_verify_deactivated() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        vm.prank(agentA);
        registry.deactivate();

        (
            bool registered,
            bool active,
            ,
            uint256 reputation,
            uint256 endorsements,
            uint256 trustScore,
            string memory name
        ) = registry.verify(agentA);

        assertTrue(registered);
        assertFalse(active); // Key: registered but NOT active
        assertEq(reputation, 100);
        assertEq(endorsements, 0);
        assertEq(trustScore, 100);
        assertEq(name, "Agent Alpha");
    }

    // ─── lastActiveAt updates correctly ──────────────────────────────────────

    function test_lastActiveAt_updates() public {
        // Register at timestamp 1000
        vm.warp(1000);
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.lastActiveAt, 1000);
        assertEq(agent.registeredAt, 1000);

        // Update profile at timestamp 2000
        vm.warp(2000);
        vm.prank(agentA);
        registry.updateProfile("Alpha v2", "new", "");

        agent = registry.getAgent(agentA);
        assertEq(agent.lastActiveAt, 2000);

        // Register agentB for endorsement
        vm.prank(agentB);
        registry.register("Beta", "desc", "");

        // Endorse at timestamp 3000
        vm.warp(3000);
        vm.prank(agentA);
        registry.endorse(agentB, "good");

        agent = registry.getAgent(agentA);
        assertEq(agent.lastActiveAt, 3000);

        // Check endorsed agent's lastActiveAt also updated
        AgentIdentityRegistry.AgentIdentity memory endorsed = registry.getAgent(agentB);
        assertEq(endorsed.lastActiveAt, 3000);

        // Reputation update at timestamp 4000
        vm.warp(4000);
        vm.prank(deployer);
        registry.updateReputation(agentA, 10, "bonus");

        agent = registry.getAgent(agentA);
        assertEq(agent.lastActiveAt, 4000);

        // Reactivate at timestamp 5000
        vm.prank(agentA);
        registry.deactivate();

        vm.warp(5000);
        vm.prank(agentA);
        registry.reactivate();

        agent = registry.getAgent(agentA);
        assertEq(agent.lastActiveAt, 5000);
    }

    // ─── Fuzz: reputation clamping ───────────────────────────────────────────

    function testFuzz_reputationClamping(int256 delta) public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        // type(int256).min cannot be negated (overflow), so the contract
        // will revert with arithmetic overflow. This is expected behavior.
        if (delta == type(int256).min) {
            vm.prank(deployer);
            vm.expectRevert(); // arithmetic overflow on uint256(-delta)
            registry.updateReputation(agentA, delta, "fuzz");
            return;
        }

        vm.prank(deployer);
        registry.updateReputation(agentA, delta, "fuzz");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);

        // Reputation must always be in [0, MAX_REPUTATION]
        assertLe(agent.reputation, 10000);

        // Verify exact expected value
        if (delta > 0) {
            uint256 increase = uint256(delta);
            uint256 expected = 100 + increase > 10000 ? 10000 : 100 + increase;
            assertEq(agent.reputation, expected);
        } else if (delta < 0) {
            uint256 decrease = uint256(-delta);
            uint256 expected = decrease >= 100 ? 0 : 100 - decrease;
            assertEq(agent.reputation, expected);
        } else {
            assertEq(agent.reputation, 100);
        }
    }

    // ─── Gas snapshots ───────────────────────────────────────────────────────

    function test_gas_register() public {
        vm.prank(agentA);
        uint256 gasBefore = gasleft();
        registry.register("Agent Alpha", "A code review agent", "ipfs://QmTest");
        uint256 gasUsed = gasBefore - gasleft();
        emit log_named_uint("Gas: register", gasUsed);
        // Sanity check: registration should cost < 300k gas
        assertLt(gasUsed, 300000);
    }

    function test_gas_verify() public {
        vm.prank(agentA);
        registry.register("Agent Alpha", "desc", "");

        uint256 gasBefore = gasleft();
        registry.verify(agentA);
        uint256 gasUsed = gasBefore - gasleft();
        emit log_named_uint("Gas: verify", gasUsed);
        // verify() is a view, should be very cheap
        assertLt(gasUsed, 50000);
    }

    function test_gas_endorse() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");
        vm.prank(agentB);
        registry.register("B", "desc", "");

        vm.prank(agentA);
        uint256 gasBefore = gasleft();
        registry.endorse(agentB, "Good agent");
        uint256 gasUsed = gasBefore - gasleft();
        emit log_named_uint("Gas: endorse", gasUsed);
        assertLt(gasUsed, 200000);
    }

    // ─── removeEndorsement on non-existent endorsement ───────────────────────

    function test_removeEndorsement_revert_notEndorsed() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");
        vm.prank(agentB);
        registry.register("B", "desc", "");

        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotEndorsed.selector, agentA, agentB));
        registry.removeEndorsement(agentB);
    }

    // ─── Unregistered agent cannot update profile ────────────────────────────

    function test_updateProfile_revert_notRegistered() public {
        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotRegistered.selector, agentA));
        registry.updateProfile("name", "desc", "");
    }

    // ─── Unregistered agent cannot deactivate ────────────────────────────────

    function test_deactivate_revert_notRegistered() public {
        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotRegistered.selector, agentA));
        registry.deactivate();
    }

    // ─── Unregistered agents cannot endorse ──────────────────────────────────

    function test_endorse_revert_unregisteredEndorser() public {
        vm.prank(agentB);
        registry.register("B", "desc", "");

        vm.prank(agentA); // not registered
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotRegistered.selector, agentA));
        registry.endorse(agentB, "");
    }

    function test_endorse_revert_unregisteredEndorsed() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");

        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotRegistered.selector, agentB));
        registry.endorse(agentB, "");
    }

    // ─── Reputation update on unregistered agent ─────────────────────────────

    function test_updateReputation_revert_notRegistered() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotRegistered.selector, agentA));
        registry.updateReputation(agentA, 10, "nope");
    }

    // ─── getTrustScore revert on unregistered ────────────────────────────────

    function test_getTrustScore_revert_notRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotRegistered.selector, agentA));
        registry.getTrustScore(agentA);
    }

    // ─── getAgent revert on unregistered ─────────────────────────────────────

    function test_getAgent_revert_notRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(AgentIdentityRegistry.NotRegistered.selector, agentA));
        registry.getAgent(agentA);
    }

    // ─── setReputationUpdater then revoke ────────────────────────────────────

    function test_revokeReputationUpdater() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");

        // Grant then revoke
        vm.prank(deployer);
        registry.setReputationUpdater(agentB, true);

        vm.prank(deployer);
        registry.setReputationUpdater(agentB, false);

        // Now agentB should not be able to update
        vm.prank(agentB);
        vm.expectRevert(AgentIdentityRegistry.NotAuthorized.selector);
        registry.updateReputation(agentA, 10, "nope");
    }

    // ─── Zero delta reputation update ────────────────────────────────────────

    function test_updateReputation_zeroDelta() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");

        vm.prank(deployer);
        registry.updateReputation(agentA, 0, "no change");

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertEq(agent.reputation, 100);
    }

    // ─── Endorse after deactivate-reactivate cycle ─────────────────────────

    function test_endorse_afterDeactivateReactivate() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");
        vm.prank(agentB);
        registry.register("B", "desc", "");

        // Deactivate then reactivate agentA
        vm.prank(agentA);
        registry.deactivate();
        vm.prank(agentA);
        registry.reactivate();

        // Should be able to endorse after reactivation
        vm.prank(agentA);
        registry.endorse(agentB, "Back and endorsing");

        assertTrue(registry.hasEndorsed(agentA, agentB));
        assertEq(registry.getEndorsementCount(agentB), 1);
    }

    // ─── Re-endorse after removing endorsement ──────────────────────────────

    function test_reEndorse_afterRemoval() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");
        vm.prank(agentB);
        registry.register("B", "desc", "");

        // Endorse, remove, re-endorse
        vm.prank(agentA);
        registry.endorse(agentB, "First endorsement");

        vm.prank(agentA);
        registry.removeEndorsement(agentB);

        assertFalse(registry.hasEndorsed(agentA, agentB));
        assertEq(registry.getEndorsementCount(agentB), 0);

        // Re-endorse with a different reason
        vm.prank(agentA);
        registry.endorse(agentB, "Second endorsement");

        assertTrue(registry.hasEndorsed(agentA, agentB));
        assertEq(registry.getEndorsementCount(agentB), 1);

        AgentIdentityRegistry.Endorsement memory e = registry.getEndorsement(agentA, agentB);
        assertEq(e.reason, "Second endorsement");
    }

    // ─── Reactivate already active agent (no-op) ─────────────────────────────

    function test_reactivate_alreadyActive() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");

        vm.warp(2000);
        vm.prank(agentA);
        registry.reactivate(); // should not revert, just update lastActiveAt

        AgentIdentityRegistry.AgentIdentity memory agent = registry.getAgent(agentA);
        assertTrue(agent.isActive);
        assertEq(agent.lastActiveAt, 2000);
    }

    // ─── Deactivate already deactivated agent (no-op) ────────────────────────

    function test_deactivate_alreadyDeactivated() public {
        vm.prank(agentA);
        registry.register("A", "desc", "");

        vm.prank(agentA);
        registry.deactivate();

        vm.prank(agentA);
        registry.deactivate(); // should not revert

        assertFalse(registry.getAgent(agentA).isActive);
    }

    // ─── isReputationUpdater check ───────────────────────────────────────────

    function test_isReputationUpdater() public view {
        assertTrue(registry.isReputationUpdater(deployer));
        assertFalse(registry.isReputationUpdater(agentA));
    }
}
