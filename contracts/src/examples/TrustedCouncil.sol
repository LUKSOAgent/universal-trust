// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../TrustedAgentGate.sol";

/**
 * @title TrustedCouncil
 * @notice Example contract: a council where only trusted agents can propose and vote.
 * @dev Demonstrates TrustedAgentGate usage with a minimum trust score of 200.
 */
contract TrustedCouncil is TrustedAgentGate {
    uint256 public constant MIN_TRUST_SCORE = 200;

    struct Proposal {
        string description;
        address proposer;
        uint256 votesFor;
        uint256 votesAgainst;
        uint64  createdAt;
        bool    executed;
    }

    Proposal[] public proposals;

    /// @dev proposalId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);

    error ProposalDoesNotExist(uint256 proposalId);
    error AlreadyVoted(uint256 proposalId, address voter);

    constructor(address _registry) TrustedAgentGate(_registry) {}

    /**
     * @notice Create a new proposal. Only agents with trust score >= 200.
     * @param description The proposal description.
     * @return proposalId The index of the newly created proposal.
     */
    function propose(string calldata description)
        external
        onlyTrustedAgent(MIN_TRUST_SCORE)
        returns (uint256 proposalId)
    {
        proposalId = proposals.length;
        proposals.push(Proposal({
            description: description,
            proposer: msg.sender,
            votesFor: 0,
            votesAgainst: 0,
            createdAt: uint64(block.timestamp),
            executed: false
        }));

        emit ProposalCreated(proposalId, msg.sender, description);
    }

    /**
     * @notice Vote on a proposal. Only agents with trust score >= 200.
     * @param proposalId The proposal to vote on.
     * @param support    True = for, false = against.
     */
    function vote(uint256 proposalId, bool support)
        external
        onlyTrustedAgent(MIN_TRUST_SCORE)
    {
        if (proposalId >= proposals.length) revert ProposalDoesNotExist(proposalId);
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted(proposalId, msg.sender);

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposals[proposalId].votesFor++;
        } else {
            proposals[proposalId].votesAgainst++;
        }

        emit Voted(proposalId, msg.sender, support);
    }

    /**
     * @notice Get the total number of proposals.
     */
    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }
}
