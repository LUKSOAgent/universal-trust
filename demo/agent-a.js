/**
 * Agent A — The requesting agent.
 *
 * Represents a trusted AI agent with a registered on-chain identity.
 * Before sending a request, it announces its address so Agent B can
 * verify it against the AgentIdentityRegistry on LUKSO mainnet.
 */

'use strict';

const { ethers } = require('ethers');
const { CONTRACT_ADDRESS, ABI, RPC_URL } = require('./config');

// Registered UP agent — verified on LUKSO mainnet
const AGENT_A_ADDRESS = '0x293E96ebbf264ed7715cff2b67850517De70232a';

/**
 * Build the outgoing request payload that Agent A sends.
 * Includes the agent's address so the recipient can verify on-chain.
 */
async function buildRequest() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const registry = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  // Fetch own trust data to include in the request header
  const result = await registry.verify(AGENT_A_ADDRESS);

  const trustInfo = {
    registered: result[0],
    active:     result[1],
    isUP:       result[2],
    reputation: Number(result[3]),
    endorsements: Number(result[4]),
    trustScore: Number(result[5]),
    name:       result[6],
  };

  return {
    from:    AGENT_A_ADDRESS,
    payload: 'REQUEST:GET_DATA',
    trust:   trustInfo,
  };
}

module.exports = { AGENT_A_ADDRESS, buildRequest };
