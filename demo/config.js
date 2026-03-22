/**
 * Shared config for the Universal Trust demo.
 */

'use strict';

const CONTRACT_ADDRESS = '0x064b9576f37BdD7CED4405185a5DB3bc7be5614C';
const RPC_URL          = 'https://rpc.mainnet.lukso.network';
const TRUST_THRESHOLD  = 100;

const ABI = [
  {
    inputs: [{ internalType: 'address', name: 'agent', type: 'address' }],
    name: 'verify',
    outputs: [
      { internalType: 'bool',    name: 'registered',   type: 'bool'    },
      { internalType: 'bool',    name: 'active',        type: 'bool'    },
      { internalType: 'bool',    name: 'isUP',          type: 'bool'    },
      { internalType: 'uint256', name: 'reputation',    type: 'uint256' },
      { internalType: 'uint256', name: 'endorsements',  type: 'uint256' },
      { internalType: 'uint256', name: 'trustScore',    type: 'uint256' },
      { internalType: 'string',  name: 'name',          type: 'string'  },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

module.exports = { CONTRACT_ADDRESS, ABI, RPC_URL, TRUST_THRESHOLD };
