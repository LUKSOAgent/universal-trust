/**
 * AgentTrust SDK tests — runs against live LUKSO mainnet.
 *
 * These are integration tests that verify the SDK works correctly
 * against the deployed AgentIdentityRegistry contract.
 */
import { describe, it, expect } from 'vitest';
import { AgentTrust, AgentTrustError, AgentTrustErrorCode } from '../index';

// Deployed contract on LUKSO mainnet
const REGISTRY_ADDRESS = '0x1581BA9Fb480b72df3e54f51f851a644483c6ec7';
const DEPLOYER_ADDRESS = '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b';
const UP_ADDRESS = '0x293E96ebbf264ed7715cff2b67850517De70232a';

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
        expect(result.name).toBe('LUKSO Agent');
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
      'should return exists=false for non-existent endorsement',
      async () => {
        const result = await trust.getEndorsement(UP_ADDRESS, DEPLOYER_ADDRESS);
        // UP hasn't endorsed deployer (only deployer endorsed UP)
        expect(result.exists).toBe(false);
        expect(result.timestamp).toBe(0);
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
});
