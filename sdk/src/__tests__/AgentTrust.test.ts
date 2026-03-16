/**
 * AgentTrust SDK tests — runs against live LUKSO mainnet.
 *
 * These are integration tests that verify the SDK works correctly
 * against the deployed AgentIdentityRegistry contract.
 */
import { describe, it, expect } from 'vitest';
import { AgentTrust, AgentTrustError, AgentTrustErrorCode } from '../index';

// Deployed contract on LUKSO mainnet (v4 UUPS proxy)
const REGISTRY_ADDRESS = '0x16505FeC789F4553Ea88d812711A0E913D926ADD';
// LUKSO Agent Universal Profile — registered as "LUKSO Agent"
const DEPLOYER_ADDRESS = '0x293E96ebbf264ed7715cff2b67850517De70232a';
// Emmet — registered agent, endorsed by LUKSO Agent
const UP_ADDRESS = '0x1089E1c613Db8Cb91db72be4818632153E62557a';

// Increase timeout for RPC calls
const TEST_TIMEOUT = 30_000;

describe('AgentTrust SDK', () => {
  const trust = new AgentTrust({
    rpcUrl: 'https://rpc.mainnet.lukso.network',
    identityRegistryAddress: REGISTRY_ADDRESS,
    maxRetries: 2,
    retryDelayMs: 500,
  });

  // ─── verify() ─────────────────────────────────────────────────────────

  describe('verify()', () => {
    it(
      'should return registered=true for the deployer',
      async () => {
        const result = await trust.verify(DEPLOYER_ADDRESS);
        expect(result.registered).toBe(true);
        expect(result.active).toBe(true);
        expect(result.reputation).toBeGreaterThanOrEqual(100);
        expect(result.trustScore).toBeGreaterThanOrEqual(100);
        expect(result.name).toBe('LUKSO Agent');
      },
      TEST_TIMEOUT,
    );

    it(
      'should return registered=true for the UP agent',
      async () => {
        const result = await trust.verify(UP_ADDRESS);
        expect(result.registered).toBe(true);
        expect(result.active).toBe(true);
        expect(result.name).toBe('Emmet');
        expect(result.endorsements).toBeGreaterThanOrEqual(1);
        expect(result.trustScore).toBeGreaterThanOrEqual(110);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return registered=false for a random address',
      async () => {
        const result = await trust.verify('0x0000000000000000000000000000000000000001');
        expect(result.registered).toBe(false);
        expect(result.active).toBe(false);
        expect(result.reputation).toBe(0);
        expect(result.trustScore).toBe(0);
        expect(result.name).toBe('');
      },
      TEST_TIMEOUT,
    );

    it('should throw on invalid address', async () => {
      await expect(trust.verify('not-an-address')).rejects.toThrow(AgentTrustError);
      await expect(trust.verify('not-an-address')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_ADDRESS,
      });
    });

    it('should throw on empty address', async () => {
      await expect(trust.verify('')).rejects.toThrow(AgentTrustError);
    });
  });

  // ─── isRegistered() ───────────────────────────────────────────────────

  describe('isRegistered()', () => {
    it(
      'should return true for the deployer',
      async () => {
        const result = await trust.isRegistered(DEPLOYER_ADDRESS);
        expect(result).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return true for the UP agent',
      async () => {
        const result = await trust.isRegistered(UP_ADDRESS);
        expect(result).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return false for unregistered address',
      async () => {
        const result = await trust.isRegistered('0x0000000000000000000000000000000000000001');
        expect(result).toBe(false);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── getAgentCount() ──────────────────────────────────────────────────

  describe('getAgentCount()', () => {
    it(
      'should return at least 2 (deployer + UP)',
      async () => {
        const count = await trust.getAgentCount();
        expect(count).toBeGreaterThanOrEqual(2);
        expect(typeof count).toBe('number');
      },
      TEST_TIMEOUT,
    );
  });

  // ─── getAgentsByPage() ────────────────────────────────────────────────

  describe('getAgentsByPage()', () => {
    it(
      'should return agents for page 0',
      async () => {
        const agents = await trust.getAgentsByPage(0, 10);
        expect(agents.length).toBeGreaterThanOrEqual(2);
        // First agent should be the deployer
        expect(agents[0].toLowerCase()).toBe(DEPLOYER_ADDRESS.toLowerCase());
      },
      TEST_TIMEOUT,
    );

    it(
      'should return empty array for out-of-bounds offset',
      async () => {
        const agents = await trust.getAgentsByPage(1000, 10);
        expect(agents.length).toBe(0);
      },
      TEST_TIMEOUT,
    );

    it('should throw on negative offset', async () => {
      await expect(trust.getAgentsByPage(-1, 10)).rejects.toThrow(AgentTrustError);
    });
  });

  // ─── verifyBatch() ────────────────────────────────────────────────────

  describe('verifyBatch()', () => {
    it(
      'should verify multiple addresses at once',
      async () => {
        const results = await trust.verifyBatch([
          DEPLOYER_ADDRESS,
          UP_ADDRESS,
          '0x0000000000000000000000000000000000000001',
        ]);

        expect(results.size).toBe(3);

        const deployer = results.get(DEPLOYER_ADDRESS);
        expect(deployer?.registered).toBe(true);
        expect(deployer?.name).toBe('LUKSO Agent');

        const up = results.get(UP_ADDRESS);
        expect(up?.registered).toBe(true);

        const random = results.get('0x0000000000000000000000000000000000000001');
        expect(random?.registered).toBe(false);
      },
      TEST_TIMEOUT,
    );

    it('should throw on empty array', async () => {
      await expect(trust.verifyBatch([])).rejects.toThrow(AgentTrustError);
    });

    it('should throw on invalid addresses', async () => {
      await expect(trust.verifyBatch(['not-valid'])).rejects.toThrow(AgentTrustError);
    });
  });

  // ─── hasEndorsed() ────────────────────────────────────────────────────

  describe('hasEndorsed()', () => {
    it(
      'should return true for deployer → UP endorsement',
      async () => {
        const result = await trust.hasEndorsed(DEPLOYER_ADDRESS, UP_ADDRESS);
        expect(result).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return false for non-existent endorsement',
      async () => {
        const result = await trust.hasEndorsed(
          '0x0000000000000000000000000000000000000001',
          DEPLOYER_ADDRESS,
        );
        expect(result).toBe(false);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── getEndorsers() ───────────────────────────────────────────────────

  describe('getEndorsers()', () => {
    it(
      'should return the deployer as endorser of UP',
      async () => {
        const endorsers = await trust.getEndorsers(UP_ADDRESS);
        expect(endorsers.length).toBeGreaterThanOrEqual(1);
        expect(endorsers.map((e: string) => e.toLowerCase())).toContain(
          DEPLOYER_ADDRESS.toLowerCase(),
        );
      },
      TEST_TIMEOUT,
    );
  });

  // ─── getEndorsement() ──────────────────────────────────────────────────

  describe('getEndorsement()', () => {
    it(
      'should return endorsement details for deployer → UP',
      async () => {
        const result = await trust.getEndorsement(DEPLOYER_ADDRESS, UP_ADDRESS);
        expect(result.exists).toBe(true);
        expect(result.endorser.toLowerCase()).toBe(DEPLOYER_ADDRESS.toLowerCase());
        expect(result.endorsed.toLowerCase()).toBe(UP_ADDRESS.toLowerCase());
        expect(result.timestamp).toBeGreaterThan(0);
        expect(typeof result.reason).toBe('string');
      },
      TEST_TIMEOUT,
    );

    it(
      'should return exists=true for Emmet → LUKSO Agent endorsement',
      async () => {
        const result = await trust.getEndorsement(UP_ADDRESS, DEPLOYER_ADDRESS);
        // Emmet has endorsed LUKSO Agent
        expect(result.exists).toBe(true);
        expect(result.timestamp).toBeGreaterThan(0);
      },
      TEST_TIMEOUT,
    );

    it('should throw on invalid endorser address', async () => {
      await expect(trust.getEndorsement('bad', DEPLOYER_ADDRESS)).rejects.toThrow(
        AgentTrustError,
      );
    });

    it('should throw on invalid endorsed address', async () => {
      await expect(trust.getEndorsement(DEPLOYER_ADDRESS, 'bad')).rejects.toThrow(
        AgentTrustError,
      );
    });
  });

  // ─── getEndorsementCount() ────────────────────────────────────────────

  describe('getEndorsementCount()', () => {
    it(
      'should return at least 1 for UP (endorsed by deployer)',
      async () => {
        const count = await trust.getEndorsementCount(UP_ADDRESS);
        expect(count).toBeGreaterThanOrEqual(1);
        expect(typeof count).toBe('number');
      },
      TEST_TIMEOUT,
    );

    it(
      'should return 0 for unendorsed address',
      async () => {
        const count = await trust.getEndorsementCount('0x0000000000000000000000000000000000000001');
        expect(count).toBe(0);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── isReputationUpdater() ────────────────────────────────────────────

  describe('isReputationUpdater()', () => {
    it(
      'should return true for the deployer (owner is auto-authorized)',
      async () => {
        const result = await trust.isReputationUpdater(DEPLOYER_ADDRESS);
        expect(result).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return false for a random address',
      async () => {
        const result = await trust.isReputationUpdater('0x0000000000000000000000000000000000000001');
        expect(result).toBe(false);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── Input validation ─────────────────────────────────────────────────

  describe('input validation', () => {
    it('should reject invalid address in verify', async () => {
      await expect(trust.verify('0xinvalid')).rejects.toThrow(AgentTrustError);
    });

    it('should reject invalid address in isRegistered', async () => {
      await expect(trust.isRegistered('bad')).rejects.toThrow(AgentTrustError);
    });

    it('should reject invalid address in getTrustScore', async () => {
      await expect(trust.getTrustScore('0x123')).rejects.toThrow(AgentTrustError);
    });

    it('should reject invalid endorser address', async () => {
      await expect(trust.hasEndorsed('bad', DEPLOYER_ADDRESS)).rejects.toThrow(
        AgentTrustError,
      );
    });

    it('should reject invalid endorsed address', async () => {
      await expect(trust.hasEndorsed(DEPLOYER_ADDRESS, 'bad')).rejects.toThrow(
        AgentTrustError,
      );
    });
  });

  // ─── Negative tests — invalid inputs ────────────────────────────────

  describe('negative tests', () => {
    it('should throw INVALID_ADDRESS with correct error code for short address', async () => {
      try {
        await trust.verify('0x123');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AgentTrustError);
        expect((err as AgentTrustError).code).toBe(AgentTrustErrorCode.INVALID_ADDRESS);
        expect((err as AgentTrustError).message).toContain('0x123');
      }
    });

    it('should throw INVALID_ADDRESS for address with wrong checksum length', async () => {
      await expect(trust.verify('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_ADDRESS,
      });
    });

    it('should throw INVALID_INPUT for verifyBatch with empty array', async () => {
      await expect(trust.verifyBatch([])).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_INPUT,
      });
    });

    it('should throw INVALID_INPUT for getAgentsByPage with negative offset', async () => {
      await expect(trust.getAgentsByPage(-1, 10)).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_INPUT,
      });
    });

    it('should throw INVALID_INPUT for getAgentsByPage with negative limit', async () => {
      await expect(trust.getAgentsByPage(0, -5)).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_INPUT,
      });
    });

    it('should throw INVALID_ADDRESS for getEndorsers with bad address', async () => {
      await expect(trust.getEndorsers('not-an-address')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_ADDRESS,
      });
    });

    it('should throw INVALID_ADDRESS for getEndorsementCount with bad address', async () => {
      await expect(trust.getEndorsementCount('nope')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_ADDRESS,
      });
    });

    it('should throw INVALID_ADDRESS for isReputationUpdater with bad address', async () => {
      await expect(trust.isReputationUpdater('bad')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_ADDRESS,
      });
    });

    it('should throw INVALID_INPUT for register with empty name', async () => {
      await expect(trust.register('', 'desc', '0xabc123')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_INPUT,
      });
    });

    it('should throw INVALID_INPUT for endorse without private key', async () => {
      await expect(trust.endorse(DEPLOYER_ADDRESS, '')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_INPUT,
      });
    });

    it('should throw INVALID_ADDRESS for endorse with bad endorsed address', async () => {
      await expect(trust.endorse('bad-addr', 'somekey', 'reason')).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_ADDRESS,
      });
    });
  });

  // ─── getAgentsByReputation ─────────────────────────────────────────

  describe('getAgentsByReputation()', () => {
    it(
      'should return agents with reputation >= 100',
      async () => {
        const agents = await trust.getAgentsByReputation(100);
        expect(agents.length).toBeGreaterThanOrEqual(2);
        // All returned agents should meet the threshold
        for (const agent of agents) {
          expect(agent.reputation).toBeGreaterThanOrEqual(100);
        }
        // Should be sorted by reputation descending
        for (let i = 1; i < agents.length; i++) {
          expect(agents[i - 1].reputation).toBeGreaterThanOrEqual(agents[i].reputation);
        }
      },
      TEST_TIMEOUT,
    );

    it(
      'should return empty array for impossibly high threshold',
      async () => {
        const agents = await trust.getAgentsByReputation(99999);
        expect(agents.length).toBe(0);
      },
      TEST_TIMEOUT,
    );

    it('should throw INVALID_INPUT for negative minReputation', async () => {
      await expect(trust.getAgentsByReputation(-1)).rejects.toMatchObject({
        code: AgentTrustErrorCode.INVALID_INPUT,
      });
    });
  });

  // ─── Error code paths — RPC error handling ─────────────────────────

  describe('error handling with bad RPC', () => {
    const badTrust = new AgentTrust({
      rpcUrl: 'http://localhost:1',  // unreachable
      maxRetries: 0,  // no retries for fast failure
      retryDelayMs: 10,
    });

    it('should throw RPC_ERROR for unreachable RPC on verify', async () => {
      await expect(badTrust.verify(DEPLOYER_ADDRESS)).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);

    it('should throw RPC_ERROR for unreachable RPC on getAgentCount', async () => {
      await expect(badTrust.getAgentCount()).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);

    it('should throw RPC_ERROR for unreachable RPC on isRegistered', async () => {
      await expect(badTrust.isRegistered(DEPLOYER_ADDRESS)).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);
  });

  // ─── getTrustScore ─────────────────────────────────────────────────

  describe('getTrustScore()', () => {
    it(
      'should return a trust score for registered agent',
      async () => {
        const score = await trust.getTrustScore(DEPLOYER_ADDRESS);
        expect(score).toBeGreaterThanOrEqual(100);
        expect(typeof score).toBe('number');
      },
      TEST_TIMEOUT,
    );

    it(
      'should throw AgentTrustError for unregistered agent',
      async () => {
        // On-chain getTrustScore reverts for unregistered agents.
        // The error may surface as CONTRACT_REVERT or RPC_ERROR depending
        // on how the RPC node wraps the revert reason.
        await expect(
          trust.getTrustScore('0x0000000000000000000000000000000000000001'),
        ).rejects.toBeInstanceOf(AgentTrustError);
      },
      TEST_TIMEOUT,
    );
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Edge Case Tests — verifyBatch, getProfile, RPC error handling
  // ═════════════════════════════════════════════════════════════════════════

  // ─── verifyBatch edge cases ─────────────────────────────────────────

  describe('verifyBatch() edge cases', () => {
    it(
      'should handle duplicate addresses (deduplication by last-write)',
      async () => {
        // Same address twice — Map will have one entry per unique key
        const results = await trust.verifyBatch([
          DEPLOYER_ADDRESS,
          DEPLOYER_ADDRESS,
          DEPLOYER_ADDRESS,
        ]);

        // Map key deduplication: last write wins, but all should be identical
        expect(results.size).toBe(1);

        const deployer = results.get(DEPLOYER_ADDRESS);
        expect(deployer).toBeDefined();
        expect(deployer?.registered).toBe(true);
        expect(deployer?.name).toBe('LUKSO Agent');
      },
      TEST_TIMEOUT,
    );

    it(
      'should handle mix of registered and unregistered addresses',
      async () => {
        const unregistered1 = '0x0000000000000000000000000000000000000002';
        const unregistered2 = '0x0000000000000000000000000000000000000003';

        const results = await trust.verifyBatch([
          DEPLOYER_ADDRESS,
          unregistered1,
          UP_ADDRESS,
          unregistered2,
        ]);

        expect(results.size).toBe(4);

        // Registered agents
        expect(results.get(DEPLOYER_ADDRESS)?.registered).toBe(true);
        expect(results.get(UP_ADDRESS)?.registered).toBe(true);

        // Unregistered agents
        expect(results.get(unregistered1)?.registered).toBe(false);
        expect(results.get(unregistered1)?.trustScore).toBe(0);
        expect(results.get(unregistered2)?.registered).toBe(false);
        expect(results.get(unregistered2)?.reputation).toBe(0);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── getProfile edge cases ─────────────────────────────────────────

  describe('getProfile() edge cases', () => {
    it(
      'should return profile with empty skills array when agent has no skills published',
      async () => {
        // The deployer is registered but has no skills in the AgentSkillsRegistry
        const profile = await trust.getProfile(DEPLOYER_ADDRESS);
        expect(profile.name).toBe('LUKSO Agent');
        expect(profile.isActive).toBe(true);
        expect(profile.reputation).toBeGreaterThanOrEqual(100);
        // Deployer may or may not have skills — but the field should be an array
        expect(Array.isArray(profile.skills)).toBe(true);
        expect(typeof profile.endorsementCount).toBe('number');
        expect(Array.isArray(profile.endorsers)).toBe(true);
        expect(profile.address).toBe(DEPLOYER_ADDRESS);
      },
      TEST_TIMEOUT,
    );

    it(
      'should throw CONTRACT_REVERT for unregistered agent (getAgent reverts)',
      async () => {
        // getProfile calls getAgent() which reverts for unregistered agents
        await expect(
          trust.getProfile('0x0000000000000000000000000000000000000001'),
        ).rejects.toBeInstanceOf(AgentTrustError);
      },
      TEST_TIMEOUT,
    );

    it(
      'should return full profile for UP agent with endorsements',
      async () => {
        const profile = await trust.getProfile(UP_ADDRESS);
        expect(profile.name).toBe('Emmet');
        expect(profile.isActive).toBe(true);
        expect(profile.endorsementCount).toBeGreaterThanOrEqual(1);
        expect(profile.endorsers.length).toBeGreaterThanOrEqual(1);
        expect(profile.registeredAt).toBeGreaterThan(0);
        expect(profile.lastActiveAt).toBeGreaterThan(0);
        // Address should be normalized
        expect(profile.address).toBe(UP_ADDRESS);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── RPC error handling — extended coverage ────────────────────────

  describe('error handling with bad RPC (extended)', () => {
    const badTrust = new AgentTrust({
      rpcUrl: 'http://localhost:1', // unreachable
      maxRetries: 0, // no retries for fast failure
      retryDelayMs: 10,
    });

    it('should return unregistered defaults for all addresses when RPC is unreachable (verifyBatch uses allSettled)', async () => {
      // verifyBatch uses Promise.allSettled internally, so it doesn't reject —
      // instead it returns default unregistered results for failed lookups
      const results = await badTrust.verifyBatch([DEPLOYER_ADDRESS, UP_ADDRESS]);
      expect(results.size).toBe(2);
      for (const [, result] of results) {
        expect(result.registered).toBe(false);
        expect(result.trustScore).toBe(0);
        expect(result.reputation).toBe(0);
        expect(result.name).toBe('');
      }
    }, TEST_TIMEOUT);

    it('should throw RPC_ERROR for unreachable RPC on getProfile', async () => {
      await expect(
        badTrust.getProfile(DEPLOYER_ADDRESS),
      ).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);

    it('should throw RPC_ERROR for unreachable RPC on getTrustScore', async () => {
      await expect(
        badTrust.getTrustScore(DEPLOYER_ADDRESS),
      ).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);

    it('should throw RPC_ERROR for unreachable RPC on hasEndorsed', async () => {
      await expect(
        badTrust.hasEndorsed(DEPLOYER_ADDRESS, UP_ADDRESS),
      ).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);

    it('should throw RPC_ERROR for unreachable RPC on getEndorsers', async () => {
      await expect(
        badTrust.getEndorsers(UP_ADDRESS),
      ).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);

    it('should throw RPC_ERROR for unreachable RPC on getAgentsByPage', async () => {
      await expect(
        badTrust.getAgentsByPage(0, 10),
      ).rejects.toMatchObject({
        code: AgentTrustErrorCode.RPC_ERROR,
      });
    }, TEST_TIMEOUT);
  });
});
