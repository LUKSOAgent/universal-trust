// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentIdentityRegistry
 * @author LUKSO Agent (0x293E96ebbf264ed7715cff2b67850517De70232a)
 * @notice On-chain identity and trust layer for AI agents on LUKSO.
 *         Agents register with their Universal Profile address, build reputation
 *         through verifiable on-chain actions, and establish trust through
 *         peer endorsements. Skill discovery is delegated to the deployed
 *         AgentSkillsRegistry.
 *
 * @dev Designed for the Synthesis Hackathon "Agents that Trust" track.
 *      - Self-registration: any address can register (UPs and EOAs)
 *      - Reputation: starts at 100, adjusted by authorized updaters
 *      - Endorsements: agents endorse each other, creating a trust graph
 *      - Skills link: reads from AgentSkillsRegistry (0x64B3...F4F6)
 */
contract AgentIdentityRegistry {

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice The deployed AgentSkillsRegistry on LUKSO mainnet
    address public immutable skillsRegistry;

    uint256 public constant INITIAL_REPUTATION = 100;
    uint256 public constant MAX_REPUTATION = 10000;

    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    struct AgentIdentity {
        string  name;           // Human-readable agent name
        string  description;    // What this agent does
        string  metadataURI;    // IPFS/HTTP URI for extended metadata (avatar, etc.)
        uint256 reputation;     // Reputation score (starts at INITIAL_REPUTATION)
        uint256 endorsementCount; // Number of endorsements received
        uint64  registeredAt;   // When the agent registered
        uint64  lastActiveAt;   // Last on-chain activity
        bool    isActive;       // Can be deactivated by owner
    }

    struct Endorsement {
        address endorser;       // Who endorsed
        address endorsed;       // Who was endorsed
        uint64  timestamp;      // When the endorsement was made
        string  reason;         // Optional reason/context
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Owner of the registry (deployer)
    address public owner;

    /// @dev agent address => identity data
    mapping(address => AgentIdentity) private _agents;

    /// @dev Ordered list of all registered agent addresses
    address[] private _agentList;

    /// @dev agent address => index+1 in _agentList (0 = not registered)
    mapping(address => uint256) private _agentIndex;

    /// @dev endorser => endorsed => Endorsement (one endorsement per pair)
    mapping(address => mapping(address => Endorsement)) private _endorsements;

    /// @dev endorsed => list of endorser addresses
    mapping(address => address[]) private _endorsers;

    /// @dev endorsed => endorser => index+1 in _endorsers (0 = not present)
    mapping(address => mapping(address => uint256)) private _endorserIndex;

    /// @dev Addresses authorized to update reputation (e.g. other contracts, admin)
    mapping(address => bool) private _reputationUpdaters;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event AgentRegistered(
        address indexed agent,
        string  name,
        string  description,
        uint64  timestamp
    );

    event AgentUpdated(
        address indexed agent,
        string  name,
        string  description,
        string  metadataURI,
        uint64  timestamp
    );

    event AgentDeactivated(address indexed agent, uint64 timestamp);
    event AgentReactivated(address indexed agent, uint64 timestamp);

    event ReputationUpdated(
        address indexed agent,
        uint256 oldReputation,
        uint256 newReputation,
        int256  delta,
        string  reason
    );

    event EndorsementAdded(
        address indexed endorser,
        address indexed endorsed,
        string  reason,
        uint64  timestamp
    );

    event EndorsementRemoved(
        address indexed endorser,
        address indexed endorsed,
        uint64  timestamp
    );

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
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param _skillsRegistry Address of the deployed AgentSkillsRegistry
     */
    constructor(address _skillsRegistry) {
        skillsRegistry = _skillsRegistry;
        owner = msg.sender;
        _reputationUpdaters[msg.sender] = true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Registration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register as an agent. Caller becomes the agent.
     * @param name        Human-readable agent name
     * @param description What this agent does
     * @param metadataURI Optional IPFS/HTTP URI for extended metadata
     */
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
        _agentIndex[msg.sender] = _agentList.length; // index+1

        emit AgentRegistered(msg.sender, name, description, ts);
    }

    /**
     * @notice Update your agent profile.
     */
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

    /**
     * @notice Deactivate your agent (soft delete).
     */
    function deactivate() external onlyRegistered(msg.sender) {
        _agents[msg.sender].isActive = false;
        emit AgentDeactivated(msg.sender, uint64(block.timestamp));
    }

    /**
     * @notice Reactivate your agent.
     */
    function reactivate() external onlyRegistered(msg.sender) {
        _agents[msg.sender].isActive = true;
        _agents[msg.sender].lastActiveAt = uint64(block.timestamp);
        emit AgentReactivated(msg.sender, uint64(block.timestamp));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reputation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Update an agent's reputation. Only callable by authorized updaters.
     * @param agent  The agent whose reputation to update
     * @param delta  Positive or negative change
     * @param reason Human-readable reason for the change
     */
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

    /**
     * @notice Set an address as a reputation updater (or revoke).
     */
    function setReputationUpdater(address updater, bool authorized) external onlyOwner {
        _reputationUpdaters[updater] = authorized;
        emit ReputationUpdaterSet(updater, authorized);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Endorsements (Trust Graph)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Endorse another agent. Creates a trust link.
     *         Both endorser and endorsed must be registered and active.
     * @param endorsed The agent to endorse
     * @param reason   Optional reason/context for the endorsement
     */
    function endorse(
        address endorsed,
        string calldata reason
    ) external onlyRegistered(msg.sender) onlyActive(msg.sender) onlyRegistered(endorsed) onlyActive(endorsed) {
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
        _endorserIndex[endorsed][msg.sender] = _endorsers[endorsed].length; // index+1

        _agents[endorsed].endorsementCount++;
        _agents[msg.sender].lastActiveAt = ts;
        _agents[endorsed].lastActiveAt = ts;

        emit EndorsementAdded(msg.sender, endorsed, reason, ts);
    }

    /**
     * @notice Remove your endorsement of another agent.
     */
    function removeEndorsement(
        address endorsed
    ) external onlyRegistered(msg.sender) {
        if (_endorserIndex[endorsed][msg.sender] == 0) revert NotEndorsed(msg.sender, endorsed);

        // Swap-and-pop removal from _endorsers array
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
    // Trust Score Computation (View)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Compute a composite trust score for an agent.
     *         Score = reputation + (endorsementCount * 10), capped at MAX_REPUTATION.
     *         This is a simple scoring function — can be made more sophisticated.
     */
    function getTrustScore(address agent) external view onlyRegistered(agent) returns (uint256) {
        AgentIdentity storage a = _agents[agent];
        uint256 score = a.reputation + (a.endorsementCount * 10);
        return score > MAX_REPUTATION ? MAX_REPUTATION : score;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Verification (checks if address is a Universal Profile)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Check if an address supports the LSP0 (Universal Profile) interface.
     *         Uses ERC165 supportsInterface check.
     * @param account The address to check
     * @return True if the address is a Universal Profile (supports LSP0)
     */
    function isUniversalProfile(address account) public view returns (bool) {
        if (account.code.length == 0) return false; // EOAs are not UPs

        // LSP0ERC725Account interfaceId = 0x24871b3a
        try IERC165(account).supportsInterface(0x24871b3a) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
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

    /**
     * @notice Get full identity data for an agent.
     */
    function getAgent(address agent) external view onlyRegistered(agent) returns (AgentIdentity memory) {
        return _agents[agent];
    }

    /**
     * @notice Check if an address is registered.
     */
    function isRegistered(address agent) external view returns (bool) {
        return _agentIndex[agent] != 0;
    }

    /**
     * @notice Get total number of registered agents.
     */
    function getAgentCount() external view returns (uint256) {
        return _agentList.length;
    }

    /**
     * @notice Get a page of agent addresses.
     */
    function getAgentsByPage(uint256 offset, uint256 limit) external view returns (address[] memory) {
        if (offset >= _agentList.length) {
            return new address[](0);
        }

        uint256 end = offset + limit;
        if (end > _agentList.length) end = _agentList.length;

        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = _agentList[i];
        }
        return result;
    }

    /**
     * @notice Get the endorsement between two agents.
     */
    function getEndorsement(address endorser, address endorsed) external view returns (Endorsement memory) {
        return _endorsements[endorser][endorsed];
    }

    /**
     * @notice Check if endorser has endorsed the endorsed agent.
     */
    function hasEndorsed(address endorser, address endorsed) external view returns (bool) {
        return _endorserIndex[endorsed][endorser] != 0;
    }

    /**
     * @notice Get all endorsers of an agent.
     */
    function getEndorsers(address agent) external view returns (address[] memory) {
        return _endorsers[agent];
    }

    /**
     * @notice Get endorsement count for an agent.
     */
    function getEndorsementCount(address agent) external view returns (uint256) {
        return _endorsers[agent].length;
    }

    /**
     * @notice Check if an address is a reputation updater.
     */
    function isReputationUpdater(address account) external view returns (bool) {
        return _reputationUpdaters[account];
    }

    /**
     * @notice Convenience: Verify an agent and return a trust summary.
     *         This is the core function for the SDK's agentTrust.verify(address).
     * @param agent The agent address to verify
     * @return registered  Whether the agent is registered
     * @return active      Whether the agent is active
     * @return isUP        Whether the address is a Universal Profile
     * @return reputation  Current reputation score
     * @return endorsements Number of endorsements received
     * @return trustScore  Composite trust score
     * @return name        Agent name
     */
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
        if (!registered) {
            return (false, false, false, 0, 0, 0, "");
        }

        AgentIdentity storage a = _agents[agent];
        active = a.isActive;
        isUP = isUniversalProfile(agent);
        reputation = a.reputation;
        endorsements = a.endorsementCount;

        // Trust score computation
        trustScore = reputation + (endorsements * 10);
        if (trustScore > MAX_REPUTATION) trustScore = MAX_REPUTATION;

        name = a.name;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal ERC165 interface for UP detection
// ─────────────────────────────────────────────────────────────────────────────

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
