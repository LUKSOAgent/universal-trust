/**
 * Envio indexer integration for Universal Trust
 * Fetches Universal Profile names, avatars, and UP status for registered agents.
 *
 * Endpoint: https://envio.lukso-mainnet.universal.tech/v1/graphql
 */
import { ethers } from "ethers";

/**
 * Compute the composite trust score from all data sources.
 *
 * Formula:
 *   contractTrustScore + Math.round(onChainScore × 3) + Math.min(skillsCount, 20) × 10
 *
 * Score ranges (approximate):
 *   Contract trust: 0–10,000  (reputation + endorsements × 10)
 *   On-chain activity: 0–300  (Envio score 0–100, ×3 multiplier)
 *   Skills bonus: 0–200       (up to 20 skills × 10 pts each, capped)
 *
 * Total max ≈ 10,500 — displayed prominently on TrustScoreCard, Verify, Directory.
 *
 * @param {number} trustScore - Contract-based trust score (from verify())
 * @param {number|null} onChainScore - Envio on-chain activity score (0-100)
 * @param {number} skillsCount - Number of registered skills
 * @returns {number}
 */
export function computeCompositeScore(trustScore, onChainScore, skillsCount) {
  const onChain = onChainScore ?? 0;
  const skills = Math.min(skillsCount ?? 0, 20); // cap at 20 skills to prevent gaming
  return trustScore + Math.round(onChain * 3) + skills * 10;
}

const ENVIO_ENDPOINT = "https://envio.lukso-mainnet.universal.tech/v1/graphql";
const ERC8004_ADDRESS = "0xe30B7514744D324e8bD93157E4c82230d6e6e8f3";
const RPC_URL = "https://rpc.mainnet.lukso.network";

const ERC8004_ABI = [
  "function totalAgents() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function exists(uint256 agentId) external view returns (bool)",
];

/**
 * Resolve IPFS URIs to HTTP URLs via the LUKSO IPFS gateway.
 */
export function resolveIPFS(uri) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    return `https://api.universalprofile.cloud/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

/**
 * Pick the best profile image from the profileImages array.
 * Prefers the image closest to 120px wide (small avatar size).
 */
function pickBestImage(profileImages) {
  if (!Array.isArray(profileImages) || profileImages.length === 0) return null;
  // Prefer smallest image ≥ 120px wide for avatar use
  const sorted = [...profileImages]
    .filter((img) => img.url)
    .sort((a, b) => {
      const aw = a.width || 9999;
      const bw = b.width || 9999;
      const aOk = aw >= 120;
      const bOk = bw >= 120;
      if (aOk && !bOk) return -1;
      if (!aOk && bOk) return 1;
      return aw - bw;
    });
  const url = sorted[0]?.url || null;
  return resolveIPFS(url); // always resolve ipfs:// → https://
}

/**
 * Fetch Universal Profile data (name, avatar, isEOA) for a list of addresses.
 * Returns a map of { address (lowercase) → { name, profileImage, isUP } }
 * On failure returns an empty map (Envio is optional enrichment).
 *
 * @param {string[]} addresses
 * @returns {Promise<Record<string, { name: string|null, profileImage: string|null, isUP: boolean }>>}
 */
export async function fetchUPProfiles(addresses) {
  if (!addresses || addresses.length === 0) return {};

  const lowercased = addresses.map((a) => a.toLowerCase());

  const query = `
    query GetProfiles($addresses: [String!]!) {
      Profile(where: {id: {_in: $addresses}}) {
        id
        name
        isEOA
        description
        tags
        profileImages {
          url
          width
          height
        }
        backgroundImages {
          url
          width
        }
        links {
          title
          url
        }
      }
    }
  `;

  try {
    const response = await fetch(ENVIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { addresses: lowercased } }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return {};

    const { data, errors } = await response.json();
    if (errors || !data?.Profile) return {};

    const result = {};
    for (const profile of data.Profile) {
      const addr = profile.id.toLowerCase();
      const imageUrl = pickBestImage(profile.profileImages);
      const bgUrl = pickBestImage(profile.backgroundImages);
      result[addr] = {
        name: profile.name || null,
        profileImage: imageUrl,
        backgroundImage: bgUrl,
        description: profile.description || null,
        tags: profile.tags || [],
        links: profile.links || [],
        isUP: profile.isEOA === false, // explicit false = UP; null/true = EOA
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Fetch UP profile for a single address.
 * Returns { name, profileImage, isUP } or null on failure.
 *
 * @param {string} address
 * @returns {Promise<{ name: string|null, profileImage: string|null, isUP: boolean }|null>}
 */
export async function fetchUPProfile(address) {
  if (!address) return null;
  const profiles = await fetchUPProfiles([address]);
  return profiles[address.toLowerCase()] || null;
}

/**
 * In-memory cache for on-chain reputation (TTL: 5 minutes).
 * Avoids hammering Envio on repeated lookups for the same address.
 */
const _reputationCache = new Map(); // addr → { data, expiry }
const REPUTATION_TTL = 5 * 60 * 1000; // 5 min

/**
 * Logarithmic score helper — diminishing returns, same as universal-escrow.
 * log(1 + value) / log(1 + reference) capped at 1, scaled to maxPoints.
 */
function logScore(value, reference, maxPoints) {
  if (value <= 0) return 0;
  return Math.min(Math.log(1 + value) / Math.log(1 + reference), 1) * maxPoints;
}

/**
 * Fetch on-chain reputation for a single LUKSO address.
 * One Envio GraphQL call → tx count, followers, assets issued/received, account age.
 * Results are cached for 5 minutes to avoid repeated fetches.
 *
 * Score breakdown (0–100):
 *   Transactions  35pts  (ref: 2000)
 *   Followers     20pts  (ref: 500)
 *   Assets issued 15pts  (ref: 30)
 *   Assets held   10pts  (ref: 50)
 *   Following      5pts  (ref: 100)
 *   Account age   15pts  (ref: 730 days)
 *
 * @param {string} address
 * @returns {Promise<{
 *   transactionCount: number,
 *   followersCount: number,
 *   followingCount: number,
 *   issuedAssetsCount: number,
 *   receivedAssetsCount: number,
 *   profileCreatedAt: string|null,
 *   accountAge: string|null,
 *   generalScore: number,
 *   activityLevel: string,
 * }|null>}
 */
export async function fetchOnChainReputation(address) {
  if (!address) return null;
  const addr = address.toLowerCase();

  // Cache hit
  const cached = _reputationCache.get(addr);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const query = `
    query OnChainRep($addr: String!) {
      Profile(where: { id: { _eq: $addr } }) {
        transactions_aggregate { aggregate { count } }
        lsp12IssuedAssets_aggregate { aggregate { count } }
        lsp5ReceivedAssets_aggregate { aggregate { count } }
        followed_aggregate { aggregate { count } }
        following_aggregate { aggregate { count } }
        createdTimestamp
      }
    }
  `;

  try {
    const res = await fetch(ENVIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { addr } }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const { data, errors } = await res.json();
    if (errors || !data?.Profile) return null;

    const p = data.Profile[0];
    if (!p) {
      // Address exists but no UP — return zeroed data
      const empty = {
        transactionCount: 0, followersCount: 0, followingCount: 0,
        issuedAssetsCount: 0, receivedAssetsCount: 0,
        profileCreatedAt: null, accountAge: null,
        generalScore: 0, activityLevel: "No UP",
      };
      _reputationCache.set(addr, { data: empty, expiry: Date.now() + REPUTATION_TTL });
      return empty;
    }

    const txCount    = p.transactions_aggregate?.aggregate?.count || 0;
    const issued     = p.lsp12IssuedAssets_aggregate?.aggregate?.count || 0;
    const received   = p.lsp5ReceivedAssets_aggregate?.aggregate?.count || 0;
    const followers  = p.followed_aggregate?.aggregate?.count || 0;
    const following  = p.following_aggregate?.aggregate?.count || 0;
    const createdTs  = p.createdTimestamp || null;

    let score = 0;
    score += logScore(txCount,   2000, 35);
    score += logScore(followers,  500, 20);
    score += logScore(issued,      30, 15);
    score += logScore(received,    50, 10);
    score += logScore(following,  100,  5);

    let accountAge = null;
    let profileCreatedAt = null;
    if (createdTs) {
      profileCreatedAt = new Date(createdTs * 1000).toISOString();
      const days = Math.floor((Date.now() - createdTs * 1000) / 86400000);
      score += logScore(days, 730, 15);
      if (days > 365) {
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        accountAge = `${years}y ${months}m`;
      } else if (days > 30) {
        const months = Math.floor(days / 30);
        accountAge = `${months} month${months === 1 ? "" : "s"}`;
      } else {
        accountAge = `${days} day${days === 1 ? "" : "s"}`;
      }
    }

    score = Math.round(score);

    let activityLevel;
    if (score === 0)      activityLevel = "Inactive";
    else if (score < 15)  activityLevel = "Newcomer";
    else if (score < 35)  activityLevel = "Active";
    else if (score < 60)  activityLevel = "Engaged";
    else if (score < 80)  activityLevel = "Power User";
    else                  activityLevel = "OG";

    const result = {
      transactionCount: txCount,
      followersCount: followers,
      followingCount: following,
      issuedAssetsCount: issued,
      receivedAssetsCount: received,
      profileCreatedAt,
      accountAge,
      generalScore: score,
      activityLevel,
    };

    _reputationCache.set(addr, { data: result, expiry: Date.now() + REPUTATION_TTL });
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch all agents registered on the ERC-8004 Identity Registry on LUKSO.
 * Returns an array of { agentId, owner, agentURI, metadata } objects.
 * Falls back to empty array on any error.
 *
 * @returns {Promise<Array<{ agentId: number, owner: string, agentURI: string, name: string|null, description: string|null, image: string|null }>>}
 */
export async function fetchERC8004Agents() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL, 42);
    const contract = new ethers.Contract(ERC8004_ADDRESS, ERC8004_ABI, provider);

    const total = Number(await contract.totalAgents());
    if (total === 0) return [];

    const agents = [];
    // Fetch all in parallel (reasonable for small counts)
    const ids = Array.from({ length: total }, (_, i) => i + 1);
    await Promise.all(ids.map(async (agentId) => {
      try {
        const [owner, uri] = await Promise.all([
          contract.ownerOf(agentId),
          contract.tokenURI(agentId).catch(() => ""),
        ]);

        let name = null;
        let description = null;
        let image = null;

        // Parse agentURI — supports data URI and https://
        if (uri) {
          try {
            let json = null;
            if (uri.startsWith("data:application/json;base64,")) {
              json = JSON.parse(atob(uri.slice("data:application/json;base64,".length)));
            } else if (uri.startsWith("data:application/json,")) {
              json = JSON.parse(decodeURIComponent(uri.slice("data:application/json,".length)));
            } else if (uri.startsWith("https://") || uri.startsWith("http://")) {
              const res = await fetch(uri, { signal: AbortSignal.timeout(4000) });
              if (res.ok) json = await res.json();
            } else if (uri.startsWith("ipfs://")) {
              const url = `https://api.universalprofile.cloud/ipfs/${uri.slice(7)}`;
              const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
              if (res.ok) json = await res.json();
            }
            if (json) {
              name = json.name || null;
              description = json.description || null;
              image = json.image ? resolveIPFS(json.image) : null;
            }
          } catch {}
        }

        agents.push({ agentId, owner: owner.toLowerCase(), agentURI: uri, name, description, image });
      } catch {}
    }));

    return agents;
  } catch {
    return [];
  }
}
