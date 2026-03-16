/**
 * ABI Audit Script — verify every function in contract-abi.json and skills-abi.json
 * decodes correctly against on-chain contracts.
 * 
 * Usage: node scripts/audit-abi.mjs
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";

const RPC = "https://rpc.mainnet.lukso.network";
const REGISTRY = "0x16505FeC789F4553Ea88d812711A0E913D926ADD";
const SKILLS = "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6";

// A registered agent for testing (from the contract)
const TEST_AGENT = "0x293E96ebbf264ed7715cff2b67850517De70232a";
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

const provider = new ethers.JsonRpcProvider(RPC, 42);

const registryABI = JSON.parse(readFileSync(new URL("../src/contract-abi.json", import.meta.url), "utf-8"));
const skillsABI = JSON.parse(readFileSync(new URL("../src/skills-abi.json", import.meta.url), "utf-8"));

const registry = new ethers.Contract(REGISTRY, registryABI, provider);
const skills = new ethers.Contract(SKILLS, skillsABI, provider);

let passed = 0;
let failed = 0;
const mismatches = [];

async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✓ ${label}`, typeof result === "object" ? "" : `→ ${result}`);
    passed++;
  } catch (err) {
    const msg = err.message?.slice(0, 120) || String(err);
    console.log(`  ✗ ${label} — ${msg}`);
    mismatches.push({ label, error: msg });
    failed++;
  }
}

console.log("═══ AgentIdentityRegistry ABI Audit ═══");
console.log(`Contract: ${REGISTRY}\n`);

// View functions with no args
await test("INITIAL_REPUTATION() → uint256", async () => {
  const v = await registry.INITIAL_REPUTATION();
  if (typeof v !== "bigint") throw new Error(`Expected bigint, got ${typeof v}`);
  return Number(v);
});

await test("MAX_REPUTATION() → uint256", async () => {
  const v = await registry.MAX_REPUTATION();
  if (typeof v !== "bigint") throw new Error(`Expected bigint, got ${typeof v}`);
  return Number(v);
});

await test("getAgentCount() → uint256", async () => {
  const v = await registry.getAgentCount();
  if (typeof v !== "bigint") throw new Error(`Expected bigint, got ${typeof v}`);
  return Number(v);
});

await test("owner() → address", async () => {
  const v = await registry.owner();
  if (typeof v !== "string" || !v.startsWith("0x")) throw new Error(`Expected address, got ${v}`);
  return v;
});

await test("skillsRegistry() → address", async () => {
  const v = await registry.skillsRegistry();
  if (typeof v !== "string" || !v.startsWith("0x")) throw new Error(`Expected address, got ${v}`);
  return v;
});

// Functions with agent address args
await test("isRegistered(agent) → bool", async () => {
  const v = await registry.isRegistered(TEST_AGENT);
  if (typeof v !== "boolean") throw new Error(`Expected boolean, got ${typeof v}`);
  return v;
});

await test("isUniversalProfile(agent) → bool", async () => {
  const v = await registry.isUniversalProfile(TEST_AGENT);
  if (typeof v !== "boolean") throw new Error(`Expected boolean, got ${typeof v}`);
  return v;
});

await test("isReputationUpdater(agent) → bool", async () => {
  const v = await registry.isReputationUpdater(TEST_AGENT);
  if (typeof v !== "boolean") throw new Error(`Expected boolean, got ${typeof v}`);
  return v;
});

await test("getTrustScore(agent) → uint256", async () => {
  const v = await registry.getTrustScore(TEST_AGENT);
  if (typeof v !== "bigint") throw new Error(`Expected bigint, got ${typeof v}`);
  return Number(v);
});

await test("getEndorsementCount(agent) → uint256", async () => {
  const v = await registry.getEndorsementCount(TEST_AGENT);
  if (typeof v !== "bigint") throw new Error(`Expected bigint, got ${typeof v}`);
  return Number(v);
});

await test("getEndorsers(agent) → address[]", async () => {
  const v = await registry.getEndorsers(TEST_AGENT);
  if (!Array.isArray(v)) throw new Error(`Expected array, got ${typeof v}`);
  return `[${v.length} addresses]`;
});

await test("getAgent(agent) → tuple (AgentIdentity struct)", async () => {
  const v = await registry.getAgent(TEST_AGENT);
  // Check struct fields exist  
  if (typeof v.name !== "string") throw new Error(`name: expected string, got ${typeof v.name}`);
  if (typeof v.description !== "string") throw new Error(`description: expected string, got ${typeof v.description}`);
  if (typeof v.metadataURI !== "string") throw new Error(`metadataURI: expected string, got ${typeof v.metadataURI}`);
  if (typeof v.reputation !== "bigint") throw new Error(`reputation: expected bigint, got ${typeof v.reputation}`);
  if (typeof v.endorsementCount !== "bigint") throw new Error(`endorsementCount: expected bigint, got ${typeof v.endorsementCount}`);
  if (typeof v.registeredAt !== "bigint") throw new Error(`registeredAt: expected bigint, got ${typeof v.registeredAt}`);
  if (typeof v.lastActiveAt !== "bigint") throw new Error(`lastActiveAt: expected bigint, got ${typeof v.lastActiveAt}`);
  if (typeof v.isActive !== "boolean") throw new Error(`isActive: expected boolean, got ${typeof v.isActive}`);
  return `name="${v.name}", rep=${Number(v.reputation)}`;
});

await test("verify(agent) → (bool,bool,bool,uint256,uint256,uint256,string)", async () => {
  const v = await registry.verify(TEST_AGENT);
  if (typeof v[0] !== "boolean") throw new Error(`registered: expected boolean, got ${typeof v[0]}`);
  if (typeof v[1] !== "boolean") throw new Error(`active: expected boolean, got ${typeof v[1]}`);
  if (typeof v[2] !== "boolean") throw new Error(`isUP: expected boolean, got ${typeof v[2]}`);
  if (typeof v[3] !== "bigint") throw new Error(`reputation: expected bigint, got ${typeof v[3]}`);
  if (typeof v[4] !== "bigint") throw new Error(`endorsements: expected bigint, got ${typeof v[4]}`);
  if (typeof v[5] !== "bigint") throw new Error(`trustScore: expected bigint, got ${typeof v[5]}`);
  if (typeof v[6] !== "string") throw new Error(`name: expected string, got ${typeof v[6]}`);
  return `registered=${v[0]}, trust=${Number(v[5])}, name="${v[6]}"`;
});

await test("getAgentsByPage(0, 5) → address[]", async () => {
  const v = await registry.getAgentsByPage(0, 5);
  if (!Array.isArray(v)) throw new Error(`Expected array, got ${typeof v}`);
  return `[${v.length} addresses]`;
});

await test("hasEndorsed(addr, addr) → bool", async () => {
  const v = await registry.hasEndorsed(TEST_AGENT, TEST_AGENT);
  if (typeof v !== "boolean") throw new Error(`Expected boolean, got ${typeof v}`);
  return v;
});

// getEndorsement — test with a pair that may not have endorsement (should still decode or revert with known error)
await test("getEndorsement(endorser, endorsed) → tuple", async () => {
  const endorsers = await registry.getEndorsers(TEST_AGENT);
  if (endorsers.length === 0) {
    // Try with self — will revert with NotEndorsed, that's expected
    try {
      await registry.getEndorsement(ZERO_ADDR, TEST_AGENT);
      return "decoded (no endorsement found but no revert)";
    } catch (err) {
      if (err.message.includes("NotEndorsed")) return "revert as expected (no endorsement)";
      throw err;
    }
  }
  const e = await registry.getEndorsement(endorsers[0], TEST_AGENT);
  if (typeof e.endorser !== "string") throw new Error(`endorser: expected string, got ${typeof e.endorser}`);
  if (typeof e.endorsed !== "string") throw new Error(`endorsed: expected string, got ${typeof e.endorsed}`);
  if (typeof e.timestamp !== "bigint") throw new Error(`timestamp: expected bigint, got ${typeof e.timestamp}`);
  if (typeof e.reason !== "string") throw new Error(`reason: expected string, got ${typeof e.reason}`);
  return `from=${e.endorser.slice(0,8)}…, reason="${e.reason.slice(0,30)}"`;
});

console.log("\n═══ AgentSkillsRegistry ABI Audit ═══");
console.log(`Contract: ${SKILLS}\n`);

await test("getSkillCount(agent) → uint256", async () => {
  const v = await skills.getSkillCount(TEST_AGENT);
  if (typeof v !== "bigint") throw new Error(`Expected bigint, got ${typeof v}`);
  return Number(v);
});

await test("getAllSkills(agent) → (SkillData[], bytes32[])", async () => {
  const v = await skills.getAllSkills(TEST_AGENT);
  if (!Array.isArray(v) || v.length < 2) throw new Error(`Expected tuple of 2 arrays, got ${typeof v}`);
  const [skillsArr, keys] = v;
  if (!Array.isArray(skillsArr)) throw new Error(`skills: expected array, got ${typeof skillsArr}`);
  if (!Array.isArray(keys)) throw new Error(`keys: expected array, got ${typeof keys}`);
  return `${skillsArr.length} skills, ${keys.length} keys`;
});

await test("getSkillKeys(agent) → bytes32[]", async () => {
  const v = await skills.getSkillKeys(TEST_AGENT);
  if (!Array.isArray(v)) throw new Error(`Expected array, got ${typeof v}`);
  return `[${v.length} keys]`;
});

await test("hasSkill(agent, key) → bool", async () => {
  const zeroKey = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const v = await skills.hasSkill(TEST_AGENT, zeroKey);
  if (typeof v !== "boolean") throw new Error(`Expected boolean, got ${typeof v}`);
  return v;
});

await test("skillKeyFor(name) → bytes32", async () => {
  const v = await skills.skillKeyFor("test-skill");
  if (typeof v !== "string" || !v.startsWith("0x")) throw new Error(`Expected bytes32 hex, got ${typeof v}`);
  return v.slice(0, 18) + "…";
});

// Summary
console.log("\n═══════════════════════════════════════");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (mismatches.length > 0) {
  console.log("\nMismatches:");
  for (const m of mismatches) {
    console.log(`  - ${m.label}: ${m.error}`);
  }
}
console.log("═══════════════════════════════════════");

process.exit(failed > 0 ? 1 : 0);
