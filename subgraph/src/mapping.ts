import {
  AgentRegistered,
  AgentUpdated,
  AgentDeactivated,
  AgentReactivated,
  ReputationUpdated,
  EndorsementAdded,
  EndorsementRemoved,
  ReputationUpdaterSet,
  OwnershipTransferred,
} from "../generated/AgentIdentityRegistry/AgentIdentityRegistry";
import { Agent, Endorsement, ReputationEvent, RegistryStats } from "../generated/schema";
import { BigInt, log } from "@graphprotocol/graph-ts";

// Constants
const BIGINT_ZERO = BigInt.zero();
const BIGINT_ONE = BigInt.fromI32(1);
const BIGINT_TEN = BigInt.fromI32(10);
const MAX_REPUTATION = BigInt.fromI32(10000);
const GLOBAL_STATS_ID = "global";

// Helper: Get or create global stats entity
function getOrCreateStats(): RegistryStats {
  let stats = RegistryStats.load(GLOBAL_STATS_ID);
  if (!stats) {
    stats = new RegistryStats(GLOBAL_STATS_ID);
    stats.totalAgents = BIGINT_ZERO;
    stats.totalEndorsements = BIGINT_ZERO;
    stats.activeAgents = BIGINT_ZERO;
    stats.save();
  }
  return stats;
}

// Helper: Compute trust score
function computeTrustScore(reputation: BigInt, endorsementCount: BigInt): BigInt {
  let score = reputation.plus(endorsementCount.times(BIGINT_TEN));
  return score > MAX_REPUTATION ? MAX_REPUTATION : score;
}

// Handler for AgentRegistered event
export function handleAgentRegistered(event: AgentRegistered): void {
  let agent = new Agent(event.params.agent.toHexString());
  agent.name = event.params.name;
  agent.description = "";
  agent.metadataURI = "";
  agent.reputation = BigInt.fromI32(100); // INITIAL_REPUTATION
  agent.endorsementCount = BIGINT_ZERO;
  agent.trustScore = BigInt.fromI32(100);
  agent.isActive = true;
  agent.registeredAt = BigInt.fromU64(event.params.timestamp);
  agent.lastActiveAt = BigInt.fromU64(event.params.timestamp);
  agent.save();

  // Update global stats
  let stats = getOrCreateStats();
  stats.totalAgents = stats.totalAgents.plus(BIGINT_ONE);
  stats.activeAgents = stats.activeAgents.plus(BIGINT_ONE);
  stats.save();

  log.debug("Agent registered: {}", [event.params.agent.toHexString()]);
}

// Handler for AgentUpdated event
export function handleAgentUpdated(event: AgentUpdated): void {
  let agent = Agent.load(event.params.agent.toHexString());
  if (!agent) {
    log.warning("Agent not found for update: {}", [
      event.params.agent.toHexString(),
    ]);
    return;
  }

  agent.name = event.params.name;
  agent.description = event.params.description;
  agent.metadataURI = event.params.metadataURI;
  agent.lastActiveAt = BigInt.fromU64(event.params.timestamp);
  agent.save();

  log.debug("Agent updated: {}", [event.params.agent.toHexString()]);
}

// Handler for AgentDeactivated event
export function handleAgentDeactivated(event: AgentDeactivated): void {
  let agent = Agent.load(event.params.agent.toHexString());
  if (!agent) {
    log.warning("Agent not found for deactivation: {}", [
      event.params.agent.toHexString(),
    ]);
    return;
  }

  agent.isActive = false;
  agent.save();

  // Update global stats
  let stats = getOrCreateStats();
  stats.activeAgents = stats.activeAgents > BIGINT_ZERO
    ? stats.activeAgents.minus(BIGINT_ONE)
    : BIGINT_ZERO;
  stats.save();

  log.debug("Agent deactivated: {}", [event.params.agent.toHexString()]);
}

// Handler for AgentReactivated event
export function handleAgentReactivated(event: AgentReactivated): void {
  let agent = Agent.load(event.params.agent.toHexString());
  if (!agent) {
    log.warning("Agent not found for reactivation: {}", [
      event.params.agent.toHexString(),
    ]);
    return;
  }

  agent.isActive = true;
  agent.lastActiveAt = BigInt.fromU64(event.params.timestamp);
  agent.save();

  // Update global stats
  let stats = getOrCreateStats();
  stats.activeAgents = stats.activeAgents.plus(BIGINT_ONE);
  stats.save();

  log.debug("Agent reactivated: {}", [event.params.agent.toHexString()]);
}

// Handler for ReputationUpdated event
export function handleReputationUpdated(event: ReputationUpdated): void {
  let agent = Agent.load(event.params.agent.toHexString());
  if (!agent) {
    log.warning("Agent not found for reputation update: {}", [
      event.params.agent.toHexString(),
    ]);
    return;
  }

  let oldRep = agent.reputation;
  agent.reputation = BigInt.fromU256(event.params.newReputation);
  agent.trustScore = computeTrustScore(
    agent.reputation,
    agent.endorsementCount
  );
  agent.lastActiveAt = BigInt.fromU256(event.block.timestamp);
  agent.save();

  // Create reputation event record
  let eventId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString());
  let repEvent = new ReputationEvent(eventId);
  repEvent.agent = event.params.agent.toHexString();
  repEvent.oldReputation = oldRep;
  repEvent.newReputation = BigInt.fromU256(event.params.newReputation);
  repEvent.delta = BigInt.fromI256(event.params.delta);
  repEvent.reason = event.params.reason;
  repEvent.timestamp = BigInt.fromU256(event.block.timestamp);
  repEvent.type = "update";
  repEvent.save();

  log.debug("Reputation updated for agent: {} by delta: {}", [
    event.params.agent.toHexString(),
    event.params.delta.toString(),
  ]);
}

// Handler for EndorsementAdded event
export function handleEndorsementAdded(event: EndorsementAdded): void {
  // Create endorsement entity
  let endorsementId = event.params.endorser
    .toHexString()
    .concat("-")
    .concat(event.params.endorsed.toHexString());

  let endorsement = new Endorsement(endorsementId);
  endorsement.endorser = event.params.endorser.toHexString();
  endorsement.endorsed = event.params.endorsed.toHexString();
  endorsement.reason = event.params.reason;
  endorsement.timestamp = BigInt.fromU64(event.params.timestamp);
  endorsement.active = true;
  endorsement.save();

  // Update endorsed agent's endorsement count and trust score
  let endorsed = Agent.load(event.params.endorsed.toHexString());
  if (endorsed) {
    endorsed.endorsementCount = endorsed.endorsementCount.plus(BIGINT_ONE);
    endorsed.trustScore = computeTrustScore(
      endorsed.reputation,
      endorsed.endorsementCount
    );
    endorsed.lastActiveAt = BigInt.fromU64(event.params.timestamp);
    endorsed.save();
  }

  // Update global stats
  let stats = getOrCreateStats();
  stats.totalEndorsements = stats.totalEndorsements.plus(BIGINT_ONE);
  stats.save();

  log.debug("Endorsement added: {} endorses {}", [
    event.params.endorser.toHexString(),
    event.params.endorsed.toHexString(),
  ]);
}

// Handler for EndorsementRemoved event
export function handleEndorsementRemoved(event: EndorsementRemoved): void {
  let endorsementId = event.params.endorser
    .toHexString()
    .concat("-")
    .concat(event.params.endorsed.toHexString());

  let endorsement = Endorsement.load(endorsementId);
  if (endorsement) {
    endorsement.active = false;
    endorsement.save();
  }

  // Update endorsed agent's endorsement count and trust score
  let endorsed = Agent.load(event.params.endorsed.toHexString());
  if (endorsed && endorsed.endorsementCount > BIGINT_ZERO) {
    endorsed.endorsementCount = endorsed.endorsementCount.minus(BIGINT_ONE);
    endorsed.trustScore = computeTrustScore(
      endorsed.reputation,
      endorsed.endorsementCount
    );
    endorsed.save();
  }

  // Update global stats
  let stats = getOrCreateStats();
  stats.totalEndorsements = stats.totalEndorsements > BIGINT_ZERO
    ? stats.totalEndorsements.minus(BIGINT_ONE)
    : BIGINT_ZERO;
  stats.save();

  log.debug("Endorsement removed: {} from {}", [
    event.params.endorser.toHexString(),
    event.params.endorsed.toHexString(),
  ]);
}

// Handler for ReputationUpdaterSet event
export function handleReputationUpdaterSet(event: ReputationUpdaterSet): void {
  // This event is informational; no entity model needed
  // Could be stored if needed, but for now just log it
  log.debug("Reputation updater {} set to {}", [
    event.params.updater.toHexString(),
    event.params.authorized ? "true" : "false",
  ]);
}

// Handler for OwnershipTransferred event
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  // This event is informational; ownership is tracked on-chain only
  log.debug("Ownership transferred from {} to {}", [
    event.params.previousOwner.toHexString(),
    event.params.newOwner.toHexString(),
  ]);
}
