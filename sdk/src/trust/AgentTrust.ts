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
      IDENTITY_REGISTRY_ABI as any,
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
   * Usage:
   *   const result = await agentTrust.verify('0x293E...');
   *   if (result.registered && result.trustScore > 100) { ... }
   */
  async verify(address: string): Promise<VerifyResult> {
    validateAddress(address);

    const result = await this.withRetry(
      () => this.identityContract.methods.verify(address).call() as Promise<VerifyContractResult>,
      'verify',
    );

    return {
      registered: result.registered,
      active: result.active,
      isUniversalProfile: result.isUP,
      reputation: Number(result.reputation),
      endorsements: Number(result.endorsements),
      trustScore: Number(result.trustScore),
      name: result.name,
    };
  }

  /**
   * Batch verify multiple agent addresses at once.
   * Returns a map of address → VerifyResult.
   * Runs all calls concurrently for efficiency.
   *
   * Usage:
   *   const results = await trust.verifyBatch(['0xA...', '0xB...']);
   *   for (const [addr, result] of results) { ... }
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

    // Check if it's a UP
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
   * Check if an agent is registered.
   */
  async isRegistered(address: string): Promise<boolean> {
    validateAddress(address);
    return this.withRetry(
      () => this.identityContract.methods.isRegistered(address).call() as Promise<boolean>,
      'isRegistered',
    );
  }

  /**
   * Get the trust score for an agent.
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
   * Get all endorsers of an agent.
   */
  async getEndorsers(address: string): Promise<string[]> {
    validateAddress(address);
    return this.withRetry<string[]>(
      () => this.identityContract.methods.getEndorsers(address).call() as Promise<string[]>,
      'getEndorsers',
    );
  }

  /**
   * Get total number of registered agents.
   */
  async getAgentCount(): Promise<number> {
    const count = await this.withRetry(
      () => this.identityContract.methods.getAgentCount().call() as Promise<bigint>,
      'getAgentCount',
    );
    return Number(count);
  }

  /**
   * Get a page of agent addresses.
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
   * Get skills for an agent from the AgentSkillsRegistry.
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
   * Get the full content of a specific skill.
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
   * Usage:
   *   await trust.endorse('0xEndorsedAddress', privateKey, 'Great agent!');
   *
   * @param endorsed - Address of the agent to endorse
   * @param privateKey - Private key of the endorsing agent (NEVER hardcode)
   * @param reason - Optional reason for the endorsement
   * @returns Transaction receipt
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
   * @param name - Human-readable agent name
   * @param description - What this agent does
   * @param privateKey - Private key of the agent (NEVER hardcode)
   * @param metadataURI - Optional IPFS/HTTP URI for extended metadata
   * @returns Transaction receipt with the agent's address
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
