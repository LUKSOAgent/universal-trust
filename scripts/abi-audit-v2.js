/**
 * ABI Audit Script — verifies frontend contract-abi.json matches on-chain
 * by calling key functions and checking return type decoding.
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";

const RPC = "https://rpc.mainnet.lukso.network";
const REGISTRY = "0x064b9576f37BdD7CED4405185a5DB3bc7be5614C";
const SKILLS = "0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6";

const provider = new ethers.JsonRpcProvider(RPC, 42);

// Load frontend ABI
const frontendABI = JSON.parse(readFileSync(new URL("../frontend/src/contract-abi.json", import.meta.url), "utf8"));
const contract = new ethers.Contract(REGISTRY, frontendABI, provider);

// Load skills ABI
let skillsABI;
try {
  skillsABI = JSON.parse(readFileSync(new URL("../frontend/src/skills-abi.json", import.meta.url), "utf8"));
} catch {
  console.log("⚠️  skills-abi.json not found, skipping skills registry tests");
}

const results = [];
function log(test, status, detail = "") {
  const icon = status === "OK" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`${icon} ${test}${detail ? " — " + detail : ""}`);
  results.push({ test, status, detail });
}

async function run() {
  console.log("=== ABI Audit: AgentIdentityRegistry ===");
  console.log(`Contract: ${REGISTRY}`);
  console.log(`RPC: ${RPC}\n`);

  // 1. getAgentCount
  try {
    const count = await contract.getAgentCount();
    const num = Number(count);
    log("getAgentCount()", "OK", `returns uint256 = ${num}`);
    
    if (num === 0) {
      console.log("\n⚠️  No agents registered — skipping per-agent tests");
      return;
    }

    // 2. getAgentsByPage
    const addresses = await contract.getAgentsByPage(0, Math.min(num, 5));
    log("getAgentsByPage(0, 5)", "OK", `returns address[${addresses.length}]`);

    const testAddr = addresses[0];
    console.log(`\nTesting with agent: ${testAddr}`);

    // 3. getAgent (struct)
    const agent = await contract.getAgent(testAddr);
    const fieldTypes = {
      name: "string",
      description: "string",
      metadataURI: "string",
      reputation: "bigint",
      endorsementCount: "bigint",
      registeredAt: "bigint",
      lastActiveAt: "bigint",
      isActive: "boolean",
    };
    
    let mismatch = false;
    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      const actual = typeof agent[field];
      if (actual !== expectedType) {
        log(`getAgent().${field}`, "FAIL", `expected ${expectedType}, got ${actual} (value: ${agent[field]})`);
        mismatch = true;
      }
    }
    if (!mismatch) {
      log("getAgent()", "OK", `struct decodes correctly — name="${agent.name}", rep=${agent.reputation}, endorsements=${agent.endorsementCount}, registeredAt=${agent.registeredAt} (uint64→bigint), isActive=${agent.isActive}`);
    }

    // Check registeredAt type specifically — uint64 in ABI
    // In the ABI it's uint64, ethers returns BigInt. Frontend should handle Number() conversion.
    const regAt = agent.registeredAt;
    if (typeof regAt === "bigint") {
      const asNum = Number(regAt);
      if (asNum > 0 && asNum < 2**53) {
        log("registeredAt (uint64)", "OK", `safely converts to Number: ${asNum}`);
      } else {
        log("registeredAt (uint64)", "WARN", `value ${regAt} may overflow Number`);
      }
    }

    // 4. verify()
    try {
      const v = await contract.verify(testAddr);
      log("verify()", "OK", `registered=${v.registered}, active=${v.active}, isUP=${v.isUP}, reputation=${v.reputation}, endorsements=${v.endorsements}, trustScore=${v.trustScore}, name="${v.name}"`);
      
      // Check types
      if (typeof v.reputation !== "bigint") log("verify().reputation", "FAIL", `expected bigint, got ${typeof v.reputation}`);
      if (typeof v.endorsements !== "bigint") log("verify().endorsements", "FAIL", `expected bigint, got ${typeof v.endorsements}`);
      if (typeof v.trustScore !== "bigint") log("verify().trustScore", "FAIL", `expected bigint, got ${typeof v.trustScore}`);
    } catch (err) {
      log("verify()", "FAIL", err.message);
    }

    // 5. verifyV2()
    try {
      const v2 = await contract.verifyV2(testAddr);
      log("verifyV2()", "OK", `all verify() fields + weightedTrustScore=${v2.weightedTrustScore}`);
      if (typeof v2.weightedTrustScore !== "bigint") {
        log("verifyV2().weightedTrustScore", "FAIL", `expected bigint, got ${typeof v2.weightedTrustScore}`);
      }
    } catch (err) {
      log("verifyV2()", "FAIL", err.message);
    }

    // 6. getTrustScore()
    try {
      const ts = await contract.getTrustScore(testAddr);
      log("getTrustScore()", "OK", `returns uint256 = ${ts}`);
    } catch (err) {
      log("getTrustScore()", "FAIL", err.message);
    }

    // 7. getWeightedTrustScore()
    try {
      const wts = await contract.getWeightedTrustScore(testAddr);
      log("getWeightedTrustScore()", "OK", `returns uint256 = ${wts}`);
    } catch (err) {
      log("getWeightedTrustScore()", "FAIL", err.message);
    }

    // 8. getEndorsers()
    try {
      const endorsers = await contract.getEndorsers(testAddr);
      log("getEndorsers()", "OK", `returns address[${endorsers.length}]`);

      // 9. getEndorsement() — if there are endorsers
      if (endorsers.length > 0) {
        const endorser = endorsers[0];
        try {
          const e = await contract.getEndorsement(endorser, testAddr);
          log("getEndorsement()", "OK", `endorser=${e.endorser}, endorsed=${e.endorsed}, timestamp=${e.timestamp} (uint64), reason="${e.reason}"`);
          if (typeof e.timestamp !== "bigint") {
            log("getEndorsement().timestamp", "WARN", `expected bigint (uint64), got ${typeof e.timestamp}`);
          }
        } catch (err) {
          log("getEndorsement()", "FAIL", err.message);
        }
      } else {
        log("getEndorsement()", "WARN", "no endorsers to test with");
      }
    } catch (err) {
      log("getEndorsers()", "FAIL", err.message);
    }

    // 10. isUniversalProfile()
    try {
      const isUP = await contract.isUniversalProfile(testAddr);
      log("isUniversalProfile()", "OK", `returns bool = ${isUP}`);
    } catch (err) {
      log("isUniversalProfile()", "FAIL", err.message);
    }

  } catch (err) {
    log("getAgentsByPage()", "FAIL", err.message);
  }

  // Skills Registry
  if (skillsABI) {
    console.log("\n=== ABI Audit: AgentSkillsRegistry ===");
    console.log(`Contract: ${SKILLS}\n`);
    
    const skillsContract = new ethers.Contract(SKILLS, skillsABI, provider);
    
    try {
      // List available functions
      const iface = new ethers.Interface(skillsABI);
      const fns = iface.fragments.filter(f => f.type === "function").map(f => f.name);
      log("Skills ABI functions", "OK", fns.join(", "));

      // Try getSkills if it exists
      if (fns.includes("getSkills")) {
        const testAddr2 = (await contract.getAgentsByPage(0, 1))[0];
        try {
          const skills = await skillsContract.getSkills(testAddr2);
          log("getSkills()", "OK", `returns ${skills.length} skills for ${testAddr2.slice(0, 10)}...`);
        } catch (err) {
          log("getSkills()", "FAIL", err.message);
        }
      }
    } catch (err) {
      log("Skills Registry", "FAIL", err.message);
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  const fails = results.filter(r => r.status === "FAIL");
  const warns = results.filter(r => r.status === "WARN");
  const oks = results.filter(r => r.status === "OK");
  console.log(`✅ ${oks.length} passed | ⚠️ ${warns.length} warnings | ❌ ${fails.length} failures`);
  
  if (fails.length > 0) {
    console.log("\nFailures:");
    fails.forEach(f => console.log(`  ❌ ${f.test}: ${f.detail}`));
  }

  // Check for ABI mismatches — compare function signatures
  console.log("\n=== ABI Function Signature Check ===");
  const iface = new ethers.Interface(frontendABI);
  const fnFragments = iface.fragments.filter(f => f.type === "function");
  console.log(`Frontend ABI has ${fnFragments.length} functions`);
  
  // Check for uint64 vs uint256 in getAgent return
  const getAgentFn = fnFragments.find(f => f.name === "getAgent");
  if (getAgentFn) {
    const outputs = getAgentFn.outputs;
    if (outputs.length > 0 && outputs[0].components) {
      for (const comp of outputs[0].components) {
        if (comp.name === "registeredAt" || comp.name === "lastActiveAt") {
          console.log(`  getAgent().${comp.name}: ${comp.type} (ABI defines ${comp.type})`);
        }
      }
    }
  }

  // Check verify/verifyV2 return types
  const verifyFn = fnFragments.find(f => f.name === "verify");
  if (verifyFn) {
    console.log(`  verify() returns: ${verifyFn.outputs.map(o => `${o.name}:${o.type}`).join(", ")}`);
  }
  const verifyV2Fn = fnFragments.find(f => f.name === "verifyV2");
  if (verifyV2Fn) {
    console.log(`  verifyV2() returns: ${verifyV2Fn.outputs.map(o => `${o.name}:${o.type}`).join(", ")}`);
  }
}

run().catch(console.error);
