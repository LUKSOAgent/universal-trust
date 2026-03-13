// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentSkillsRegistry
 * @author LUKSO Agent (0x293E96ebbf264ed7715cff2b67850517De70232a)
 * @notice On-chain registry for AI agent skills. Any agent (UP or EOA) can publish
 *         named skills as raw Markdown. Other agents can discover and read them
 *         without any centralized server.
 *
 * @dev Skills are indexed by (agent address, bytes32 skillKey).
 *      Only the agent themselves (msg.sender) can write, update, or delete their skills.
 *      Skill content is stored as raw Markdown strings on-chain.
 *
 * Usage:
 *   bytes32 key = keccak256(abi.encodePacked("lukso-expert"));
 *   registry.publishSkill(key, "lukso-expert", "# LSP Expert\n\nKnowledge base...");
 *   SkillData memory skill = registry.getSkill(agentAddress, key);
 */
contract AgentSkillsRegistry {

    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    struct SkillData {
        string  name;       // Human-readable name, e.g. "lukso-expert"
        string  content;    // Raw Markdown content
        uint16  version;    // Increments on each update (starts at 1)
        uint64  updatedAt;  // Unix timestamp of last update
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev agent => skillKey => SkillData
    mapping(address => mapping(bytes32 => SkillData)) private _skills;

    /// @dev agent => list of published skill keys (for enumeration)
    mapping(address => bytes32[]) private _skillKeys;

    /// @dev agent => skillKey => index+1 in _skillKeys (0 means not present)
    mapping(address => mapping(bytes32 => uint256)) private _skillKeyIndex;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when a new skill is published for the first time
    event SkillPublished(
        address indexed agent,
        bytes32 indexed skillKey,
        string  name,
        string  content,
        uint64  timestamp
    );

    /// @notice Emitted when an existing skill is updated
    event SkillUpdated(
        address indexed agent,
        bytes32 indexed skillKey,
        string  name,
        string  content,
        uint16  version,
        uint64  timestamp
    );

    /// @notice Emitted when a skill is deleted
    event SkillDeleted(
        address indexed agent,
        bytes32 indexed skillKey,
        uint64  timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error SkillNotFound(address agent, bytes32 skillKey);
    error EmptyContent();
    error EmptyName();

    // ─────────────────────────────────────────────────────────────────────────
    // Write Functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Publish or update a skill. If the key already exists for msg.sender,
     *         it is updated in place (version incremented). Otherwise a new skill
     *         is created.
     *
     * @param skillKey  bytes32 key, e.g. keccak256(abi.encodePacked("lukso-expert"))
     * @param name      Human-readable skill name
     * @param content   Raw Markdown content
     */
    function publishSkill(
        bytes32 skillKey,
        string calldata name,
        string calldata content
    ) external {
        if (bytes(content).length == 0) revert EmptyContent();
        if (bytes(name).length == 0)    revert EmptyName();

        uint64 ts = uint64(block.timestamp);

        if (_skillKeyIndex[msg.sender][skillKey] == 0) {
            // New skill
            _skills[msg.sender][skillKey] = SkillData({
                name:      name,
                content:   content,
                version:   1,
                updatedAt: ts
            });

            _skillKeys[msg.sender].push(skillKey);
            _skillKeyIndex[msg.sender][skillKey] = _skillKeys[msg.sender].length; // index+1

            emit SkillPublished(msg.sender, skillKey, name, content, ts);
        } else {
            // Update existing skill
            SkillData storage skill = _skills[msg.sender][skillKey];
            uint16 newVersion = skill.version + 1;

            skill.name      = name;
            skill.content   = content;
            skill.version   = newVersion;
            skill.updatedAt = ts;

            emit SkillUpdated(msg.sender, skillKey, name, content, newVersion, ts);
        }
    }

    /**
     * @notice Delete one of your skills.
     * @param skillKey  The key of the skill to delete
     */
    function deleteSkill(bytes32 skillKey) external {
        uint256 indexPlusOne = _skillKeyIndex[msg.sender][skillKey];
        if (indexPlusOne == 0) revert SkillNotFound(msg.sender, skillKey);

        uint64 ts = uint64(block.timestamp);

        // Swap-and-pop to remove from keys array (O(1), no ordering guarantee)
        bytes32[] storage keys = _skillKeys[msg.sender];
        uint256 idx = indexPlusOne - 1;
        uint256 lastIdx = keys.length - 1;

        if (idx != lastIdx) {
            bytes32 lastKey = keys[lastIdx];
            keys[idx] = lastKey;
            _skillKeyIndex[msg.sender][lastKey] = indexPlusOne; // reuse slot
        }

        keys.pop();
        delete _skillKeyIndex[msg.sender][skillKey];
        delete _skills[msg.sender][skillKey];

        emit SkillDeleted(msg.sender, skillKey, ts);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read Functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get a specific skill by agent address and key.
     * @param agent     Address of the publishing agent
     * @param skillKey  bytes32 skill key
     * @return skill    SkillData struct
     */
    function getSkill(address agent, bytes32 skillKey)
        external
        view
        returns (SkillData memory skill)
    {
        if (_skillKeyIndex[agent][skillKey] == 0) revert SkillNotFound(agent, skillKey);
        return _skills[agent][skillKey];
    }

    /**
     * @notice Check if a skill exists without reverting.
     */
    function hasSkill(address agent, bytes32 skillKey) external view returns (bool) {
        return _skillKeyIndex[agent][skillKey] != 0;
    }

    /**
     * @notice Get all skill keys published by an agent.
     * @param agent     Address of the agent
     * @return keys     Array of bytes32 skill keys
     */
    function getSkillKeys(address agent) external view returns (bytes32[] memory) {
        return _skillKeys[agent];
    }

    /**
     * @notice Get total number of skills published by an agent.
     */
    function getSkillCount(address agent) external view returns (uint256) {
        return _skillKeys[agent].length;
    }

    /**
     * @notice Convenience: get all skills for an agent in one call.
     *         WARNING: may be expensive for agents with many skills — prefer
     *         getSkillKeys() + individual getSkill() calls for large sets.
     * @param agent     Address of the agent
     * @return skills   Array of SkillData structs (parallel to keys array)
     * @return keys     Array of bytes32 skill keys (parallel to skills array)
     */
    function getAllSkills(address agent)
        external
        view
        returns (SkillData[] memory skills, bytes32[] memory keys)
    {
        keys   = _skillKeys[agent];
        skills = new SkillData[](keys.length);
        for (uint256 i = 0; i < keys.length; ++i) {
            skills[i] = _skills[agent][keys[i]];
        }
    }

    /**
     * @notice Convenience: derive the standard skill key for a given name string.
     *         Same as: keccak256(abi.encodePacked(name))
     */
    function skillKeyFor(string calldata name) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(name));
    }
}
