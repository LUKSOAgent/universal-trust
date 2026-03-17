import { ethers } from "ethers";
import { CONTRACT_ADDRESS, SKILLS_REGISTRY_ADDRESS, RPC_URL } from "./config";
import ABI from "./contract-abi.json";
import SKILLS_ABI from "./skills-abi.json";

let _provider = null;
let _contract = null;
let _skillsContract = null;

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

export function getSkillsContract() {
  if (!_skillsContract) {
    _skillsContract = new ethers.Contract(SKILLS_REGISTRY_ADDRESS, SKILLS_ABI, getProvider());
  }
  return _skillsContract;
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

export async function getWeightedTrustScore(address) {
  const contract = getContract();
  const score = await contract.getWeightedTrustScore(address);
  return Number(score);
}

export async function getBaseAddress(address) {
  const contract = getContract();
  return await contract.getBaseAddress(address);
}

export async function verifyV2(address) {
  const contract = getContract();
  const result = await contract.verifyV2(address);
  return {
    registered: result[0],
    active: result[1],
    isUP: result[2],
    reputation: Number(result[3]),
    endorsements: Number(result[4]),
    trustScore: Number(result[5]),
    weightedTrustScore: Number(result[6]),
    name: result[7],
  };
}

export async function getAllAgents() {
  const count = await getAgentCount();
  if (count === 0) return [];
  
  const addresses = await getAgentsByPage(0, count);
  const agents = [];
  
  const agentDataList = await Promise.allSettled(
    addresses.map((addr) => getAgent(addr))
  );
  const weightedScores = await Promise.allSettled(
    addresses.map((addr) => getWeightedTrustScore(addr))
  );

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    if (agentDataList[i].status === "rejected") {
      console.warn(`Failed to fetch agent ${addr}:`, agentDataList[i].reason);
      continue;
    }
    const agent = agentDataList[i].value;
    const weightedTrustScore =
      weightedScores[i].status === "fulfilled" ? weightedScores[i].value : null;
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
      weightedTrustScore,
    });
  }
  
  return agents;
}

// --- Skills Registry ---

export async function getSkillCount(address) {
  const contract = getSkillsContract();
  const count = await contract.getSkillCount(address);
  return Number(count);
}

export async function getSkills(address) {
  const contract = getSkillsContract();
  const [skills] = await contract.getAllSkills(address);
  return skills.map((s) => ({
    name: s.name,
    content: s.content,
    version: Number(s.version),
    updatedAt: Number(s.updatedAt),
  }));
}

// --- Endorsement Details ---

export async function getEndorsement(endorser, endorsed) {
  const contract = getContract();
  const e = await contract.getEndorsement(endorser, endorsed);
  return {
    endorser: e.endorser,
    endorsed: e.endorsed,
    timestamp: Number(e.timestamp),
    reason: e.reason,
  };
}
