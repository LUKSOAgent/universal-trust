// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TrustedAgentGate.sol";
import "../src/examples/TrustedCouncil.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Mock Registry — simulates AgentIdentityRegistry for unit tests
// ─────────────────────────────────────────────────────────────────────────────

contract MockRegistry {
    mapping(address => uint256) public flatScores;
    mapping(address => uint256) public weightedScores;
    mapping(address => bool)    public registered;

    function setAgent(address agent, uint256 flatScore, uint256 weightedScore) external {
        flatScores[agent] = flatScore;
        weightedScores[agent] = weightedScore;
        registered[agent] = true;
    }

    function getTrustScore(address agent) external view returns (uint256) {
        return flatScores[agent];
    }

    function getWeightedTrustScore(address agent) external view returns (uint256) {
        return weightedScores[agent];
    }

    function isRegistered(address agent) external view returns (bool) {
        return registered[agent];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Concrete contract for testing the abstract TrustedAgentGate
// ─────────────────────────────────────────────────────────────────────────────

contract SimpleGatedContract is TrustedAgentGate {
    uint256 public counter;

    constructor(address _registry) TrustedAgentGate(_registry) {}

    function incrementFlat(uint256 minScore) external onlyTrustedAgent(minScore) {
        counter++;
    }

    function incrementWeighted(uint256 minScore) external onlyWeightedTrustedAgent(minScore) {
        counter++;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

contract TrustedAgentGateTest is Test {
    MockRegistry        public mockRegistry;
    SimpleGatedContract public gated;
    TrustedCouncil      public council;

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address eve   = makeAddr("eve"); // not registered

    function setUp() public {
        mockRegistry = new MockRegistry();

        // alice: high trust (flat 300, weighted 500)
        mockRegistry.setAgent(alice, 300, 500);

        // bob: low trust (flat 50, weighted 80)
        mockRegistry.setAgent(bob, 50, 80);

        // eve: never registered

        gated   = new SimpleGatedContract(address(mockRegistry));
        council = new TrustedCouncil(address(mockRegistry));
    }

    // ─── TrustedAgentGate: onlyTrustedAgent ─────────────────────────────

    function test_flatGate_sufficientScore_passes() public {
        vm.prank(alice);
        gated.incrementFlat(200);
        assertEq(gated.counter(), 1);
    }

    function test_flatGate_insufficientScore_reverts() public {
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                TrustedAgentGate.InsufficientTrustScore.selector,
                bob, 200, 50
            )
        );
        gated.incrementFlat(200);
    }

    function test_flatGate_notRegistered_reverts() public {
        vm.prank(eve);
        vm.expectRevert(
            abi.encodeWithSelector(TrustedAgentGate.AgentNotRegistered.selector, eve)
        );
        gated.incrementFlat(100);
    }

    // ─── TrustedAgentGate: onlyWeightedTrustedAgent ─────────────────────

    function test_weightedGate_sufficientScore_passes() public {
        vm.prank(alice);
        gated.incrementWeighted(400);
        assertEq(gated.counter(), 1);
    }

    function test_weightedGate_insufficientScore_reverts() public {
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                TrustedAgentGate.InsufficientTrustScore.selector,
                bob, 200, 80
            )
        );
        gated.incrementWeighted(200);
    }

    function test_weightedGate_notRegistered_reverts() public {
        vm.prank(eve);
        vm.expectRevert(
            abi.encodeWithSelector(TrustedAgentGate.AgentNotRegistered.selector, eve)
        );
        gated.incrementWeighted(100);
    }

    // ─── isTrustedAgent view ────────────────────────────────────────────

    function test_isTrustedAgent_true() public view {
        assertTrue(gated.isTrustedAgent(alice, 200));
    }

    function test_isTrustedAgent_false_lowScore() public view {
        assertFalse(gated.isTrustedAgent(bob, 200));
    }

    function test_isTrustedAgent_false_notRegistered() public view {
        assertFalse(gated.isTrustedAgent(eve, 1));
    }

    // ─── isWeightedTrustedAgent view ────────────────────────────────────

    function test_isWeightedTrustedAgent_true() public view {
        assertTrue(gated.isWeightedTrustedAgent(alice, 500));
    }

    function test_isWeightedTrustedAgent_false() public view {
        assertFalse(gated.isWeightedTrustedAgent(bob, 200));
    }

    // ─── Constructor edge cases ─────────────────────────────────────────

    function test_constructor_zeroAddress_reverts() public {
        vm.expectRevert("TrustedAgentGate: zero address");
        new SimpleGatedContract(address(0));
    }

    function test_registryAddress_stored() public view {
        assertEq(address(gated.registry()), address(mockRegistry));
    }

    // ─── TrustedCouncil: propose ────────────────────────────────────────

    function test_council_propose_trustedAgent() public {
        vm.prank(alice);
        uint256 id = council.propose("Fund the DAO");
        assertEq(id, 0);
        assertEq(council.proposalCount(), 1);
    }

    function test_council_propose_untrustedAgent_reverts() public {
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                TrustedAgentGate.InsufficientTrustScore.selector,
                bob, 200, 50
            )
        );
        council.propose("Drain the DAO");
    }

    function test_council_propose_unregistered_reverts() public {
        vm.prank(eve);
        vm.expectRevert(
            abi.encodeWithSelector(TrustedAgentGate.AgentNotRegistered.selector, eve)
        );
        council.propose("Hack the DAO");
    }

    // ─── TrustedCouncil: vote ───────────────────────────────────────────

    function test_council_vote_trustedAgent() public {
        vm.prank(alice);
        council.propose("Upgrade the contract");

        vm.prank(alice);
        council.vote(0, true);

        (, , uint256 votesFor, , , ) = council.proposals(0);
        assertEq(votesFor, 1);
    }

    function test_council_vote_untrustedAgent_reverts() public {
        vm.prank(alice);
        council.propose("Upgrade the contract");

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                TrustedAgentGate.InsufficientTrustScore.selector,
                bob, 200, 50
            )
        );
        council.vote(0, true);
    }

    function test_council_vote_doubleVote_reverts() public {
        vm.prank(alice);
        council.propose("Upgrade the contract");

        vm.prank(alice);
        council.vote(0, true);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(TrustedCouncil.AlreadyVoted.selector, 0, alice)
        );
        council.vote(0, true);
    }

    function test_council_vote_nonexistentProposal_reverts() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(TrustedCouncil.ProposalDoesNotExist.selector, 99)
        );
        council.vote(99, true);
    }

    function test_council_vote_against() public {
        vm.prank(alice);
        council.propose("Bad idea");

        vm.prank(alice);
        council.vote(0, false);

        (, , , uint256 votesAgainst, , ) = council.proposals(0);
        assertEq(votesAgainst, 1);
    }
}
