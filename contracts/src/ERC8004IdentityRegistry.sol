// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title ERC-8004 Identity Registry (LUKSO deployment)
 * @notice Minimal ERC-8004 compliant identity registry for AI agents.
 *         Deployed on LUKSO mainnet (chain ID 42) as a singleton.
 *         Agents registered here are discoverable cross-chain via:
 *         agentRegistry = "eip155:42:<this_contract_address>"
 *
 * @dev Implements:
 *      - ERC-721 + URIStorage (agentId = tokenId, agentURI = tokenURI)
 *      - register() / setAgentURI()
 *      - getMetadata() / setMetadata() extensible key-value store
 *      - agentWallet: verified payment address (EIP-712 / ERC-1271 signature)
 *      - Reputation and Validation registries are separate contracts per ERC-8004
 *
 * @custom:erc 8004
 * @custom:chain LUKSO Mainnet (42)
 */
contract ERC8004IdentityRegistry is ERC721URIStorage {
    // ─── Errors ───────────────────────────────────────────────────────────────
    error NotAgentOwnerOrOperator();
    error AgentDoesNotExist();
    error ReservedMetadataKey();
    error InvalidSignatureDeadline();
    error InvalidWalletSignature();

    // ─── Events ───────────────────────────────────────────────────────────────
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );

    // ─── Constants ────────────────────────────────────────────────────────────
    string private constant AGENT_WALLET_KEY = "agentWallet";
    bytes32 private constant AGENT_WALLET_KEY_HASH = keccak256(bytes("agentWallet"));

    // EIP-712 domain separator for agentWallet verification
    bytes32 private constant SET_WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

    // ─── Storage ──────────────────────────────────────────────────────────────
    uint256 private _nextAgentId;

    /// @dev agentId → metadataKey → metadataValue
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() ERC721("ERC-8004 Agent", "AGENT8004") {
        _nextAgentId = 1; // start at 1 like the spec implies
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /**
     * @notice Register a new agent with a URI pointing to the ERC-8004 registration file.
     * @param agentURI  URI resolving to the agent registration JSON (https://, ipfs://, data:)
     * @return agentId  The minted token ID
     */
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender, agentURI);
    }

    /**
     * @notice Register with URI + initial metadata entries.
     */
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender, agentURI);
        _setMetadataEntries(agentId, metadata);
    }

    /**
     * @notice Register without a URI (set it later with setAgentURI).
     */
    function register() external returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender, "");
    }

    /**
     * @notice Update the agent's registration file URI.
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireOwnerOrOperator(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    // ─── Metadata ─────────────────────────────────────────────────────────────

    /**
     * @notice Read arbitrary metadata for an agent.
     * @param agentId      The agent's token ID
     * @param metadataKey  Arbitrary string key
     */
    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory) {
        if (!_exists(agentId)) revert AgentDoesNotExist();
        return _metadata[agentId][metadataKey];
    }

    /**
     * @notice Set arbitrary metadata for an agent. Reserved key "agentWallet" is blocked here.
     */
    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external {
        _requireOwnerOrOperator(agentId);
        if (keccak256(bytes(metadataKey)) == AGENT_WALLET_KEY_HASH) revert ReservedMetadataKey();
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    // ─── Agent Wallet ─────────────────────────────────────────────────────────

    /**
     * @notice Get the verified payment wallet for an agent.
     *         Returns owner address if no wallet has been set.
     */
    function getAgentWallet(uint256 agentId) external view returns (address) {
        if (!_exists(agentId)) revert AgentDoesNotExist();
        bytes memory stored = _metadata[agentId][AGENT_WALLET_KEY];
        if (stored.length == 0) return ownerOf(agentId);
        return abi.decode(stored, (address));
    }

    /**
     * @notice Unset the agentWallet (reverts to owner address).
     */
    function unsetAgentWallet(uint256 agentId) external {
        _requireOwnerOrOperator(agentId);
        delete _metadata[agentId][AGENT_WALLET_KEY];
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, bytes(""));
    }

    /**
     * @notice Set a verified agent wallet via EIP-712 signature (EOA) or ERC-1271 (smart contract).
     * @param agentId    The agent's token ID
     * @param newWallet  The new wallet address (must sign the EIP-712 payload)
     * @param deadline   Unix timestamp after which the signature is invalid
     * @param signature  EIP-712 signature from newWallet (or ERC-1271 for smart contracts)
     */
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        _requireOwnerOrOperator(agentId);
        if (block.timestamp > deadline) revert InvalidSignatureDeadline();

        // EIP-712 digest
        bytes32 digest = _hashSetWallet(agentId, newWallet, deadline);

        // Try EOA recovery first
        bool valid = false;
        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            assembly {
                r := calldataload(signature.offset)
                s := calldataload(add(signature.offset, 32))
                v := byte(0, calldataload(add(signature.offset, 64)))
            }
            address recovered = ecrecover(digest, v, r, s);
            valid = (recovered == newWallet && recovered != address(0));
        }

        // ERC-1271 fallback (smart contract wallets / UPs)
        if (!valid) {
            (bool ok, bytes memory ret) = newWallet.staticcall(
                abi.encodeWithSignature("isValidSignature(bytes32,bytes)", digest, signature)
            );
            valid = ok && ret.length >= 32 && bytes4(ret) == bytes4(0x1626ba7e);
        }

        if (!valid) revert InvalidWalletSignature();

        bytes memory encoded = abi.encode(newWallet);
        _metadata[agentId][AGENT_WALLET_KEY] = encoded;
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, encoded);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Total number of registered agents (including burned, if any).
     */
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /**
     * @notice Check if an agentId exists.
     */
    function exists(uint256 agentId) external view returns (bool) {
        return _exists(agentId);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _mintAgent(address to, string memory agentURI) internal returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _mint(to, agentId);
        if (bytes(agentURI).length > 0) {
            _setTokenURI(agentId, agentURI);
        }
        // Set agentWallet = owner initially
        bytes memory encoded = abi.encode(to);
        _metadata[agentId][AGENT_WALLET_KEY] = encoded;
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, encoded);
        emit Registered(agentId, agentURI, to);
    }

    function _setMetadataEntries(uint256 agentId, MetadataEntry[] calldata entries) internal {
        for (uint256 i = 0; i < entries.length; i++) {
            if (keccak256(bytes(entries[i].metadataKey)) == AGENT_WALLET_KEY_HASH) revert ReservedMetadataKey();
            _metadata[agentId][entries[i].metadataKey] = entries[i].metadataValue;
            emit MetadataSet(agentId, entries[i].metadataKey, entries[i].metadataKey, entries[i].metadataValue);
        }
    }

    function _requireOwnerOrOperator(uint256 agentId) internal view {
        if (!_exists(agentId)) revert AgentDoesNotExist();
        address owner = _ownerOf(agentId);
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender) && getApproved(agentId) != msg.sender)
            revert NotAgentOwnerOrOperator();
    }

    /// @dev EIP-712 domain hash (no cached domainSeparator — keeps it simple)
    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("ERC-8004 Identity Registry")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    function _hashSetWallet(uint256 agentId, address newWallet, uint256 deadline) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            _domainSeparator(),
            keccak256(abi.encode(SET_WALLET_TYPEHASH, agentId, newWallet, deadline))
        ));
    }

    /// @dev Clear agentWallet on transfer (per ERC-8004 spec). OZ v5 hook.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // On transfer (not mint), clear agentWallet
        if (from != address(0) && to != address(0)) {
            delete _metadata[tokenId][AGENT_WALLET_KEY];
        }
        return super._update(to, tokenId, auth);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < _nextAgentId && _ownerOf(tokenId) != address(0);
    }
}
