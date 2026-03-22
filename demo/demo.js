#!/usr/bin/env node
/**
 * Universal Trust — Agent-to-Agent Trust Handshake Demo
 *
 * Demonstrates two AI agents communicating where Agent B verifies
 * Agent A's on-chain identity (via AgentIdentityRegistry on LUKSO mainnet)
 * before deciding whether to respond.
 *
 * Run:  node demo/demo.js
 *
 * No private keys or wallet needed — all calls are read-only (view functions).
 */

'use strict';

// Resolve ethers from the frontend node_modules if not locally installed
let ethers;
try {
  ({ ethers } = require('ethers'));
} catch (_) {
  ({ ethers } = require('../frontend/node_modules/ethers'));
}

const { AGENT_A_ADDRESS, buildRequest } = require('./agent-a');
const { handleRequest }                 = require('./agent-b');

// An address that is NOT registered in the registry
const UNTRUSTED_ADDRESS = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF';

function separator(label) {
  const line = '─'.repeat(50);
  if (label) {
    console.log(`\n${line}`);
    console.log(` ${label}`);
    console.log(`${line}`);
  } else {
    console.log(`\n${line}`);
  }
}

async function runTrustedScenario() {
  separator('Scenario 1: Trusted Agent Handshake');

  // Step 1: Agent A builds its request (fetches own trust score)
  console.log(`[Agent A] Sending request to Agent B...`);
  const request = await buildRequest();
  console.log(
    `[Agent A] Identity: ${request.from.slice(0, 6)}...${request.from.slice(-4)} (trust score: ${request.trust.trustScore})`
  );

  // Step 2: Agent B receives and verifies
  const result = await handleRequest(request.from, request.payload);

  // Step 3: Agent A processes the response
  if (result.accepted) {
    console.log(`[Agent A] Received trusted response from Agent B.`);
  } else {
    console.log(`[Agent A] Request was rejected by Agent B (reason: ${result.reason}).`);
  }
}

async function runUntrustedScenario() {
  separator('Scenario 2: Untrusted Agent Rejection');

  console.log(`[Agent A*] Sending request to Agent B from unregistered address...`);
  console.log(`[Agent A*] Address: ${UNTRUSTED_ADDRESS.slice(0, 6)}...${UNTRUSTED_ADDRESS.slice(-4)}`);

  // Agent B receives request from unknown address
  const result = await handleRequest(UNTRUSTED_ADDRESS, 'REQUEST:GET_DATA');

  if (!result.accepted) {
    console.log(`[Agent A*] Request rejected. No response received.`);
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     Universal Trust — Agent-to-Agent Demo        ║');
  console.log('║     LUKSO Mainnet · AgentIdentityRegistry        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`Contract: 0x064b9576f37BdD7CED4405185a5DB3bc7be5614C`);
  console.log(`Network:  LUKSO Mainnet (Chain ID 42)`);
  console.log(`Mode:     Read-only (no wallet required)\n`);

  try {
    await runTrustedScenario();
    await runUntrustedScenario();

    separator();
    console.log(' Demo complete');
    separator();
    console.log();
    console.log('What just happened:');
    console.log('  1. Agent A announced its LUKSO address when sending a request.');
    console.log('  2. Agent B called verify() on-chain — one RPC call, no API key.');
    console.log('  3. The contract returned: registered, active, trustScore, endorsements.');
    console.log('  4. Agent B accepted (trusted) or rejected (untrusted) based on the result.');
    console.log('  5. The unregistered address was rejected instantly — no off-chain lookup needed.');
    console.log();
    console.log('This pattern works for any two agents on any EVM-compatible chain.');
    console.log('Deploy the registry, register your agents, and trust becomes composable.');
    console.log();
  } catch (err) {
    console.error('\n[ERROR]', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
