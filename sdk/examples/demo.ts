/**
 * Universal Trust SDK — Demo Script
 *
 * Demonstrates the full SDK capabilities against live LUKSO mainnet:
 * - Agent verification & trust scoring
 * - Endorsement graph inspection
 * - Batch operations
 * - Reputation-based agent discovery
 * - Error recovery patterns
 *
 * Run:
 *   npx tsx examples/demo.ts
 */

import { AgentTrust, AgentTrustError, AgentTrustErrorCode } from '../src/index';

// ─── ANSI colors for terminal output ─────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

// ─── Registered agents on LUKSO mainnet ──────────────────────────────────
const DEPLOYER = '0x7315D3fab45468Ca552A3d3eeaF5b5b909987B7b';
const UP_AGENT = '0x293E96ebbf264ed7715cff2b67850517De70232a';
const RANDOM = '0x0000000000000000000000000000000000000001';

// ─── Helpers ─────────────────────────────────────────────────────────────

function header(title: string) {
  console.log();
  console.log(`${C.bgBlue}${C.bold}${C.white}  ${title}  ${C.reset}`);
  console.log();
}

function sectionLine() {
  console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`);
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

function trustBar(score: number, max: number = 10000): string {
  const pct = Math.min(score / max, 1);
  const filled = Math.round(pct * 20);
  const empty = 20 - filled;
  const color = pct >= 0.5 ? C.green : pct >= 0.2 ? C.yellow : C.red;
  return `${color}${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset} ${score}/${max}`;
}

function badge(label: string, value: boolean): string {
  return value
    ? `${C.bgGreen}${C.bold} ${label} ${C.reset}`
    : `${C.bgRed}${C.bold} ${label} ${C.reset}`;
}

function table(rows: [string, string][]) {
  const maxLabel = Math.max(...rows.map(([l]) => l.length));
  for (const [label, value] of rows) {
    console.log(`  ${C.cyan}${label.padEnd(maxLabel)}${C.reset}  ${value}`);
  }
}

async function main() {
  const trust = new AgentTrust({
    rpcUrl: 'https://rpc.mainnet.lukso.network',
  });

  console.log();
  console.log(`${C.bold}${C.magenta}╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.magenta}║${C.reset}  ${C.bold}Universal Trust SDK${C.reset} — Live LUKSO Mainnet Demo     ${C.bold}${C.magenta}║${C.reset}`);
  console.log(`${C.bold}${C.magenta}║${C.reset}  Registry: ${C.dim}0x064b9576…e5614C${C.reset}  Chain: ${C.cyan}42 (LUKSO)${C.reset}   ${C.bold}${C.magenta}║${C.reset}`);
  console.log(`${C.bold}${C.magenta}╚══════════════════════════════════════════════════════╝${C.reset}`);

  // ─── Section 1: Registry Overview ──────────────────────────────────
  header('1. REGISTRY OVERVIEW');

  const count = await trust.getAgentCount();
  console.log(`  ${C.bold}Total registered agents:${C.reset} ${C.green}${count}${C.reset}`);
  console.log();

  const allAgents = await trust.getAgentsByPage(0, count);
  console.log(`  ${C.dim}Address${' '.repeat(38)}  Registered${C.reset}`);
  sectionLine();
  for (const addr of allAgents) {
    const r = await trust.verify(addr);
    console.log(`  ${shortAddr(addr)}  ${r.name.padEnd(20)}  ${badge(r.active ? 'ACTIVE' : 'INACTIVE', r.active)}`);
  }

  // ─── Section 2: Deep Agent Inspection ──────────────────────────────
  header('2. AGENT VERIFICATION — Deployer (EOA)');

  const deployer = await trust.verify(DEPLOYER);
  table([
    ['Address', DEPLOYER],
    ['Name', deployer.name],
    ['Status', `${badge('Registered', deployer.registered)}  ${badge('Active', deployer.active)}`],
    ['Universal Profile', badge('UP', deployer.isUniversalProfile)],
    ['Reputation', trustBar(deployer.reputation)],
    ['Endorsements', `${deployer.endorsements}`],
    ['Trust Score', trustBar(deployer.trustScore)],
  ]);

  header('3. AGENT VERIFICATION — Universal Profile');

  const upAgent = await trust.verify(UP_AGENT);
  table([
    ['Address', UP_AGENT],
    ['Name', upAgent.name],
    ['Status', `${badge('Registered', upAgent.registered)}  ${badge('Active', upAgent.active)}`],
    ['Universal Profile', badge('UP', upAgent.isUniversalProfile)],
    ['Reputation', trustBar(upAgent.reputation)],
    ['Endorsements', `${upAgent.endorsements}`],
    ['Trust Score', trustBar(upAgent.trustScore)],
  ]);

  // ─── Section 3: Endorsement Graph ──────────────────────────────────
  header('4. ENDORSEMENT GRAPH');

  const endorsement = await trust.getEndorsement(DEPLOYER, UP_AGENT);
  console.log(`  ${C.cyan}Deployer → UP Agent${C.reset}`);
  if (endorsement.exists) {
    table([
      ['Exists', `${C.green}YES${C.reset}`],
      ['Reason', `"${endorsement.reason}"`],
      ['When', new Date(endorsement.timestamp * 1000).toISOString()],
    ]);
  } else {
    console.log(`  ${C.red}No endorsement found${C.reset}`);
  }

  console.log();
  const endorsers = await trust.getEndorsers(UP_AGENT);
  console.log(`  ${C.bold}UP Agent's endorsers (${endorsers.length}):${C.reset}`);
  for (const e of endorsers) {
    const ev = await trust.verify(e);
    console.log(`    ${C.green}✓${C.reset} ${shortAddr(e)} — ${ev.name} (trust: ${ev.trustScore})`);
  }

  // ─── Section 4: Batch Verification ─────────────────────────────────
  header('5. BATCH VERIFICATION');

  const batch = await trust.verifyBatch([DEPLOYER, UP_AGENT, RANDOM]);
  console.log(`  ${C.dim}${'Address'.padEnd(14)}  ${'Name'.padEnd(16)}  ${'Reg'.padEnd(5)}  ${'Trust'.padEnd(6)}  UP${C.reset}`);
  sectionLine();
  for (const [addr, result] of batch) {
    const regIcon = result.registered ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
    const upIcon = result.isUniversalProfile ? `${C.green}✓${C.reset}` : `${C.dim}·${C.reset}`;
    console.log(
      `  ${shortAddr(addr)}  ${(result.name || '—').padEnd(16)}  ${regIcon.padEnd(14)}  ${String(result.trustScore).padEnd(6)}  ${upIcon}`,
    );
  }

  // ─── Section 5: Agent Discovery ────────────────────────────────────
  header('6. AGENT DISCOVERY — Reputation ≥ 100');

  const topAgents = await trust.getAgentsByReputation(100);
  console.log(`  ${C.bold}Found ${topAgents.length} agent(s) with reputation ≥ 100:${C.reset}`);
  console.log();
  for (const agent of topAgents) {
    const activeIcon = agent.active ? `${C.green}●${C.reset}` : `${C.red}○${C.reset}`;
    console.log(`  ${activeIcon} ${agent.name.padEnd(20)} rep=${String(agent.reputation).padStart(5)}  trust=${String(agent.trustScore).padStart(5)}  ${C.dim}${shortAddr(agent.address)}${C.reset}`);
  }

  // ─── Section 6: Error Recovery ─────────────────────────────────────
  header('7. ERROR RECOVERY PATTERNS');

  // Pattern 1: Graceful handling of unregistered agents
  console.log(`  ${C.bold}Pattern 1:${C.reset} Safe verification (unregistered address)`);
  const unknown = await trust.verify(RANDOM);
  if (!unknown.registered) {
    console.log(`  ${C.yellow}→ Agent not found — returned safe defaults (trust=0)${C.reset}`);
    console.log(`  ${C.dim}  Use verify() instead of getTrustScore() to avoid reverts${C.reset}`);
  }
  console.log();

  // Pattern 2: Invalid address handling
  console.log(`  ${C.bold}Pattern 2:${C.reset} Invalid address graceful catch`);
  try {
    await trust.verify('0xINVALID');
  } catch (err) {
    if (err instanceof AgentTrustError && err.code === AgentTrustErrorCode.INVALID_ADDRESS) {
      console.log(`  ${C.yellow}→ Caught INVALID_ADDRESS: "${err.message.slice(0, 60)}…"${C.reset}`);
      console.log(`  ${C.dim}  Tip: Validate addresses with /^0x[0-9a-fA-F]{40}$/ before calling${C.reset}`);
    }
  }
  console.log();

  // Pattern 3: RPC failure handling
  console.log(`  ${C.bold}Pattern 3:${C.reset} RPC failure with retry`);
  const badTrust = new AgentTrust({ rpcUrl: 'http://localhost:1', maxRetries: 0 });
  try {
    await badTrust.verify(DEPLOYER);
  } catch (err) {
    if (err instanceof AgentTrustError && err.code === AgentTrustErrorCode.RPC_ERROR) {
      console.log(`  ${C.yellow}→ Caught RPC_ERROR after retries exhausted${C.reset}`);
      console.log(`  ${C.dim}  Tip: Set maxRetries and retryDelayMs in AgentTrustConfig${C.reset}`);
    }
  }
  console.log();

  // Pattern 4: Batch with mixed results
  console.log(`  ${C.bold}Pattern 4:${C.reset} Batch verify handles failures gracefully`);
  const mixed = await trust.verifyBatch([DEPLOYER, RANDOM]);
  const registered = [...mixed.values()].filter((r) => r.registered).length;
  const unregistered = [...mixed.values()].filter((r) => !r.registered).length;
  console.log(`  ${C.green}→ ${registered} registered, ${unregistered} unregistered — no errors thrown${C.reset}`);

  // ─── Done ──────────────────────────────────────────────────────────
  console.log();
  console.log(`${C.bold}${C.magenta}╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.magenta}║${C.reset}  ${C.green}✓${C.reset} Demo complete — all queries hit live LUKSO mainnet ${C.bold}${C.magenta}║${C.reset}`);
  console.log(`${C.bold}${C.magenta}╚══════════════════════════════════════════════════════╝${C.reset}`);
  console.log();
}

main().catch((err) => {
  console.error(`${C.red}${C.bold}Demo failed:${C.reset}`, err);
  process.exit(1);
});
