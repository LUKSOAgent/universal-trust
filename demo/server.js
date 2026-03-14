#!/usr/bin/env node
/**
 * Universal Trust — REST API Server Demo
 *
 * Shows how to build an agent-gated HTTP service using on-chain trust verification.
 * Agent B runs as an Express server. Before responding to any request, it verifies
 * the caller's on-chain identity via the AgentIdentityRegistry on LUKSO mainnet.
 *
 * Endpoints:
 *   GET  /verify/:address   — Verify any agent's on-chain trust status
 *   POST /request           — Agent A sends a request, Agent B verifies trust first
 *   GET  /agents            — List all registered agents
 *   GET  /health            — Health check
 *
 * Run:  node demo/server.js
 * Test: curl http://localhost:3042/verify/0x293E96ebbf264ed7715cff2b67850517De70232a
 *
 * No wallet or private key needed — all on-chain calls are read-only.
 */

'use strict';

const express = require('express');
const { ethers } = require('ethers');
const { CONTRACT_ADDRESS, ABI, RPC_URL, TRUST_THRESHOLD } = require('./config');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3042;

// ─── Shared provider & contract (singleton) ────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);

const FULL_ABI = [
  ...ABI,
  {
    inputs: [],
    name: 'getAgentCount',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    name: 'getAgentsByPage',
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getEndorsers',
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const registry = new ethers.Contract(CONTRACT_ADDRESS, FULL_ABI, provider);

// ─── Trust Gate Middleware ──────────────────────────────────────────────────

/**
 * Express middleware that verifies the caller's on-chain trust before proceeding.
 * Reads `x-agent-address` header or `from` field in JSON body.
 *
 * @param {number} minScore — Minimum trust score required (default: TRUST_THRESHOLD)
 * @returns Express middleware function
 *
 * Usage:
 *   app.post('/sensitive-endpoint', trustGate(200), handler);
 */
function trustGate(minScore = TRUST_THRESHOLD) {
  return async (req, res, next) => {
    const address = req.headers['x-agent-address'] || req.body?.from;

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Missing or invalid agent address',
        hint: 'Set x-agent-address header or include "from" in request body',
      });
    }

    try {
      const result = await registry.verify(address);
      const trust = {
        registered: result[0],
        active: result[1],
        isUP: result[2],
        reputation: Number(result[3]),
        endorsements: Number(result[4]),
        trustScore: Number(result[5]),
        name: result[6],
      };

      if (!trust.registered) {
        return res.status(403).json({
          error: 'Agent not registered',
          address,
          trustScore: 0,
          required: minScore,
        });
      }

      if (!trust.active) {
        return res.status(403).json({
          error: 'Agent is deactivated',
          address,
          name: trust.name,
        });
      }

      if (trust.trustScore < minScore) {
        return res.status(403).json({
          error: 'Insufficient trust score',
          address,
          name: trust.name,
          trustScore: trust.trustScore,
          required: minScore,
        });
      }

      // Attach trust info to request for downstream handlers
      req.agentTrust = trust;
      req.agentAddress = address;
      next();
    } catch (err) {
      console.error('[trustGate] RPC error:', err.message);
      return res.status(502).json({
        error: 'Failed to verify agent on-chain',
        detail: err.message,
      });
    }
  };
}

// ─── Routes ────────────────────────────────────────────────────────────────

/**
 * GET /verify/:address
 * Verify any agent's on-chain trust status. No authentication needed.
 */
app.get('/verify/:address', async (req, res) => {
  const { address } = req.params;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address format' });
  }

  try {
    const result = await registry.verify(address);

    const trust = {
      address,
      registered: result[0],
      active: result[1],
      isUniversalProfile: result[2],
      reputation: Number(result[3]),
      endorsements: Number(result[4]),
      trustScore: Number(result[5]),
      name: result[6],
    };

    // Fetch endorsers if registered
    let endorsers = [];
    if (trust.registered) {
      try {
        endorsers = await registry.getEndorsers(address);
      } catch (_) {
        // non-critical
      }
    }

    res.json({
      ...trust,
      endorsers,
      contract: CONTRACT_ADDRESS,
      network: 'LUKSO Mainnet',
      chainId: 42,
    });
  } catch (err) {
    console.error('[/verify] Error:', err.message);
    res.status(502).json({ error: 'RPC call failed', detail: err.message });
  }
});

/**
 * POST /request
 * Agent A sends a request to Agent B (this server).
 * Agent B verifies trust on-chain before responding.
 *
 * Body: { "from": "0x...", "payload": "any string" }
 * Header alternative: x-agent-address: 0x...
 *
 * This is the HTTP equivalent of the demo.js agent-to-agent handshake.
 */
app.post('/request', trustGate(TRUST_THRESHOLD), (req, res) => {
  // If we reach here, the agent passed the trust gate
  const trust = req.agentTrust;
  const payload = req.body?.payload || '';

  console.log(`[Agent B] Accepted request from ${trust.name} (${req.agentAddress})`);
  console.log(`[Agent B] Trust: score=${trust.trustScore}, endorsements=${trust.endorsements}, isUP=${trust.isUP}`);

  res.json({
    accepted: true,
    from: 'Agent B (Universal Trust Demo Server)',
    to: req.agentAddress,
    agentName: trust.name,
    trustScore: trust.trustScore,
    response: `Hello ${trust.name}! I verified your on-chain identity. Trust score: ${trust.trustScore}. Here's your data: { balance: "1000 LYX", status: "active" }`,
    verifiedAt: new Date().toISOString(),
  });
});

/**
 * GET /agents
 * List all registered agents from the on-chain registry.
 */
app.get('/agents', async (_req, res) => {
  try {
    const count = Number(await registry.getAgentCount());
    const addresses = await registry.getAgentsByPage(0, Math.min(count, 50));

    const agents = await Promise.all(
      addresses.map(async (addr) => {
        try {
          const result = await registry.verify(addr);
          return {
            address: addr,
            name: result[6],
            registered: result[0],
            active: result[1],
            isUniversalProfile: result[2],
            reputation: Number(result[3]),
            endorsements: Number(result[4]),
            trustScore: Number(result[5]),
          };
        } catch (_) {
          return { address: addr, error: 'Failed to fetch' };
        }
      })
    );

    res.json({
      total: count,
      agents,
      contract: CONTRACT_ADDRESS,
      network: 'LUKSO Mainnet',
    });
  } catch (err) {
    console.error('[/agents] Error:', err.message);
    res.status(502).json({ error: 'RPC call failed', detail: err.message });
  }
});

/**
 * GET /health
 * Health check — verifies the server can reach LUKSO mainnet.
 */
app.get('/health', async (_req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    res.json({
      status: 'ok',
      network: 'LUKSO Mainnet',
      chainId: 42,
      contract: CONTRACT_ADDRESS,
      latestBlock: blockNumber,
      trustThreshold: TRUST_THRESHOLD,
    });
  } catch (err) {
    res.status(503).json({ status: 'error', detail: err.message });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log();
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Universal Trust — REST API Demo Server         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();
  console.log(`  Server:     http://localhost:${PORT}`);
  console.log(`  Contract:   ${CONTRACT_ADDRESS}`);
  console.log(`  Network:    LUKSO Mainnet (Chain ID 42)`);
  console.log(`  Threshold:  Trust score ≥ ${TRUST_THRESHOLD}`);
  console.log();
  console.log('  Endpoints:');
  console.log(`    GET  /verify/:address  — Verify an agent's trust`);
  console.log('    POST /request          — Agent-to-agent request (trust-gated)');
  console.log('    GET  /agents           — List all registered agents');
  console.log('    GET  /health           — Health check');
  console.log();
  console.log('  Try it:');
  console.log(`    curl http://localhost:${PORT}/verify/0x293E96ebbf264ed7715cff2b67850517De70232a`);
  console.log();
  console.log(`    curl -X POST http://localhost:${PORT}/request \\`);
  console.log(`      -H "Content-Type: application/json" \\`);
  console.log(`      -d '{"from":"0x293E96ebbf264ed7715cff2b67850517De70232a","payload":"hello"}'`);
  console.log();
});

module.exports = { app, trustGate };
