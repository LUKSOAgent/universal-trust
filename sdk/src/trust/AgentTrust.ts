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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentTrustConfig {
  /** LUKSO RPC URL. Default: https://rpc.mainnet.lukso.network */
  rpcUrl?: string;
  /** AgentIdentityRegistry address. Set after deployment. */
  identityRegistryAddress: string;
  /** AgentSkillsRegistry address. Default: deployed mainnet address. */
  skillsRegistryAddress?: string;
}

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

// ─── SDK Class ──────────────────────────────────────────────────────────────

const DEFAULT_RPC = 'https://rpc.mainnet.lukso.network';
const DEFAULT_SKILLS_REGISTRY = '0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6';

export class AgentTrust {
  private web3: Web3;
  private identityContract: ReturnType<Web3['eth']['Contract']>;
  private skillsContract: ReturnType<Web3['eth']['Contract']>;

  constructor(config: AgentTrustConfig) {
    this.web3 = new Web3(config.rpcUrl || DEFAULT_RPC);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.identityContract = new this.web3.eth.Contract(
      IDENTITY_REGISTRY_ABI as any,
      config.identityRegistryAddress,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.skillsContract = new this.web3.eth.Contract(
      SKILLS_REGISTRY_ABI as any,
      config.skillsRegistryAddress || DEFAULT_SKILLS_REGISTRY,
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
    const result = await this.identityContract.methods.verify(address).call();

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
   * Get full agent profile including skills and endorsers.
   */
  async getProfile(address: string): Promise<AgentProfile> {
    const [agentData, endorsers, skillKeys] = await Promise.all([
      this.identityContract.methods.getAgent(address).call(),
      this.identityContract.methods.getEndorsers(address).call() as Promise<string[]>,
      this.skillsContract.methods.getSkillKeys(address).call().catch(() => [] as string[]),
    ]);

    // Fetch skill names (but not full content, to save bandwidth)
    const skills: SkillInfo[] = [];
    for (const key of skillKeys) {
      try {
        const skill = await this.skillsContract.methods.getSkill(address, key).call();
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
      const verifyResult = await this.identityContract.methods.verify(address).call();
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
    return this.identityContract.methods.isRegistered(address).call();
  }

  /**
   * Get the trust score for an agent.
   */
  async getTrustScore(address: string): Promise<number> {
    const score = await this.identityContract.methods.getTrustScore(address).call();
    return Number(score);
  }

  /**
   * Check if one agent has endorsed another.
   */
  async hasEndorsed(endorser: string, endorsed: string): Promise<boolean> {
    return this.identityContract.methods.hasEndorsed(endorser, endorsed).call();
  }

  /**
   * Get all endorsers of an agent.
   */
  async getEndorsers(address: string): Promise<string[]> {
    return this.identityContract.methods.getEndorsers(address).call() as Promise<string[]>;
  }

  /**
   * Get total number of registered agents.
   */
  async getAgentCount(): Promise<number> {
    const count = await this.identityContract.methods.getAgentCount().call();
    return Number(count);
  }

  /**
   * Get a page of agent addresses.
   */
  async getAgentsByPage(offset: number, limit: number): Promise<string[]> {
    return this.identityContract.methods.getAgentsByPage(offset, limit).call() as Promise<string[]>;
  }

  /**
   * Get skills for an agent from the AgentSkillsRegistry.
   */
  async getSkills(address: string): Promise<SkillInfo[]> {
    const keys = await this.skillsContract.methods.getSkillKeys(address).call() as string[];
    const skills: SkillInfo[] = [];

    for (const key of keys) {
      try {
        const skill = await this.skillsContract.methods.getSkill(address, key).call();
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
  async getSkillContent(address: string, skillKey: string): Promise<{ name: string; content: string; version: number }> {
    const skill = await this.skillsContract.methods.getSkill(address, skillKey).call();
    return {
      name: skill.name,
      content: skill.content,
      version: Number(skill.version),
    };
  }
}
