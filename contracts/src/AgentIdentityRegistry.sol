// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AgentIdentityRegistry
 * @author LUKSO Agent (0x293E96ebbf264ed7715cff2b67850517De70232a)
 * @notice On-chain identity and trust layer for AI agents on LUKSO.
 *         Agents register with their address, build reputation through
 *         verifiable on-chain actions, and establish trust through
 *         peer endorsements.
 *
 * @dev UUPS upgradeable (EIP-1967). The proxy address is permanent;
 *      only the implementation can be swapped via upgradeToAndCall().
 *      Owner is the LUKSO Agent Universal Profile.
 */
contract AgentIdentityRegistry is Initializable, UUPSUpgradeable {

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public constant INITIAL_REPUTATION = 100;
    uint256 public constant MAX_REPUTATION = 10000;

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The deployed AgentSkillsRegistry on LUKSO mainnet
    /// @dev Stored as regular state var (not immutable) for upgradeability
    address public skillsRegistry;

    /// @notice Owner of the registry
    address public owner;

    /// @dev agent address => identity data
    mapping(address => AgentIdentity) private _agents;

    /// @dev Ordered list of all registered agent addresses
    address[] private _agentList;

    /// @dev agent address => index+1 in _agentList (0 = not registered)
    mapping(address => uint256) private _agentIndex;

    /// @dev endorser => endorsed => Endorsement
    mapping(address => mapping(address => Endorsement)) private _endorsements;

    /// @dev endorsed => list of endorser addresses
    mapping(address => address[]) private _endorsers;

    /// @dev endorsed => endorser => index+1 in _endorsers (0 = not present)
    mapping(address => mapping(address => uint256)) private _endorserIndex;

    /// @dev Addresses authorized to update reputation
    mapping(address => bool) private _reputationUpdaters;

    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    struct AgentIdentity {
        string  name;
        string  description;
        string  metadataURI;
        uint256 reputation;
        uint256 endorsementCount;
        uint64  registeredAt;
        uint64  lastActiveAt;
        bool    isActive;
    }

    struct Endorsement {
        address endorser;
        address endorsed;
        uint64  timestamp;
        string  reason;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent, string name, string description, uint64 timestamp);
    event AgentUpdated(address indexed agent, string name, string description, string metadataURI, uint64 timestamp);
    event AgentDeactivated(address indexed agent, uint64 timestamp);
    event AgentReactivated(address indexed agent, uint64 timestamp);
    event ReputationUpdated(address indexed agent, uint256 oldReputation, uint256 newReputation, int256 delta, string reason);
    event EndorsementAdded(address indexed endorser, address indexed endorsed, string reason, uint64 timestamp);
    event EndorsementRemoved(address indexed endorser, address indexed endorsed, uint64 timestamp);
    event ReputationUpdaterSet(address indexed updater, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error AlreadyRegistered(address agent);
    error NotRegistered(address agent);
    error EmptyName();
    error CannotEndorseSelf();
    error AlreadyEndorsed(address endorser, address endorsed);
    error NotEndorsed(address endorser, address endorsed);
    error NotAuthorized();
    error AgentNotActive(address agent);
    error EndorserMustBeUniversalProfile(address endorser);

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyRegistered(address agent) {
        if (_agentIndex[agent] == 0) revert NotRegistered(agent);
        _;
    }

    modifier onlyActive(address agent) {
        if (!_agents[agent].isActive) revert AgentNotActive(agent);
        _;
    }

    modifier onlyReputationUpdater() {
        if (!_reputationUpdaters[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Initializer (replaces constructor for upgradeable contracts)
    // ─────────────────────────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the registry. Called once by the proxy on deployment.
     * @param _skillsRegistry Address of the deployed AgentSkillsRegistry
     * @param _owner          Initial owner (should be the agent UP)
     */
    function initialize(address _skillsRegistry, address _owner) external initializer {
        skillsRegistry = _skillsRegistry;
        owner = _owner;
        _reputationUpdaters[_owner] = true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UUPS upgrade authorization — only owner can upgrade
    // ─────────────────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address newImplementation) internal override {
        if (msg.sender != owner) revert NotAuthorized();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Registration
    // ─────────────────────────────────────────────────────────────────────────

    function register(
        string calldata name,
        string calldata description,
        string calldata metadataURI
    ) external {
        if (bytes(name).length == 0) revert EmptyName();
        if (_agentIndex[msg.sender] != 0) revert AlreadyRegistered(msg.sender);

        uint64 ts = uint64(block.timestamp);

        _agents[msg.sender] = AgentIdentity({
            name:             name,
            description:      description,
            metadataURI:      metadataURI,
            reputation:       INITIAL_REPUTATION,
            endorsementCount: 0,
            registeredAt:     ts,
            lastActiveAt:     ts,
            isActive:         true
        });

        _agentList.push(msg.sender);
        _agentIndex[msg.sender] = _agentList.length;

        emit AgentRegistered(msg.sender, name, description, ts);
    }

    function updateProfile(
        string calldata name,
        string calldata description,
        string calldata metadataURI
    ) external onlyRegistered(msg.sender) {
        if (bytes(name).length == 0) revert EmptyName();

        AgentIdentity storage agent = _agents[msg.sender];
        agent.name = name;
        agent.description = description;
        agent.metadataURI = metadataURI;
        agent.lastActiveAt = uint64(block.timestamp);

        emit AgentUpdated(msg.sender, name, description, metadataURI, uint64(block.timestamp));
    }

    function deactivate() external onlyRegistered(msg.sender) {
        _agents[msg.sender].isActive = false;
        emit AgentDeactivated(msg.sender, uint64(block.timestamp));
    }

    function reactivate() external onlyRegistered(msg.sender) {
        _agents[msg.sender].isActive = true;
        _agents[msg.sender].lastActiveAt = uint64(block.timestamp);
        emit AgentReactivated(msg.sender, uint64(block.timestamp));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reputation
    // ─────────────────────────────────────────────────────────────────────────

    function updateReputation(
        address agent,
        int256 delta,
        string calldata reason
    ) external onlyReputationUpdater onlyRegistered(agent) {
        AgentIdentity storage a = _agents[agent];
        uint256 oldRep = a.reputation;

        if (delta > 0) {
            uint256 increase = uint256(delta);
            a.reputation = a.reputation + increase > MAX_REPUTATION
                ? MAX_REPUTATION
                : a.reputation + increase;
        } else if (delta < 0) {
            uint256 decrease = uint256(-delta);
            a.reputation = decrease >= a.reputation ? 0 : a.reputation - decrease;
        }

        a.lastActiveAt = uint64(block.timestamp);
        emit ReputationUpdated(agent, oldRep, a.reputation, delta, reason);
    }

    function setReputationUpdater(address updater, bool authorized) external onlyOwner {
        _reputationUpdaters[updater] = authorized;
        emit ReputationUpdaterSet(updater, authorized);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Endorsements
    // ─────────────────────────────────────────────────────────────────────────

    function endorse(
        address endorsed,
        string calldata reason
    ) external onlyRegistered(endorsed) onlyActive(endorsed) {
        if (!isUniversalProfile(msg.sender)) revert EndorserMustBeUniversalProfile(msg.sender);
        if (msg.sender == endorsed) revert CannotEndorseSelf();
        if (_endorserIndex[endorsed][msg.sender] != 0) revert AlreadyEndorsed(msg.sender, endorsed);

        uint64 ts = uint64(block.timestamp);

        _endorsements[msg.sender][endorsed] = Endorsement({
            endorser:  msg.sender,
            endorsed:  endorsed,
            timestamp: ts,
            reason:    reason
        });

        _endorsers[endorsed].push(msg.sender);
        _endorserIndex[endorsed][msg.sender] = _endorsers[endorsed].length;

        _agents[endorsed].endorsementCount++;
        _agents[endorsed].lastActiveAt = ts;

        emit EndorsementAdded(msg.sender, endorsed, reason, ts);
    }

    function removeEndorsement(address endorsed) external {
        if (_endorserIndex[endorsed][msg.sender] == 0) revert NotEndorsed(msg.sender, endorsed);

        address[] storage endorsers = _endorsers[endorsed];
        uint256 idx = _endorserIndex[endorsed][msg.sender] - 1;
        uint256 lastIdx = endorsers.length - 1;

        if (idx != lastIdx) {
            address lastEndorser = endorsers[lastIdx];
            endorsers[idx] = lastEndorser;
            _endorserIndex[endorsed][lastEndorser] = idx + 1;
        }

        endorsers.pop();
        delete _endorserIndex[endorsed][msg.sender];
        delete _endorsements[msg.sender][endorsed];

        _agents[endorsed].endorsementCount--;
        emit EndorsementRemoved(msg.sender, endorsed, uint64(block.timestamp));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Trust Score
    // ─────────────────────────────────────────────────────────────────────────

    function getTrustScore(address agent) external view onlyRegistered(agent) returns (uint256) {
        AgentIdentity storage a = _agents[agent];
        uint256 score = a.reputation + (a.endorsementCount * 10);
        return score > MAX_REPUTATION ? MAX_REPUTATION : score;
    }

    /**
     * @notice Weighted trust score — endorsements from high-reputation agents
     *         count more than those from low-reputation agents.
     *         endorserWeight(e) = clamp(endorser.reputation / 10, 10, 50)
     * @param agent The agent address to compute the score for
     * @return The weighted trust score, capped at MAX_REPUTATION
     */
    function getWeightedTrustScore(address agent) external view onlyRegistered(agent) returns (uint256) {
        return _computeWeightedTrustScore(agent);
    }

    function _computeWeightedTrustScore(address agent) internal view returns (uint256) {
        AgentIdentity storage a = _agents[agent];
        uint256 score = a.reputation;

        address[] storage endorsers = _endorsers[agent];
        uint256 len = endorsers.length;
        for (uint256 i = 0; i < len; i++) {
            address endorser = endorsers[i];
            uint256 endorserRep = _agents[endorser].reputation;
            uint256 weight = endorserRep / 10;
            if (weight < 10) weight = 10;
            if (weight > 50) weight = 50;
            score += weight;
        }

        return score > MAX_REPUTATION ? MAX_REPUTATION : score;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Universal Profile Detection
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Detect if an address is a LUKSO Universal Profile.
     *         Multi-strategy to support all deployed UP versions:
     *         1. LSP0 interface ID 0x24871b3a
     *         2. ERC725Y interface ID 0x629aa694
     *         3. Duck-type: getData(bytes32(0)) doesn't revert
     */
    function isUniversalProfile(address account) public view returns (bool) {
        if (account.code.length == 0) return false;

        try IERC165(account).supportsInterface(0x24871b3a) returns (bool supported) {
            if (supported) return true;
        } catch {}

        try IERC165(account).supportsInterface(0x629aa694) returns (bool supported) {
            if (supported) return true;
        } catch {}

        try IERC725Y(account).getData(bytes32(0)) returns (bytes memory) {
            return true;
        } catch {}

        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read Functions
    // ─────────────────────────────────────────────────────────────────────────

    function getAgent(address agent) external view onlyRegistered(agent) returns (AgentIdentity memory) {
        return _agents[agent];
    }

    function isRegistered(address agent) external view returns (bool) {
        return _agentIndex[agent] != 0;
    }

    function getAgentCount() external view returns (uint256) {
        return _agentList.length;
    }

    function getAgentsByPage(uint256 offset, uint256 limit) external view returns (address[] memory) {
        if (offset >= _agentList.length) return new address[](0);

        uint256 end = offset + limit;
        if (end > _agentList.length) end = _agentList.length;

        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = _agentList[i];
        }
        return result;
    }

    function getEndorsement(address endorser, address endorsed) external view returns (Endorsement memory) {
        return _endorsements[endorser][endorsed];
    }

    function hasEndorsed(address endorser, address endorsed) external view returns (bool) {
        return _endorserIndex[endorsed][endorser] != 0;
    }

    function getEndorsers(address agent) external view returns (address[] memory) {
        return _endorsers[agent];
    }

    function getEndorsementCount(address agent) external view returns (uint256) {
        return _endorsers[agent].length;
    }

    function isReputationUpdater(address account) external view returns (bool) {
        return _reputationUpdaters[account];
    }

    function verify(address agent) external view returns (
        bool registered,
        bool active,
        bool isUP,
        uint256 reputation,
        uint256 endorsements,
        uint256 trustScore,
        string memory name
    ) {
        registered = _agentIndex[agent] != 0;
        if (!registered) return (false, false, false, 0, 0, 0, "");

        AgentIdentity storage a = _agents[agent];
        active = a.isActive;
        isUP = isUniversalProfile(agent);
        reputation = a.reputation;
        endorsements = a.endorsementCount;
        trustScore = reputation + (endorsements * 10);
        if (trustScore > MAX_REPUTATION) trustScore = MAX_REPUTATION;
        name = a.name;
    }

    function verifyV2(address agent) external view returns (
        bool registered,
        bool active,
        bool isUP,
        uint256 reputation,
        uint256 endorsements,
        uint256 trustScore,
        string memory name,
        uint256 weightedTrustScore
    ) {
        registered = _agentIndex[agent] != 0;
        if (!registered) return (false, false, false, 0, 0, 0, "", 0);

        AgentIdentity storage a = _agents[agent];
        active = a.isActive;
        isUP = isUniversalProfile(agent);
        reputation = a.reputation;
        endorsements = a.endorsementCount;
        trustScore = reputation + (endorsements * 10);
        if (trustScore > MAX_REPUTATION) trustScore = MAX_REPUTATION;
        name = a.name;
        weightedTrustScore = _computeWeightedTrustScore(agent);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC725Y {
    function getData(bytes32 dataKey) external view returns (bytes memory dataValue);
}
