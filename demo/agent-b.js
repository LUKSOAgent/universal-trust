/**
 * Agent B — The responding agent.
 *
 * Receives requests from other agents. Before responding, it calls
 * verify() on the AgentIdentityRegistry contract to confirm the caller
 * has a valid on-chain identity and meets the minimum trust threshold.
 *
 * Trust threshold: trustScore >= 100
 */

'use strict';

const { ethers } = require('ethers');
const { CONTRACT_ADDRESS, ABI, RPC_URL, TRUST_THRESHOLD } = require('./config');

/**
 * Handle an incoming request from another agent.
 *
 * @param {string} callerAddress - The address the caller claims to be.
 * @param {string} payload       - The request payload.
 * @returns {{ accepted: boolean, response?: string, reason?: string, trust?: object }}
 */
async function handleRequest(callerAddress, payload) {
  console.log(`[Agent B] Received request from ${callerAddress}`);
  console.log(`[Agent B] Verifying identity on-chain...`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const registry = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  let result;
  try {
    result = await registry.verify(callerAddress);
  } catch (err) {
    console.log(`[Agent B] ✗ RPC error: ${err.message}. Rejecting request.`);
    return { accepted: false, reason: 'RPC error' };
  }

  const trust = {
    registered:   result[0],
    active:       result[1],
    isUP:         result[2],
    reputation:   Number(result[3]),
    endorsements: Number(result[4]),
    trustScore:   Number(result[5]),
    name:         result[6],
  };

  // --- Trust gate ---

  if (!trust.registered) {
    console.log(`[Agent B] ✗ Not registered. Rejecting request.`);
    return { accepted: false, reason: 'not_registered', trust };
  }

  if (!trust.active) {
    console.log(`[Agent B] ✗ Agent is deactivated. Rejecting request.`);
    return { accepted: false, reason: 'not_active', trust };
  }

  const shortName = trust.name || 'Unknown Agent';
  console.log(
    `[Agent B] ✓ Verified: ${shortName} (trust score: ${trust.trustScore}, ${trust.endorsements} endorsements)`
  );

  if (trust.trustScore < TRUST_THRESHOLD) {
    console.log(
      `[Agent B] ✗ Trust score ${trust.trustScore} below threshold (≥ ${TRUST_THRESHOLD}). Rejecting.`
    );
    return { accepted: false, reason: 'low_trust', trust };
  }

  console.log(`[Agent B] Trust threshold met (≥ ${TRUST_THRESHOLD}). Responding.`);
  const response = 'Hello! I trust you. Here\'s my data: { balance: "1000 LYX", status: "active" }';
  console.log(`[Agent B] Response: "${response}"`);

  return { accepted: true, response, trust };
}

module.exports = { handleRequest };
