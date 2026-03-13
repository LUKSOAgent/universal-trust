import { ethers } from "ethers";
import { CONTRACT_ADDRESS, RPC_URL } from "./config";
import ABI from "./contract-abi.json";

let _provider = null;
let _contract = null;

export function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(RPC_URL, 42);
  }
  return _provider;
}

export function getContract() {
  if (!_contract) {
    _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, getProvider());
  }
  return _contract;
}

export async function getAgentCount() {
  const contract = getContract();
  const count = await contract.getAgentCount();
  return Number(count);
}

export async function getAgentsByPage(offset, limit) {
  const contract = getContract();
  return await contract.getAgentsByPage(offset, limit);
}

export async function getAgent(address) {
  const contract = getContract();
  return await contract.getAgent(address);
}

export async function verifyAgent(address) {
  const contract = getContract();
  const result = await contract.verify(address);
  return {
    registered: result[0],
    active: result[1],
    isUP: result[2],
    reputation: Number(result[3]),
    endorsements: Number(result[4]),
    trustScore: Number(result[5]),
    name: result[6],
  };
}

export async function isRegistered(address) {
  const contract = getContract();
  return await contract.isRegistered(address);
}

export async function getEndorsers(address) {
  const contract = getContract();
  return await contract.getEndorsers(address);
}

export async function getTrustScore(address) {
  const contract = getContract();
  const score = await contract.getTrustScore(address);
  return Number(score);
}

export async function getAllAgents() {
  const count = await getAgentCount();
  if (count === 0) return [];
  
  const addresses = await getAgentsByPage(0, count);
  const agents = [];
  
  for (const addr of addresses) {
    try {
      const agent = await getAgent(addr);
      agents.push({
        address: addr,
        name: agent.name,
        description: agent.description,
        metadataURI: agent.metadataURI,
        reputation: Number(agent.reputation),
        endorsementCount: Number(agent.endorsementCount),
        registeredAt: Number(agent.registeredAt),
        lastActiveAt: Number(agent.lastActiveAt),
        isActive: agent.isActive,
      });
    } catch (e) {
      console.warn(`Failed to fetch agent ${addr}:`, e);
    }
  }
  
  return agents;
}
