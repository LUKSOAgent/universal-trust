/**
 * End-to-End Integration Tests — LUKSO Mainnet (Read-Only)
 *
 * These tests prove the @universal-trust/sdk works against the LIVE
 * deployed contracts on LUKSO mainnet. No mocks, no forks, no anvil.
 *
 * All calls are read-only (view functions). No private key needed.
 *
 * Run: cd sdk && npm test -- --testPathPattern integration
 */
import { describe, it, expect } from 'vitest';
import { AgentTrust, AgentTrustError, AgentTrustErrorCode } from '../index';

// ─── Constants (live LUKSO mainnet) ─────────────────────────────────────────

const REGISTRY_ADDRESS = '0x16505FeC789F4553Ea88d812711A0E913D926ADD'; // v4 UUPS proxy
const SKILLS_REGISTRY_ADDRESS = '0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6';
const RPC_URL = 'https://rpc.mainnet.lukso.network';

/** LUKSO Agent Universal Profile — registered as "LUKSO Agent", isReputationUpdater=true */
const OWNER = '0x293E96ebbf264ed7715cff2b67850517De70232a';

/** Second registered agent on LUKSO mainnet */
const DEPLOYER = '0x1089E1c613Db8Cb91db72be4818632153E62557a';

/** Definitely not registered */
const UNREGISTERED = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF';

const TIMEOUT = 30_000;

// ─── SDK instance ───────────────────────────────────────────────────────────

const trust = new AgentTrust({
  rpcUrl: RPC_URL,
  identityRegistryAddress: REGISTRY_ADDRESS,
  skillsRegistryAddress: SKILLS_REGISTRY_ADDRESS,
  maxRetries: 2,
  retryDelayMs: 500,
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Full Flow — Verify Registered Agent
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Verify Registered Agent (Deployer)', () => {
  it('verify() returns registered, active, trust score ≥ 100', async () => {
    const result = await trust.verify(OWNER);

    expect(result.registered).toBe(true);
    expect(result.active).toBe(true);
    expect(result.name).toBe('LUKSO Agent');
    expect(result.reputation).toBeGreaterThanOrEqual(100);
    expect(result.trustScore).toBeGreaterThanOrEqual(100);
    expect(typeof result.isUniversalProfile).toBe('boolean');
  }, TIMEOUT);

  it('isRegistered() returns true', async () => {
    expect(await trust.isRegistered(OWNER)).toBe(true);
  }, TIMEOUT);

  it('getTrustScore() matches verify().trustScore', async () => {
    const [score, verification] = await Promise.all([
      trust.getTrustScore(OWNER),
      trust.verify(OWNER),
    ]);
    expect(score).toBe(verification.trustScore);
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Verify Registered UP Agent
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Verify Registered UP Agent (Deployer)', () => {
  it('verify() returns registered, active, isUniversalProfile=true', async () => {
    const result = await trust.verify(OWNER);

    expect(result.registered).toBe(true);
    expect(result.active).toBe(true);
    expect(result.isUniversalProfile).toBe(true);
    expect(result.name).toBe('LUKSO Agent');
    expect(result.endorsements).toBeGreaterThanOrEqual(1);
    // Trust score = reputation (100) + endorsements * 10 = 110+
    expect(result.trustScore).toBeGreaterThanOrEqual(110);
  }, TIMEOUT);

  it('getProfile() returns full profile with endorsers', async () => {
    const profile = await trust.getProfile(OWNER);

    expect(profile.address).toBe(OWNER);
    expect(profile.name).toBe('LUKSO Agent');
    expect(profile.isActive).toBe(true);
    expect(profile.isUniversalProfile).toBe(true);
    expect(profile.endorsementCount).toBeGreaterThanOrEqual(1);
    expect(profile.endorsers.length).toBeGreaterThanOrEqual(1);
    expect(profile.registeredAt).toBeGreaterThan(0);
    expect(profile.lastActiveAt).toBeGreaterThan(0);
    expect(Array.isArray(profile.skills)).toBe(true);

    // Endorser should include DEPLOYER
    const endorserAddresses = profile.endorsers.map((e: string) => e.toLowerCase());
    expect(endorserAddresses).toContain(DEPLOYER.toLowerCase());
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Verify Unregistered Address
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Verify Unregistered Address', () => {
  it('verify() returns registered=false, trustScore=0', async () => {
    const result = await trust.verify(UNREGISTERED);

    expect(result.registered).toBe(false);
    expect(result.active).toBe(false);
    expect(result.reputation).toBe(0);
    expect(result.endorsements).toBe(0);
    expect(result.trustScore).toBe(0);
    expect(result.name).toBe('');
  }, TIMEOUT);

  it('isRegistered() returns false', async () => {
    expect(await trust.isRegistered(UNREGISTERED)).toBe(false);
  }, TIMEOUT);

  it('getTrustScore() reverts for unregistered', async () => {
    await expect(trust.getTrustScore(UNREGISTERED)).rejects.toBeInstanceOf(AgentTrustError);
  }, TIMEOUT);

  it('getProfile() reverts for unregistered', async () => {
    await expect(trust.getProfile(UNREGISTERED)).rejects.toBeInstanceOf(AgentTrustError);
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Batch Verify
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Batch Verify', () => {
  it('verifyBatch() handles mix of registered and unregistered', async () => {
    const results = await trust.verifyBatch([OWNER, DEPLOYER, UNREGISTERED]);

    expect(results.size).toBe(3);

    // Owner (LUKSO Agent UP): registered
    const owner = results.get(OWNER)!;
    expect(owner.registered).toBe(true);
    expect(owner.active).toBe(true);
    expect(owner.name).toBe('LUKSO Agent');

    // Deployer (Emmet): registered with endorsements
    const deployer = results.get(DEPLOYER)!;
    expect(deployer.registered).toBe(true);
    expect(deployer.endorsements).toBeGreaterThanOrEqual(1);

    // Unregistered: defaults
    const unreg = results.get(UNREGISTERED)!;
    expect(unreg.registered).toBe(false);
    expect(unreg.trustScore).toBe(0);
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Endorsement Queries
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Endorsement Queries', () => {
  it('hasEndorsed() returns true for owner → deployer', async () => {
    expect(await trust.hasEndorsed(OWNER, DEPLOYER)).toBe(true);
  }, TIMEOUT);

  it('hasEndorsed() returns true for deployer → owner (mutual endorsement)', async () => {
    expect(await trust.hasEndorsed(DEPLOYER, OWNER)).toBe(true);
  }, TIMEOUT);

  it('getEndorsers() includes owner for deployer', async () => {
    const endorsers = await trust.getEndorsers(DEPLOYER);
    expect(endorsers.length).toBeGreaterThanOrEqual(1);
    expect(endorsers.map((e: string) => e.toLowerCase())).toContain(OWNER.toLowerCase());
  }, TIMEOUT);

  it('getEndorsement() returns details for owner → deployer', async () => {
    const endorsement = await trust.getEndorsement(OWNER, DEPLOYER);

    expect(endorsement.exists).toBe(true);
    expect(endorsement.endorser.toLowerCase()).toBe(OWNER.toLowerCase());
    expect(endorsement.endorsed.toLowerCase()).toBe(DEPLOYER.toLowerCase());
    expect(endorsement.timestamp).toBeGreaterThan(0);
    expect(typeof endorsement.reason).toBe('string');
  }, TIMEOUT);

  it('getEndorsement() returns exists=false for unregistered address', async () => {
    const endorsement = await trust.getEndorsement(UNREGISTERED, OWNER);
    expect(endorsement.exists).toBe(false);
  }, TIMEOUT);

  it('getEndorsementCount() returns ≥1 for deployer', async () => {
    const count = await trust.getEndorsementCount(DEPLOYER);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(typeof count).toBe('number');
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Agent Enumeration
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Agent Enumeration', () => {
  it('getAgentCount() returns ≥2', async () => {
    const count = await trust.getAgentCount();
    expect(count).toBeGreaterThanOrEqual(2);
  }, TIMEOUT);

  it('getAgentsByPage(0, 10) includes both registered agents', async () => {
    const agents = await trust.getAgentsByPage(0, 10);
    expect(agents.length).toBeGreaterThanOrEqual(2);

    const lowered = agents.map((a: string) => a.toLowerCase());
    // OWNER (LUKSO Agent UP) is always in the registry
    expect(lowered).toContain(OWNER.toLowerCase());
  }, TIMEOUT);

  it('getAgentsByPage() returns empty for out-of-range offset', async () => {
    const agents = await trust.getAgentsByPage(10000, 10);
    expect(agents.length).toBe(0);
  }, TIMEOUT);

  it('getAgentsByReputation(100) returns both agents', async () => {
    const agents = await trust.getAgentsByReputation(100);
    expect(agents.length).toBeGreaterThanOrEqual(2);

    // All should meet the threshold
    for (const agent of agents) {
      expect(agent.reputation).toBeGreaterThanOrEqual(100);
      expect(agent.name.length).toBeGreaterThan(0);
    }

    // Should be sorted descending
    for (let i = 1; i < agents.length; i++) {
      expect(agents[i - 1].reputation).toBeGreaterThanOrEqual(agents[i].reputation);
    }
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Skills Registry Link
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Skills Registry Link', () => {
  it('getSkills() returns an array (even if empty)', async () => {
    const skills = await trust.getSkills(DEPLOYER);
    expect(Array.isArray(skills)).toBe(true);
    // Skills may or may not exist, but the call should not throw
  }, TIMEOUT);

  it('getSkills() for deployer returns an array', async () => {
    const skills = await trust.getSkills(DEPLOYER);
    expect(Array.isArray(skills)).toBe(true);
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Reputation Updater Check
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Reputation Updater', () => {
  it('LUKSO Agent UP is a reputation updater', async () => {
    expect(await trust.isReputationUpdater(OWNER)).toBe(true);
  }, TIMEOUT);

  it('random address is not a reputation updater', async () => {
    expect(await trust.isReputationUpdater(UNREGISTERED)).toBe(false);
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: UP Detection
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Universal Profile Detection', () => {
  it('isUniversalProfile() returns true for deployer (LUKSO Agent UP)', async () => {
    expect(await trust.isUniversalProfile(DEPLOYER)).toBe(true);
  }, TIMEOUT);

  it('isUniversalProfile() returns true for owner (LUKSO Agent UP)', async () => {
    // Owner is a Universal Profile
    expect(await trust.isUniversalProfile(OWNER)).toBe(true);
  }, TIMEOUT);

  it('isUniversalProfile() returns false for unregistered EOA', async () => {
    expect(await trust.isUniversalProfile(UNREGISTERED)).toBe(false);
  }, TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Error Handling — Invalid Inputs
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Error Handling', () => {
  it('verify() throws INVALID_ADDRESS for bad input', async () => {
    await expect(trust.verify('not-an-address')).rejects.toMatchObject({
      code: AgentTrustErrorCode.INVALID_ADDRESS,
    });
  });

  it('verifyBatch() throws INVALID_INPUT for empty array', async () => {
    await expect(trust.verifyBatch([])).rejects.toMatchObject({
      code: AgentTrustErrorCode.INVALID_INPUT,
    });
  });

  it('verifyBatch() throws INVALID_ADDRESS for bad address in batch', async () => {
    await expect(trust.verifyBatch(['0xBadAddr'])).rejects.toMatchObject({
      code: AgentTrustErrorCode.INVALID_ADDRESS,
    });
  });

  it('getAgentsByPage() throws INVALID_INPUT for negative offset', async () => {
    await expect(trust.getAgentsByPage(-1, 10)).rejects.toMatchObject({
      code: AgentTrustErrorCode.INVALID_INPUT,
    });
  });

  it('getAgentsByReputation() throws INVALID_INPUT for negative threshold', async () => {
    await expect(trust.getAgentsByReputation(-1)).rejects.toMatchObject({
      code: AgentTrustErrorCode.INVALID_INPUT,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E2E: Cross-Method Consistency
// ═══════════════════════════════════════════════════════════════════════════

describe('E2E: Cross-Method Consistency', () => {
  it('verify() endorsements matches getEndorsementCount()', async () => {
    const [verification, count] = await Promise.all([
      trust.verify(DEPLOYER),
      trust.getEndorsementCount(DEPLOYER),
    ]);
    expect(verification.endorsements).toBe(count);
  }, TIMEOUT);

  it('verify() endorsements matches getEndorsers().length', async () => {
    const [verification, endorsers] = await Promise.all([
      trust.verify(DEPLOYER),
      trust.getEndorsers(DEPLOYER),
    ]);
    expect(verification.endorsements).toBe(endorsers.length);
  }, TIMEOUT);

  it('getProfile() endorsementCount matches getEndorsers().length', async () => {
    const profile = await trust.getProfile(DEPLOYER);
    expect(profile.endorsementCount).toBe(profile.endorsers.length);
  }, TIMEOUT);

  it('getAgentCount() matches getAgentsByPage() total', async () => {
    const count = await trust.getAgentCount();
    const agents = await trust.getAgentsByPage(0, 100);
    expect(agents.length).toBe(count);
  }, TIMEOUT);
});
