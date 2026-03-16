/**
 * Envio indexer integration for Universal Trust
 * Fetches Universal Profile names, avatars, and UP status for registered agents.
 *
 * Endpoint: https://envio.lukso-mainnet.universal.tech/v1/graphql
 */

const ENVIO_ENDPOINT = "https://envio.lukso-mainnet.universal.tech/v1/graphql";

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
      // Prefer images ≥ 120 wide, pick smallest of those
      const aOk = aw >= 120;
      const bOk = bw >= 120;
      if (aOk && !bOk) return -1;
      if (!aOk && bOk) return 1;
      return aw - bw;
    });
  return sorted[0]?.url || null;
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
        profileImages {
          url
          width
          height
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
      result[addr] = {
        name: profile.name || null,
        profileImage: imageUrl,
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
