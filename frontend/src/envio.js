/**
 * Envio indexer integration for Universal Trust
 * Fetches Universal Profile names and avatars for registered agent addresses.
 * This is optional enrichment — failures are handled gracefully.
 *
 * Endpoint: https://envio.lukso-mainnet.universal.tech/v1/graphql
 */

const ENVIO_ENDPOINT = "https://envio.lukso-mainnet.universal.tech/v1/graphql";

/**
 * Resolve IPFS URIs to HTTP URLs via the LUKSO IPFS gateway.
 * @param {string} uri
 * @returns {string}
 */
export function resolveIPFS(uri) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    return `https://api.universalprofile.cloud/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

/**
 * Fetch Universal Profile data (name + avatar) for a list of addresses.
 * Returns a map of { address (lowercase) → { name, profileImage } }
 * On failure returns an empty map (Envio is optional).
 *
 * @param {string[]} addresses - array of EVM addresses
 * @returns {Promise<Record<string, { name: string|null, profileImage: string|null }>>}
 */
export async function fetchUPProfiles(addresses) {
  if (!addresses || addresses.length === 0) return {};

  // Normalize to lowercase for consistent keying
  const lowercased = addresses.map((a) => a.toLowerCase());

  const query = `
    query GetProfiles($addresses: [String!]!) {
      Profile(where: {id: {_in: $addresses}}) {
        id
        name
        profileImage
      }
    }
  `;

  try {
    const response = await fetch(ENVIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { addresses: lowercased } }),
      signal: AbortSignal.timeout(5000), // 5s timeout — don't block UI
    });

    if (!response.ok) return {};

    const { data, errors } = await response.json();
    if (errors || !data?.Profile) return {};

    const result = {};
    for (const profile of data.Profile) {
      const addr = profile.id.toLowerCase();
      // profileImage may be an array of images or a URI string — normalize it
      let imageUrl = null;
      if (Array.isArray(profile.profileImage) && profile.profileImage.length > 0) {
        const img = profile.profileImage[0];
        imageUrl = resolveIPFS(img?.url || img?.src || null);
      } else if (typeof profile.profileImage === "string") {
        imageUrl = resolveIPFS(profile.profileImage);
      }
      result[addr] = {
        name: profile.name || null,
        profileImage: imageUrl,
      };
    }
    return result;
  } catch {
    // Network error, timeout, parse error — silently return empty
    return {};
  }
}

/**
 * Fetch UP profile for a single address.
 * Returns { name, profileImage } or null on failure.
 *
 * @param {string} address
 * @returns {Promise<{ name: string|null, profileImage: string|null }|null>}
 */
export async function fetchUPProfile(address) {
  if (!address) return null;
  const profiles = await fetchUPProfiles([address]);
  return profiles[address.toLowerCase()] || null;
}
