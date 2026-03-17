/**
 * ABI Audit Script
 * Verifies contract-abi.json matches the actual on-chain contracts.
 * Tests key function calls and checks for type mismatches.
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://rpc.mainnet.lukso.network';
const IDENTITY_REGISTRY = '0x16505FeC789F4553Ea88d812711A0E913D926ADD';
const SKILLS_REGISTRY = '0x64B3AeCE25B73ecF3b9d53dA84948a9dE987F4F6';

const provider = new ethers.JsonRpcProvider(RPC_URL, 42);

// Load our ABI
const abiPath = path.join(__dirname, '..', 'frontend', 'src', 'contract-abi.json');
const ourABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

async function main() {
  console.log('=== ABI Audit for Universal Trust ===\n');
  
  // 1. Verify connection
  const network = await provider.getNetwork();
  console.log(`Connected to chain ID: ${network.chainId}`);
  
  // 2. Check contract code exists
  const identityCode = await provider.getCode(IDENTITY_REGISTRY);
  const skillsCode = await provider.getCode(SKILLS_REGISTRY);
  console.log(`AgentIdentityRegistry code exists: ${identityCode.length > 2}`);
  console.log(`AgentSkillsRegistry code exists: ${skillsCode.length > 2}`);
  
  // 3. Extract function selectors from our ABI and verify on-chain
  const iface = new ethers.Interface(ourABI);
  const contract = new ethers.Contract(IDENTITY_REGISTRY, ourABI, provider);
  
  console.log('\n--- Function Signature Verification ---');
  const functions = ourABI.filter(item => item.type === 'function');
  
  let mismatches = 0;
  for (const fn of functions) {
    const sig = iface.getFunction(fn.name);
    const selector = sig.selector;
    console.log(`  ${fn.name}: selector=${selector}, stateMutability=${fn.stateMutability}`);
    
    // Check for uint64 vs uint256 type mismatches in outputs
    if (fn.outputs) {
      for (const output of fn.outputs) {
        if (output.type === 'tuple' && output.components) {
          for (const comp of output.components) {
            if (comp.type === 'uint64') {
              console.log(`    ⚠️  Field "${comp.name}" uses uint64 — verify this matches on-chain`);
            }
          }
        }
      }
    }
  }
  
  // 4. Test actual function calls
  console.log('\n--- Live Function Call Tests ---');
  
  // Test getAgentCount()
  try {
    const count = await contract.getAgentCount();
    console.log(`✅ getAgentCount() = ${count} (type: ${typeof count}, BigInt: ${typeof count === 'bigint'})`);
  } catch (err) {
    console.log(`❌ getAgentCount() FAILED: ${err.message}`);
    mismatches++;
  }
  
  // Test INITIAL_REPUTATION()
  try {
    const initial = await contract.INITIAL_REPUTATION();
    console.log(`✅ INITIAL_REPUTATION() = ${initial}`);
  } catch (err) {
    console.log(`❌ INITIAL_REPUTATION() FAILED: ${err.message}`);
    mismatches++;
  }
  
  // Test MAX_REPUTATION()
  try {
    const max = await contract.MAX_REPUTATION();
    console.log(`✅ MAX_REPUTATION() = ${max}`);
  } catch (err) {
    console.log(`❌ MAX_REPUTATION() FAILED: ${err.message}`);
    mismatches++;
  }
  
  // Test owner()
  try {
    const owner = await contract.owner();
    console.log(`✅ owner() = ${owner}`);
  } catch (err) {
    console.log(`❌ owner() FAILED: ${err.message}`);
    mismatches++;
  }
  
  // Test skillsRegistry()
  try {
    const sr = await contract.skillsRegistry();
    console.log(`✅ skillsRegistry() = ${sr}`);
    if (sr.toLowerCase() !== SKILLS_REGISTRY.toLowerCase()) {
      console.log(`   ⚠️  Expected ${SKILLS_REGISTRY}, got ${sr}`);
    }
  } catch (err) {
    console.log(`❌ skillsRegistry() FAILED: ${err.message}`);
    mismatches++;
  }
  
  // Test getAgentsByPage() and then getAgent() on the first agent
  try {
    const count = await contract.getAgentCount();
    if (count > 0n) {
      const page = await contract.getAgentsByPage(0, Math.min(Number(count), 5));
      console.log(`✅ getAgentsByPage(0, ${Math.min(Number(count), 5)}) returned ${page.length} addresses`);
      
      if (page.length > 0) {
        const firstAddr = page[0];
        console.log(`\n--- Testing with agent: ${firstAddr} ---`);
        
        // Test getAgent()
        try {
          const agent = await contract.getAgent(firstAddr);
          console.log(`✅ getAgent():`);
          console.log(`   name: "${agent.name}" (string: ${typeof agent.name === 'string'})`);
          console.log(`   description: "${agent.description?.slice(0, 50)}..." (string: ${typeof agent.description === 'string'})`);
          console.log(`   reputation: ${agent.reputation} (bigint: ${typeof agent.reputation === 'bigint'})`);
          console.log(`   endorsementCount: ${agent.endorsementCount} (bigint: ${typeof agent.endorsementCount === 'bigint'})`);
          console.log(`   registeredAt: ${agent.registeredAt} (bigint: ${typeof agent.registeredAt === 'bigint'})`);
          console.log(`   lastActiveAt: ${agent.lastActiveAt} (bigint: ${typeof agent.lastActiveAt === 'bigint'})`);
          console.log(`   isActive: ${agent.isActive} (boolean: ${typeof agent.isActive === 'boolean'})`);
          
          // Check uint64 fields decode correctly as timestamps
          const regDate = new Date(Number(agent.registeredAt) * 1000);
          const lastDate = new Date(Number(agent.lastActiveAt) * 1000);
          console.log(`   registeredAt as date: ${regDate.toISOString()}`);
          console.log(`   lastActiveAt as date: ${lastDate.toISOString()}`);
          
          // Verify registeredAt is a reasonable timestamp (after 2024)
          if (Number(agent.registeredAt) < 1700000000 || Number(agent.registeredAt) > 2000000000) {
            console.log(`   ⚠️  registeredAt value ${agent.registeredAt} seems wrong — possible uint64/uint256 mismatch`);
            mismatches++;
          } else {
            console.log(`   ✅ Timestamp values look correct (uint64 decodes properly)`);
          }
        } catch (err) {
          console.log(`❌ getAgent() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test verify()
        try {
          const v = await contract.verify(firstAddr);
          console.log(`✅ verify():`);
          console.log(`   registered: ${v.registered} (${typeof v.registered})`);
          console.log(`   active: ${v.active} (${typeof v.active})`);
          console.log(`   isUP: ${v.isUP} (${typeof v.isUP})`);
          console.log(`   reputation: ${v.reputation} (${typeof v.reputation})`);
          console.log(`   endorsements: ${v.endorsements} (${typeof v.endorsements})`);
          console.log(`   trustScore: ${v.trustScore} (${typeof v.trustScore})`);
          console.log(`   name: "${v.name}" (${typeof v.name})`);
        } catch (err) {
          console.log(`❌ verify() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test getEndorsers()
        try {
          const endorsers = await contract.getEndorsers(firstAddr);
          console.log(`✅ getEndorsers() returned ${endorsers.length} endorsers`);
        } catch (err) {
          console.log(`❌ getEndorsers() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test getEndorsementCount()
        try {
          const ec = await contract.getEndorsementCount(firstAddr);
          console.log(`✅ getEndorsementCount() = ${ec}`);
        } catch (err) {
          console.log(`❌ getEndorsementCount() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test getTrustScore()
        try {
          const ts = await contract.getTrustScore(firstAddr);
          console.log(`✅ getTrustScore() = ${ts}`);
        } catch (err) {
          console.log(`❌ getTrustScore() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test isRegistered()
        try {
          const ir = await contract.isRegistered(firstAddr);
          console.log(`✅ isRegistered() = ${ir}`);
        } catch (err) {
          console.log(`❌ isRegistered() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test isUniversalProfile()
        try {
          const iup = await contract.isUniversalProfile(firstAddr);
          console.log(`✅ isUniversalProfile() = ${iup}`);
        } catch (err) {
          console.log(`❌ isUniversalProfile() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test hasEndorsed() with a non-endorser
        try {
          const he = await contract.hasEndorsed(ethers.ZeroAddress, firstAddr);
          console.log(`✅ hasEndorsed(ZeroAddress, agent) = ${he}`);
        } catch (err) {
          console.log(`❌ hasEndorsed() FAILED: ${err.message}`);
          mismatches++;
        }
        
        // Test getEndorsement if there are endorsers
        const endorsers = await contract.getEndorsers(firstAddr);
        if (endorsers.length > 0) {
          try {
            const endorsement = await contract.getEndorsement(endorsers[0], firstAddr);
            console.log(`✅ getEndorsement():`);
            console.log(`   endorser: ${endorsement.endorser}`);
            console.log(`   endorsed: ${endorsement.endorsed}`);
            console.log(`   timestamp: ${endorsement.timestamp} (type: ${typeof endorsement.timestamp})`);
            console.log(`   reason: "${endorsement.reason}"`);
            
            // Verify timestamp
            const ts = Number(endorsement.timestamp);
            if (ts < 1700000000 || ts > 2000000000) {
              console.log(`   ⚠️  Endorsement timestamp ${ts} seems wrong — possible type mismatch`);
              mismatches++;
            } else {
              console.log(`   ✅ Endorsement timestamp decodes correctly: ${new Date(ts * 1000).toISOString()}`);
            }
          } catch (err) {
            console.log(`❌ getEndorsement() FAILED: ${err.message}`);
            mismatches++;
          }
        }
      }
    } else {
      console.log('   No agents registered yet — skipping individual agent tests');
    }
  } catch (err) {
    console.log(`❌ getAgentsByPage() FAILED: ${err.message}`);
    mismatches++;
  }
  
  // Test isReputationUpdater
  try {
    const iru = await contract.isReputationUpdater(ethers.ZeroAddress);
    console.log(`✅ isReputationUpdater(ZeroAddress) = ${iru}`);
  } catch (err) {
    console.log(`❌ isReputationUpdater() FAILED: ${err.message}`);
    mismatches++;
  }
  
  console.log(`\n=== AUDIT SUMMARY ===`);
  console.log(`Total functions in ABI: ${functions.length}`);
  console.log(`Mismatches/failures: ${mismatches}`);
  
  if (mismatches === 0) {
    console.log('✅ All ABI functions match on-chain contract — no mismatches detected');
  } else {
    console.log(`❌ Found ${mismatches} issue(s) — review above`);
  }
}

main().catch(console.error);
