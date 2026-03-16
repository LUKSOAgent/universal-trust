/**
 * Envio indexer integration for Universal Trust
 * Fetches Universal Profile names, avatars, and UP status for registered agents.
 *
 * Endpoint: https://envio.lukso-mainnet.universal.tech/v1/graphql
 */
import { ethers } from "ethers";

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
