/**
 * AgentTrust SDK - Verify and query agent identity & trust on LUKSO
 *
 * Usage:
 *   const trust = new AgentTrust({ rpcUrl: 'https://rpc.mainnet.lukso.network' });
 *   const result = await trust.verify('0x293E96ebbf264ed7715cff2b67850517De70232a');
 *   console.log(result.registered, result.trustScore, result.skills);
 */

import { Web3 } from 'web3';

// ─── Contract ABIs (minimal, only what we need) ─────────────────────────────

const IDENTITY_REGISTRY_ABI = [
  {
    name: 'verify',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      { name: 'registered', type: 'bool' },
      { name: 'active', type: 'bool' },
      { name: 'isUP', type: 'bool' },
      { name: 'reputation', type: 'uint256' },
      { name: 'endorsements', type: 'uint256' },
      { name: 'trustScore', type: 'uint256' },
      { name: 'name', type: 'string' },
    ],
  },
  {
    name: 'endorse',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'endorsed', type: 'address' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'metadataURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'reputation', type: 'uint256' },
          { name: 'endorsementCount', type: 'uint256' },
          { name: 'registeredAt', type: 'uint64' },
          { name: 'lastActiveAt', type: 'uint64' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getEndorsers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'hasEndorsed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'endorser', type: 'address' },
      { name: 'endorsed', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getTrustScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAgentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAgentsByPage',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'skillsRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const IDENTITY_REGISTRY_ABI_EXTRA = [
  {
    name: 'getEndorsement',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'endorser', type: 'address' },
      { name: 'endorsed', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'endorser', type: 'address' },
          { name: 'endorsed', type: 'address' },
          { name: 'timestamp', type: 'uint64' },
          { name: 'reason', type: 'string' },
        ],
      },
    ],
  },
  {
    name: 'getEndorsementCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isReputationUpdater',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const SKILLS_REGISTRY_ABI = [
  {
    name: 'getSkillKeys',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    name: 'getSkill',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'skillKey', type: 'bytes32' },
    ],
    outputs: [
      {
        name: 'skill',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'content', type: 'string' },
          { name: 'version', type: 'uint16' },
          { name: 'updatedAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    name: 'getAllSkills',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      {
        name: 'skills',
        type: 'tuple[]',
        components: [
          { name: 'name', type: 'string' },
          { name: 'content', type: 'string' },
          { name: 'version', type: 'uint16' },
          { name: 'updatedAt', type: 'uint64' },
        ],
      },
      { name: 'keys', type: 'bytes32[]' },
    ],
  },
  {
    name: 'getSkillCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'hasSkill',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'skillKey', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ─── Typed Errors ───────────────────────────────────────────────────────────

export class AgentTrustError extends Error {
  constructor(
    message: string,
    public readonly code: AgentTrustErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AgentTrustError';
  }
}

export enum AgentTrustErrorCode {
  /** Invalid Ethereum address format */
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  /** RPC call failed after all retries */
  RPC_ERROR = 'RPC_ERROR',
  /** Transaction failed on-chain */
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  /** Agent not registered in the registry */
  NOT_REGISTERED = 'NOT_REGISTERED',
  /** Invalid input parameter */
  INVALID_INPUT = 'INVALID_INPUT',
  /** Contract call reverted */
  CONTRACT_REVERT = 'CONTRACT_REVERT',
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentTrustConfig {
  /** LUKSO RPC URL. Default: https://rpc.mainnet.lukso.network */
  rpcUrl?: string;
  /** AgentIdentityRegistry address. Default: deployed LUKSO mainnet address. */
  identityRegistryAddress?: string;
  /** AgentSkillsRegistry address. Default: deployed mainnet address. */
  skillsRegistryAddress?: string;
  /** Number of retry attempts for RPC calls. Default: 3 */
  maxRetries?: number;
  /** Base delay in ms between retries (exponential backoff). Default: 1000 */
  retryDelayMs?: number;
}

/** Default deployed AgentIdentityRegistry on LUKSO mainnet */
const DEFAULT_IDENTITY_REGISTRY = '0x1581BA9Fb480b72df3e54f51f851a644483c6ec7';

export interface VerifyResult {
  /** Whether the agent is registered in the identity registry */
  registered: boolean;
  /** Whether the agent is currently active */
  active: boolean;
  /** Whether the agent address is a LUKSO Universal Profile */
  isUniversalProfile: boolean;
  /** Reputation score (0 - 10000) */
  reputation: number;
  /** Number of endorsements received */
  endorsements: number;
  /** Composite trust score (reputation + endorsement bonus) */
  trustScore: number;
  /** Agent display name */
  name: string;
}

export interface AgentProfile {
  address: string;
  name: string;
  description: string;
  metadataURI: string;
  reputation: number;
  endorsementCount: number;
  registeredAt: number;
  lastActiveAt: number;
  isActive: boolean;
  isUniversalProfile: boolean;
  skills: SkillInfo[];
  endorsers: string[];
}

export interface SkillInfo {
  key: string;
  name: string;
  version: number;
  updatedAt: number;
}

export interface EndorsementInfo {
  /** Address of the endorsing agent */
  endorser: string;
  /** Address of the endorsed agent */
  endorsed: string;
  /** Unix timestamp when the endorsement was made */
  timestamp: number;
  /** Optional reason/context for the endorsement */
  reason: string;
  /** Whether this endorsement exists (false if no endorsement found) */
  exists: boolean;
}

// ─── Contract Return Type Helpers ───────────────────────────────────────────

/** Shape of the verify() return from the contract */
interface VerifyContractResult {
  registered: boolean;
  active: boolean;
  isUP: boolean;
  reputation: bigint | string;
  endorsements: bigint | string;
  trustScore: bigint | string;
  name: string;
}

/** Shape of the getAgent() return from the contract */
interface AgentContractResult {
  name: string;
  description: string;
  metadataURI: string;
  reputation: bigint | string;
  endorsementCount: bigint | string;
  registeredAt: bigint | string;
  lastActiveAt: bigint | string;
  isActive: boolean;
}

/** Shape of the getEndorsement() return from the contract */
interface EndorsementContractResult {
  endorser: string;
  endorsed: string;
  timestamp: bigint | string;
  reason: string;
}

/** Shape of a skill from the contract */
interface SkillContractResult {
  name: string;
  content: string;
  version: bigint | string;
  updatedAt: bigint | string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

function validateAddress(address: string, paramName: string = 'address'): void {
  if (!address || !ADDRESS_REGEX.test(address)) {
    throw new AgentTrustError(
      `Invalid Ethereum address for ${paramName}: "${address}"`,
      AgentTrustErrorCode.INVALID_ADDRESS,
    );
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── SDK Class ──────────────────────────────────────────────────────────────

const DEFAULT_RPC = 'https://rpc.mainnet.lukso.network';
const DEFAULT_SKILLS_REGISTRY = '0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

export class AgentTrust {
  private web3: Web3;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private identityContract: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private skillsContract: any;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config: AgentTrustConfig = {}) {
    this.web3 = new Web3(config.rpcUrl || DEFAULT_RPC);
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.identityContract = new this.web3.eth.Contract(
      [...IDENTITY_REGISTRY_ABI, ...IDENTITY_REGISTRY_ABI_EXTRA] as any,
      config.identityRegistryAddress || DEFAULT_IDENTITY_REGISTRY,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.skillsContract = new this.web3.eth.Contract(
      SKILLS_REGISTRY_ABI as any,
      config.skillsRegistryAddress || DEFAULT_SKILLS_REGISTRY,
    );
  }

  /**
   * Retry wrapper for RPC calls with exponential backoff.
   * Retries on network/timeout errors, not on contract reverts.
   */
  private async withRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        // Don't retry on contract reverts (those are deterministic)
        const errMsg = error instanceof Error ? error.message : String(error);
        if (
          errMsg.includes('revert') ||
          errMsg.includes('execution reverted') ||
          errMsg.includes('INVALID_ADDRESS')
        ) {
          throw new AgentTrustError(
            `Contract call reverted during ${operation}: ${errMsg}`,
            AgentTrustErrorCode.CONTRACT_REVERT,
            error,
          );
        }

        // Last attempt — don't sleep, just throw
        if (attempt === this.maxRetries) break;

        // Exponential backoff: 1s, 2s, 4s
        const delay = this.retryDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }

    throw new AgentTrustError(
      `RPC call failed after ${this.maxRetries + 1} attempts during ${operation}`,
      AgentTrustErrorCode.RPC_ERROR,
      lastError,
    );
  }

  /**
   * Core verification function.
   * Returns trust summary for an agent address.
   *
   * Note: The on-chain isUP check uses LSP0 interface ID 0x24871b3a which
   * some newer Universal Profiles don't support. The SDK enhances this with
   * a fallback check for ERC725X + ERC725Y support (the core UP interfaces).
   *
   * @example
   * ```ts
   * const trust = new AgentTrust();
   * const result = await trust.verify('0x293E96ebbf264ed7715cff2b67850517De70232a');
   * if (result.registered && result.trustScore > 100) {
   *   console.log(`Trusted agent: ${result.name} (score: ${result.trustScore})`);
   * }
   * ```
   *
   * @param address - Ethereum/LUKSO address to verify
   * @returns VerifyResult with registration status, trust score, and UP detection
   * @throws AgentTrustError with INVALID_ADDRESS if address format is wrong
   * @throws AgentTrustError with RPC_ERROR if all retry attempts fail
   */
  async verify(address: string): Promise<VerifyResult> {
    validateAddress(address);

    const result = await this.withRetry(
      () => this.identityContract.methods.verify(address).call() as Promise<VerifyContractResult>,
      'verify',
    );

    // Enhance UP detection: if the contract says it's not a UP, do a fallback
    // check for ERC725X + ERC725Y (the core interfaces of a Universal Profile).
    // Some newer UPs don't register the legacy 0x24871b3a interface ID.
    let isUP = result.isUP;
    if (!isUP && result.registered) {
      isUP = await this.isUniversalProfile(address);
    }

    return {
      registered: result.registered,
      active: result.active,
      isUniversalProfile: isUP,
      reputation: Number(result.reputation),
      endorsements: Number(result.endorsements),
      trustScore: Number(result.trustScore),
      name: result.name,
    };
  }

  /**
   * Check if an address is a LUKSO Universal Profile.
   * Uses ERC165 supportsInterface checks for ERC725X (0x7545acac)
   * and ERC725Y (0x629aa694) — the core UP interfaces.
   *
   * @param address - Address to check
   * @returns true if the address supports both ERC725X and ERC725Y
   */
  async isUniversalProfile(address: string): Promise<boolean> {
    validateAddress(address);

    const ERC165_ABI = [
      {
        name: 'supportsInterface',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'interfaceId', type: 'bytes4' }],
        outputs: [{ name: '', type: 'bool' }],
      },
    ] as const;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contract = new this.web3.eth.Contract(ERC165_ABI as any, address);

      const [erc725x, erc725y] = await Promise.all([
        contract.methods.supportsInterface('0x7545acac').call() as Promise<boolean>,
        contract.methods.supportsInterface('0x629aa694').call() as Promise<boolean>,
      ]);

      return erc725x && erc725y;
    } catch {
      return false;
    }
  }

  /**
   * Batch verify multiple agent addresses at once.
   * Returns a map of address → VerifyResult.
   * Runs all calls concurrently for efficiency.
   *
   * @example
   * ```ts
   * const results = await trust.verifyBatch([
   *   '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b',
   *   '0x293E96ebbf264ed7715cff2b67850517De70232a',
   * ]);
   * for (const [addr, result] of results) {
   *   console.log(`${addr}: trust=${result.trustScore}`);
   * }
   * ```
   *
   * @param addresses - Array of Ethereum/LUKSO addresses to verify
   * @returns Map of address → VerifyResult (failed lookups return unregistered defaults)
   * @throws AgentTrustError with INVALID_INPUT if array is empty
   * @throws AgentTrustError with INVALID_ADDRESS if any address is malformed
   */
  async verifyBatch(addresses: string[]): Promise<Map<string, VerifyResult>> {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new AgentTrustError(
        'verifyBatch requires a non-empty array of addresses',
        AgentTrustErrorCode.INVALID_INPUT,
      );
    }

    // Validate all addresses up front
    for (const addr of addresses) {
      validateAddress(addr, 'verifyBatch address');
    }

    // Run all verify calls concurrently
    const results = await Promise.allSettled(
      addresses.map((addr) => this.verify(addr)),
    );

    const map = new Map<string, VerifyResult>();
    for (let i = 0; i < addresses.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        map.set(addresses[i], result.value);
      } else {
        // For failed lookups, return a default unregistered result
        map.set(addresses[i], {
          registered: false,
          active: false,
          isUniversalProfile: false,
          reputation: 0,
          endorsements: 0,
          trustScore: 0,
          name: '',
        });
      }
    }

    return map;
  }

  /**
   * Get full agent profile including skills and endorsers.
   *
   * @example
   * ```ts
   * const profile = await trust.getProfile('0x293E96ebbf264ed7715cff2b67850517De70232a');
   * console.log(`${profile.name} — ${profile.skills.length} skills, ${profile.endorsers.length} endorsers`);
   * ```
   *
   * @param address - Agent address to look up
   * @returns Full agent profile with skills, endorsers, and UP detection
   * @throws AgentTrustError with CONTRACT_REVERT if agent is not registered
   */
  async getProfile(address: string): Promise<AgentProfile> {
    validateAddress(address);

    const [agentData, endorsers, skillKeys] = await this.withRetry(
      () =>
        Promise.all([
          this.identityContract.methods.getAgent(address).call() as Promise<AgentContractResult>,
          this.identityContract.methods.getEndorsers(address).call() as Promise<string[]>,
          this.skillsContract.methods
            .getSkillKeys(address)
            .call()
            .catch(() => [] as string[]) as Promise<string[]>,
        ]),
      'getProfile',
    );

    // Fetch skill names (but not full content, to save bandwidth)
    const skills: SkillInfo[] = [];
    for (const key of skillKeys) {
      try {
        const skill = (await this.withRetry(
          () =>
            this.skillsContract.methods
              .getSkill(address, key)
              .call() as Promise<SkillContractResult>,
          'getSkill',
        )) as SkillContractResult;
        skills.push({
          key: key as string,
          name: skill.name,
          version: Number(skill.version),
          updatedAt: Number(skill.updatedAt),
        });
      } catch {
        // Skill may have been deleted
      }
    }

    // Check if it's a UP — uses enhanced fallback (ERC725X + ERC725Y) like verify()
    let isUP = false;
    try {
      const verifyResult = (await this.withRetry(
        () =>
          this.identityContract.methods
            .verify(address)
            .call() as Promise<VerifyContractResult>,
        'verify (for UP check)',
      )) as VerifyContractResult;
      isUP = verifyResult.isUP;
      if (!isUP) {
        isUP = await this.isUniversalProfile(address);
      }
    } catch {
      // ignore
    }

    return {
      address,
      name: agentData.name,
      description: agentData.description,
      metadataURI: agentData.metadataURI,
      reputation: Number(agentData.reputation),
      endorsementCount: Number(agentData.endorsementCount),
      registeredAt: Number(agentData.registeredAt),
      lastActiveAt: Number(agentData.lastActiveAt),
      isActive: agentData.isActive,
      isUniversalProfile: isUP,
      skills,
      endorsers: endorsers as string[],
    };
  }

  /**
   * Check if an agent is registered in the identity registry.
   *
   * @param address - Ethereum/LUKSO address to check
   * @returns true if the agent is registered
   */
  async isRegistered(address: string): Promise<boolean> {
    validateAddress(address);
    return this.withRetry(
      () => this.identityContract.methods.isRegistered(address).call() as Promise<boolean>,
      'isRegistered',
    );
  }

  /**
   * Get the composite trust score for an agent.
   * Score = reputation + (endorsementCount * 10), capped at 10000.
   * Reverts if the agent is not registered — use verify() for safe lookups.
   *
   * @param address - Agent address
   * @returns Trust score (0-10000)
   * @throws AgentTrustError with CONTRACT_REVERT if agent is not registered
   */
  async getTrustScore(address: string): Promise<number> {
    validateAddress(address);
    const score = await this.withRetry(
      () => this.identityContract.methods.getTrustScore(address).call() as Promise<bigint>,
      'getTrustScore',
    );
    return Number(score);
  }

  /**
   * Check if one agent has endorsed another.
   *
   * @param endorser - Address of the potential endorser
   * @param endorsed - Address of the potentially endorsed agent
   * @returns true if the endorsement exists
   */
  async hasEndorsed(endorser: string, endorsed: string): Promise<boolean> {
    validateAddress(endorser, 'endorser');
    validateAddress(endorsed, 'endorsed');
    return this.withRetry(
      () => this.identityContract.methods.hasEndorsed(endorser, endorsed).call() as Promise<boolean>,
      'hasEndorsed',
    );
  }

  /**
   * Get all endorser addresses for an agent.
   *
   * @param address - Agent address to look up endorsers for
   * @returns Array of endorser addresses
   */
  async getEndorsers(address: string): Promise<string[]> {
    validateAddress(address);
    return this.withRetry<string[]>(
      () => this.identityContract.methods.getEndorsers(address).call() as Promise<string[]>,
      'getEndorsers',
    );
  }

  /**
   * Get details of a specific endorsement between two agents.
   * Returns the endorsement with `exists: false` if no endorsement found
   * (checks timestamp === 0 as the indicator).
   *
   * @param endorser - Address of the endorsing agent
   * @param endorsed - Address of the endorsed agent
   * @returns EndorsementInfo with reason, timestamp, and exists flag
   */
  async getEndorsement(endorser: string, endorsed: string): Promise<EndorsementInfo> {
    validateAddress(endorser, 'endorser');
    validateAddress(endorsed, 'endorsed');

    const result = await this.withRetry(
      () =>
        this.identityContract.methods
          .getEndorsement(endorser, endorsed)
          .call() as Promise<EndorsementContractResult>,
      'getEndorsement',
    );

    const timestamp = Number(result.timestamp);

    return {
      endorser: result.endorser,
      endorsed: result.endorsed,
      timestamp,
      reason: result.reason,
      exists: timestamp !== 0,
    };
  }

  /**
   * Get the number of endorsements an agent has received.
   *
   * @param address - Agent address
   * @returns Number of endorsements
   */
  async getEndorsementCount(address: string): Promise<number> {
    validateAddress(address);
    const count = await this.withRetry(
      () =>
        this.identityContract.methods
          .getEndorsementCount(address)
          .call() as Promise<bigint>,
      'getEndorsementCount',
    );
    return Number(count);
  }

  /**
   * Check if an address is authorized to update agent reputation scores.
   *
   * @param address - Address to check
   * @returns true if the address can call updateReputation()
   */
  async isReputationUpdater(address: string): Promise<boolean> {
    validateAddress(address);
    return this.withRetry(
      () =>
        this.identityContract.methods
          .isReputationUpdater(address)
          .call() as Promise<boolean>,
      'isReputationUpdater',
    );
  }

  /**
   * Get total number of registered agents in the registry.
   *
   * @returns Total count of registered agents (including deactivated ones)
   */
  async getAgentCount(): Promise<number> {
    const count = await this.withRetry(
      () => this.identityContract.methods.getAgentCount().call() as Promise<bigint>,
      'getAgentCount',
    );
    return Number(count);
  }

  /**
   * Get a page of agent addresses for enumeration.
   * Returns an empty array if offset is beyond the end.
   *
   * @param offset - Zero-based starting index
   * @param limit - Maximum number of addresses to return
   * @returns Array of agent addresses
   * @throws AgentTrustError with INVALID_INPUT if offset or limit is negative
   */
  async getAgentsByPage(offset: number, limit: number): Promise<string[]> {
    if (offset < 0 || limit < 0) {
      throw new AgentTrustError(
        'offset and limit must be non-negative',
        AgentTrustErrorCode.INVALID_INPUT,
      );
    }
    return this.withRetry(
      () =>
        this.identityContract.methods
          .getAgentsByPage(offset, limit)
          .call() as Promise<string[]>,
      'getAgentsByPage',
    );
  }

  /**
   * Discover agents with reputation at or above a minimum threshold.
   * Iterates through all registered agents using pagination and filters
   * by reputation score. Useful for finding high-trust agents.
   *
   * @example
   * ```ts
   * // Find all agents with reputation >= 200
   * const topAgents = await trust.getAgentsByReputation(200);
   * console.log(`Found ${topAgents.length} high-rep agents`);
   * topAgents.forEach(a => console.log(`  ${a.name}: rep=${a.reputation}`));
   * ```
   *
   * @param minReputation - Minimum reputation score (0-10000)
   * @param pageSize - Number of agents to fetch per page (default: 50)
   * @returns Array of agent profiles meeting the threshold, sorted by reputation descending
   * @throws AgentTrustError with INVALID_INPUT if minReputation is negative
   */
  async getAgentsByReputation(
    minReputation: number,
    pageSize: number = 50,
  ): Promise<Array<{ address: string; name: string; reputation: number; trustScore: number; active: boolean }>> {
    if (minReputation < 0) {
      throw new AgentTrustError(
        'minReputation must be non-negative. Valid range: 0-10000.',
        AgentTrustErrorCode.INVALID_INPUT,
      );
    }

    const totalCount = await this.getAgentCount();
    const matchingAgents: Array<{
      address: string;
      name: string;
      reputation: number;
      trustScore: number;
      active: boolean;
    }> = [];

    for (let offset = 0; offset < totalCount; offset += pageSize) {
      const addresses = await this.getAgentsByPage(offset, pageSize);

      // Batch verify for efficiency
      const results = await this.verifyBatch(addresses);

      for (const [addr, result] of results) {
        if (result.registered && result.reputation >= minReputation) {
          matchingAgents.push({
            address: addr,
            name: result.name,
            reputation: result.reputation,
            trustScore: result.trustScore,
            active: result.active,
          });
        }
      }
    }

    // Sort by reputation descending
    matchingAgents.sort((a, b) => b.reputation - a.reputation);
    return matchingAgents;
  }

  /**
   * Get all skills registered for an agent from the AgentSkillsRegistry.
   * Returns skill metadata (name, version, key) without full content.
   * Use getSkillContent() for the full skill content.
   *
   * @param address - Agent address
   * @returns Array of skill metadata
   */
  async getSkills(address: string): Promise<SkillInfo[]> {
    validateAddress(address);
    const keys = await this.withRetry(
      () => this.skillsContract.methods.getSkillKeys(address).call() as Promise<string[]>,
      'getSkillKeys',
    );
    const skills: SkillInfo[] = [];

    for (const key of keys) {
      try {
        const skill = await this.withRetry(
          () =>
            this.skillsContract.methods
              .getSkill(address, key)
              .call() as Promise<SkillContractResult>,
          'getSkill',
        );
        skills.push({
          key,
          name: skill.name,
          version: Number(skill.version),
          updatedAt: Number(skill.updatedAt),
        });
      } catch {
        // Skill may have been deleted between calls
      }
    }

    return skills;
  }

  /**
   * Get the full content of a specific skill by key.
   *
   * @param address - Agent address
   * @param skillKey - bytes32 skill key (from getSkills())
   * @returns Skill name, full content string, and version number
   */
  async getSkillContent(
    address: string,
    skillKey: string,
  ): Promise<{ name: string; content: string; version: number }> {
    validateAddress(address);
    const skill = await this.withRetry(
      () =>
        this.skillsContract.methods
          .getSkill(address, skillKey)
          .call() as Promise<SkillContractResult>,
      'getSkillContent',
    );
    return {
      name: skill.name,
      content: skill.content,
      version: Number(skill.version),
    };
  }

  /**
   * Endorse another agent. Requires a private key to sign the transaction.
   * Both the endorser and endorsed must be registered and active.
   *
   * @example
   * ```ts
   * const tx = await trust.endorse(
   *   '0x293E96ebbf264ed7715cff2b67850517De70232a',
   *   process.env.PRIVATE_KEY!,
   *   'Reliable code review agent'
   * );
   * console.log(`Endorsed! tx: ${tx.transactionHash}`);
   * ```
   *
   * @param endorsed - Address of the agent to endorse
   * @param privateKey - Private key of the endorsing agent (NEVER hardcode in source)
   * @param reason - Optional reason for the endorsement
   * @returns Transaction receipt with transactionHash
   * @throws AgentTrustError with INVALID_ADDRESS if endorsed address is malformed
   * @throws AgentTrustError with INVALID_INPUT if privateKey is missing
   * @throws AgentTrustError with TRANSACTION_FAILED if on-chain execution fails
   */
  async endorse(
    endorsed: string,
    privateKey: string,
    reason: string = '',
  ): Promise<{ transactionHash: string }> {
    validateAddress(endorsed, 'endorsed');
    if (!privateKey || typeof privateKey !== 'string') {
      throw new AgentTrustError(
        'Private key is required for endorse()',
        AgentTrustErrorCode.INVALID_INPUT,
      );
    }

    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    this.web3.eth.accounts.wallet.add(account);

    try {
      const tx = this.identityContract.methods.endorse(endorsed, reason);
      const gas = await this.withRetry(
        () => tx.estimateGas({ from: account.address }) as Promise<bigint>,
        'endorse.estimateGas',
      );

      const receipt = await this.withRetry(
        () =>
          tx.send({
            from: account.address,
            gas: gas.toString(),
          }) as Promise<{ transactionHash: string }>,
        'endorse.send',
      );

      return { transactionHash: receipt.transactionHash };
    } catch (error) {
      if (error instanceof AgentTrustError) throw error;
      throw new AgentTrustError(
        `Endorse transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        AgentTrustErrorCode.TRANSACTION_FAILED,
        error,
      );
    } finally {
      this.web3.eth.accounts.wallet.remove(account.address);
    }
  }

  /**
   * Register a new agent. Requires a private key to sign the transaction.
   * The signer's address becomes the agent identity.
   *
   * @example
   * ```ts
   * const result = await trust.register(
   *   'Code Review Bot',
   *   'Automated Solidity auditor',
   *   process.env.AGENT_PRIVATE_KEY!,
   *   'ipfs://QmMetadata...'
   * );
   * console.log(`Registered at ${result.agentAddress}, tx: ${result.transactionHash}`);
   * ```
   *
   * @param name - Human-readable agent name (cannot be empty)
   * @param description - What this agent does
   * @param privateKey - Private key of the agent (NEVER hardcode in source)
   * @param metadataURI - Optional IPFS/HTTP URI for extended metadata
   * @returns Transaction receipt with transactionHash and agentAddress
   * @throws AgentTrustError with INVALID_INPUT if name is empty or privateKey missing
   * @throws AgentTrustError with TRANSACTION_FAILED if on-chain execution fails
   */
  async register(
    name: string,
    description: string,
    privateKey: string,
    metadataURI: string = '',
  ): Promise<{ transactionHash: string; agentAddress: string }> {
    if (!name || name.trim().length === 0) {
      throw new AgentTrustError(
        'Agent name cannot be empty',
        AgentTrustErrorCode.INVALID_INPUT,
      );
    }
    if (!privateKey || typeof privateKey !== 'string') {
      throw new AgentTrustError(
        'Private key is required for register()',
        AgentTrustErrorCode.INVALID_INPUT,
      );
    }

    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    this.web3.eth.accounts.wallet.add(account);

    try {
      const tx = this.identityContract.methods.register(name, description, metadataURI);
      const gas = await this.withRetry(
        () => tx.estimateGas({ from: account.address }) as Promise<bigint>,
        'register.estimateGas',
      );

      const receipt = await this.withRetry(
        () =>
          tx.send({
            from: account.address,
            gas: gas.toString(),
          }) as Promise<{ transactionHash: string }>,
        'register.send',
      );

      return {
        transactionHash: receipt.transactionHash,
        agentAddress: account.address,
      };
    } catch (error) {
      if (error instanceof AgentTrustError) throw error;
      throw new AgentTrustError(
        `Register transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        AgentTrustErrorCode.TRANSACTION_FAILED,
        error,
      );
    } finally {
      this.web3.eth.accounts.wallet.remove(account.address);
    }
  }
}
