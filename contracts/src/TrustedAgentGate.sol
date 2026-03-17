// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentIdentityRegistry {
    function getTrustScore(address agent) external view returns (uint256);
    function getWeightedTrustScore(address agent) external view returns (uint256);
    function isRegistered(address agent) external view returns (bool);
}

/**
 * @title TrustedAgentGate
 * @notice Inherit this contract to gate interactions to trusted agents only.
 * @dev Integrates with AgentIdentityRegistry for on-chain trust verification.
 *
 *      Usage:
 *        contract MyContract is TrustedAgentGate {
 *            constructor(address registry) TrustedAgentGate(registry) {}
 *            function doSomething() external onlyTrustedAgent(200) { ... }
 *        }
 */
abstract contract TrustedAgentGate {
    IAgentIdentityRegistry public immutable registry;

    error InsufficientTrustScore(address agent, uint256 required, uint256 actual);
    error AgentNotRegistered(address agent);

    constructor(address _registry) {
        require(_registry != address(0), "TrustedAgentGate: zero address");
        registry = IAgentIdentityRegistry(_registry);
    }

    /// @notice Gate a function to agents with at least `minScore` flat trust score.
    modifier onlyTrustedAgent(uint256 minScore) {
        _checkTrust(msg.sender, minScore, false);
        _;
    }

    /// @notice Gate a function to agents with at least `minScore` weighted trust score.
    /// @dev Weighted scores factor in endorser reputation — more accurate but more gas.
    modifier onlyWeightedTrustedAgent(uint256 minScore) {
        _checkTrust(msg.sender, minScore, true);
        _;
    }

    /**
     * @dev Internal trust check. Reverts if agent is not registered or score is insufficient.
     */
    function _checkTrust(address agent, uint256 minScore, bool weighted) internal view {
        if (!registry.isRegistered(agent)) revert AgentNotRegistered(agent);
        uint256 score = weighted
            ? registry.getWeightedTrustScore(agent)
            : registry.getTrustScore(agent);
        if (score < minScore) revert InsufficientTrustScore(agent, minScore, score);
    }

    /**
     * @notice Check if an agent meets a minimum flat trust score.
     * @param agent   The agent address to check.
     * @param minScore The minimum trust score required.
     * @return True if registered and score >= minScore.
     */
    function isTrustedAgent(address agent, uint256 minScore) external view returns (bool) {
        if (!registry.isRegistered(agent)) return false;
        return registry.getTrustScore(agent) >= minScore;
    }

    /**
     * @notice Check if an agent meets a minimum weighted trust score.
     * @param agent   The agent address to check.
     * @param minScore The minimum weighted trust score required.
     * @return True if registered and weighted score >= minScore.
     */
    function isWeightedTrustedAgent(address agent, uint256 minScore) external view returns (bool) {
        if (!registry.isRegistered(agent)) return false;
        return registry.getWeightedTrustScore(agent) >= minScore;
    }
}
