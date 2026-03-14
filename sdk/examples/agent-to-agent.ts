/**
 * Agent-to-Agent Trust Verification
 *
 * Demonstrates the core use case: one AI agent verifying another's
 * on-chain identity before interacting.
 *
 * This is the differentiator — agents that can cryptographically verify
 * each other without centralized intermediaries.
 *
 * Run:
 *   npx tsx examples/agent-to-agent.ts
 */

import { AgentTrust, AgentTrustError, AgentTrustErrorCode } from '../src/index';

// ─── ANSI colors ─────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// ─── Live agents on LUKSO mainnet ────────────────────────────────────────
const AGENT_A = '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b'; // Deployer EOA
const AGENT_B = '0x293E96ebbf264ed7715cff2b67850517De70232a'; // Universal Profile
const UNKNOWN = '0x0000000000000000000000000000000000000042'; // Not registered

// ─── Trust policy ────────────────────────────────────────────────────────
const MIN_TRUST_SCORE = 100;

// ─── Simulated agent interaction ─────────────────────────────────────────

interface AgentRequest {
  action: string;
  payload: Record<string, unknown>;
}

interface AgentResponse {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * This is what an agent-to-agent call looks like with Universal Trust.
 *
 * Before processing any request, the receiving agent verifies the caller's
 * on-chain identity. No API keys, no OAuth, no centralized auth server.
 * Just a single smart contract call.
 */
async function handleAgentRequest(
  trust: AgentTrust,
  callerAddress: string,
  request: AgentRequest,
): Promise<AgentResponse> {
  // Step 1: Verify caller's on-chain identity
  const verification = await trust.verify(callerAddress);

  // Step 2: Check registration
  if (!verification.registered) {
    return {
      success: false,
      error: `Rejected: ${callerAddress} is not registered in the trust registry`,
    };
  }

  // Step 3: Check active status
  if (!verification.active) {
    return {
      success: false,
      error: `Rejected: ${verification.name} is registered but deactivated`,
    };
  }

  // Step 4: Check trust threshold
  if (verification.trustScore < MIN_TRUST_SCORE) {
    return {
      success: false,
      error: `Rejected: ${verification.name} has trust score ${verification.trustScore}, minimum required is ${MIN_TRUST_SCORE}`,
    };
  }

  // Step 5: (Optional) Check for mutual endorsement
  const mutualTrust = await trust.hasEndorsed(callerAddress, AGENT_B);

  // All checks passed — process the request
  return {
    success: true,
    data: [
      `Processed "${request.action}" for ${verification.name}`,
      `  Trust score: ${verification.trustScore}`,
      `  Universal Profile: ${verification.isUniversalProfile ? 'yes' : 'no'}`,
      `  Endorsements: ${verification.endorsements}`,
      `  Mutual endorsement: ${mutualTrust ? 'yes' : 'no'}`,
    ].join('\n'),
  };
}

// ─── Run the demo ────────────────────────────────────────────────────────

async function main() {
  const trust = new AgentTrust({
    rpcUrl: 'https://rpc.mainnet.lukso.network',
  });

  console.log();
  console.log(`${C.bold}${C.magenta}Agent-to-Agent Trust Verification${C.reset}`);
  console.log(`${C.dim}Live on LUKSO mainnet — no test data${C.reset}`);
  console.log();

  const request: AgentRequest = {
    action: 'data-exchange',
    payload: { topic: 'market-analysis', format: 'json' },
  };

  // ─── Scenario 1: Known trusted agent calls us ──────────────────────
  console.log(`${C.cyan}Scenario 1:${C.reset} Registered agent with sufficient trust`);
  console.log(`${C.dim}  Agent A (${AGENT_A.slice(0, 10)}…) calls Agent B${C.reset}`);

  const result1 = await handleAgentRequest(trust, AGENT_A, request);

  if (result1.success) {
    console.log(`${C.green}  ✓ ACCEPTED${C.reset}`);
    console.log(`${C.dim}${result1.data?.split('\n').map(l => '  ' + l).join('\n')}${C.reset}`);
  } else {
    console.log(`${C.red}  ✗ REJECTED: ${result1.error}${C.reset}`);
  }

  console.log();

  // ─── Scenario 2: Universal Profile agent calls us ──────────────────
  console.log(`${C.cyan}Scenario 2:${C.reset} Universal Profile agent with endorsements`);
  console.log(`${C.dim}  Agent B (${AGENT_B.slice(0, 10)}…) calls Agent A${C.reset}`);

  const result2 = await handleAgentRequest(trust, AGENT_B, request);

  if (result2.success) {
    console.log(`${C.green}  ✓ ACCEPTED${C.reset}`);
    console.log(`${C.dim}${result2.data?.split('\n').map(l => '  ' + l).join('\n')}${C.reset}`);
  } else {
    console.log(`${C.red}  ✗ REJECTED: ${result2.error}${C.reset}`);
  }

  console.log();

  // ─── Scenario 3: Unknown agent calls us ────────────────────────────
  console.log(`${C.cyan}Scenario 3:${C.reset} Unregistered agent (should be rejected)`);
  console.log(`${C.dim}  Unknown (${UNKNOWN.slice(0, 10)}…) calls Agent B${C.reset}`);

  const result3 = await handleAgentRequest(trust, UNKNOWN, request);

  if (result3.success) {
    console.log(`${C.green}  ✓ ACCEPTED${C.reset}`);
  } else {
    console.log(`${C.red}  ✗ REJECTED${C.reset}`);
    console.log(`${C.dim}  ${result3.error}${C.reset}`);
  }

  console.log();

  // ─── Summary ───────────────────────────────────────────────────────
  console.log(`${C.bold}How it works:${C.reset}`);
  console.log(`${C.dim}  1. Agent A sends a request to Agent B`);
  console.log(`  2. Agent B calls trust.verify(agentA) — one on-chain read`);
  console.log(`  3. If registered + active + trustScore >= threshold → accept`);
  console.log(`  4. Otherwise → reject`);
  console.log(`  No API keys. No OAuth. No centralized auth server.${C.reset}`);
  console.log();
}

main().catch((err) => {
  console.error(`${C.red}${C.bold}Demo failed:${C.reset}`, err);
  process.exit(1);
});
