/**
 * Universal Trust SDK — Demo Script
 *
 * Shows how to verify agents, check trust scores, and inspect endorsements
 * on the live LUKSO mainnet AgentIdentityRegistry.
 *
 * Run:
 *   npx tsx examples/demo.ts
 */

import { AgentTrust } from '../src/index';

// Registered agents on LUKSO mainnet
const DEPLOYER = '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b';
const UP_AGENT = '0x293E96ebbf264ed7715cff2b67850517De70232a';
const RANDOM = '0x0000000000000000000000000000000000000001';

async function main() {
  const trust = new AgentTrust({
    rpcUrl: 'https://rpc.mainnet.lukso.network',
  });

  console.log('═══════════════════════════════════════════════════');
  console.log('  Universal Trust SDK — Live Demo');
  console.log('  Registry: 0x1581BA9Fb480b72df3e54f51f851a644483c6ec7');
  console.log('  Network:  LUKSO Mainnet (Chain 42)');
  console.log('═══════════════════════════════════════════════════\n');

  // ─── 1. Agent count ────────────────────────────────────────────────────
  const count = await trust.getAgentCount();
  console.log(`📊 Total registered agents: ${count}\n`);

  // ─── 2. Verify deployer agent (EOA) ────────────────────────────────────
  console.log('── Deployer Agent (EOA) ────────────────────────────');
  const deployer = await trust.verify(DEPLOYER);
  console.log(`  Address:    ${DEPLOYER}`);
  console.log(`  Registered: ${deployer.registered}`);
  console.log(`  Active:     ${deployer.active}`);
  console.log(`  Name:       ${deployer.name}`);
  console.log(`  Is UP:      ${deployer.isUniversalProfile}`);
  console.log(`  Reputation: ${deployer.reputation}`);
  console.log(`  Endorsements: ${deployer.endorsements}`);
  console.log(`  Trust Score:  ${deployer.trustScore}`);
  console.log();

  // ─── 3. Verify UP agent (Universal Profile) ───────────────────────────
  console.log('── Universal Profile Agent ─────────────────────────');
  const upAgent = await trust.verify(UP_AGENT);
  console.log(`  Address:    ${UP_AGENT}`);
  console.log(`  Registered: ${upAgent.registered}`);
  console.log(`  Active:     ${upAgent.active}`);
  console.log(`  Name:       ${upAgent.name}`);
  console.log(`  Is UP:      ${upAgent.isUniversalProfile}`);
  console.log(`  Reputation: ${upAgent.reputation}`);
  console.log(`  Endorsements: ${upAgent.endorsements}`);
  console.log(`  Trust Score:  ${upAgent.trustScore}`);
  console.log();

  // ─── 4. Check endorsement relationship ────────────────────────────────
  console.log('── Endorsement: Deployer → UP Agent ────────────────');
  const endorsement = await trust.getEndorsement(DEPLOYER, UP_AGENT);
  console.log(`  Exists:    ${endorsement.exists}`);
  if (endorsement.exists) {
    console.log(`  Reason:    "${endorsement.reason}"`);
    console.log(`  Timestamp: ${new Date(endorsement.timestamp * 1000).toISOString()}`);
  }

  const hasEndorsed = await trust.hasEndorsed(DEPLOYER, UP_AGENT);
  console.log(`  hasEndorsed: ${hasEndorsed}`);

  const endorsers = await trust.getEndorsers(UP_AGENT);
  console.log(`  UP endorsers: [${endorsers.join(', ')}]`);

  const endorsementCount = await trust.getEndorsementCount(UP_AGENT);
  console.log(`  Endorsement count: ${endorsementCount}`);
  console.log();

  // ─── 5. Verify unregistered address ────────────────────────────────────
  console.log('── Unregistered Address ────────────────────────────');
  const random = await trust.verify(RANDOM);
  console.log(`  Address:    ${RANDOM}`);
  console.log(`  Registered: ${random.registered}`);
  console.log(`  Trust Score: ${random.trustScore}`);
  console.log(`  Name:       "${random.name}"`);
  console.log();

  // ─── 6. Batch verify ──────────────────────────────────────────────────
  console.log('── Batch Verify (all 3 addresses) ──────────────────');
  const batch = await trust.verifyBatch([DEPLOYER, UP_AGENT, RANDOM]);
  for (const [addr, result] of batch) {
    const short = `${addr.slice(0, 8)}...${addr.slice(-4)}`;
    console.log(`  ${short}: registered=${result.registered}, trust=${result.trustScore}, name="${result.name}"`);
  }
  console.log();

  // ─── 7. Check reputation updater status ────────────────────────────────
  console.log('── Reputation Updater Check ────────────────────────');
  const deployerIsUpdater = await trust.isReputationUpdater(DEPLOYER);
  const randomIsUpdater = await trust.isReputationUpdater(RANDOM);
  console.log(`  Deployer is updater: ${deployerIsUpdater}`);
  console.log(`  Random is updater:   ${randomIsUpdater}`);
  console.log();

  console.log('═══════════════════════════════════════════════════');
  console.log('  Demo complete. All queries hit live LUKSO mainnet.');
  console.log('═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
