/**
 * GET /api/discover-agents
 *
 * Queries the Envio LUKSO indexer for profiles with "agent" in the name.
 * Returns a JSON list of known AI agents on LUKSO mainnet.
 * CORS open — any agent can call this.
 *
 * Response:
 * { agents: [{ address, name, description }], count, source }
 */

const ENVIO = "https://envio.lukso-mainnet.universal.tech/v1/graphql";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const queries = [
      { query: `query { Profile(where: {name: {_ilike: "%agent%"}}, limit: 50) { id name description } }` },
      { query: `query { Profile(where: {description: {_ilike: "%ai agent%"}}, limit: 30) { id name description } }` },
    ];

    const results = new Map();
    await Promise.all(queries.map(async (body) => {
      const r = await fetch(ENVIO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      const { data } = await r.json();
      const key = Object.keys(data)[0];
      for (const p of data[key] || []) {
        if (p.id && p.name) {
          results.set(p.id.toLowerCase(), {
            address: p.id,
            name: p.name,
            description: p.description || "",
            profileUrl: `https://universalprofile.cloud/${p.id}`,
          });
        }
      }
    }));

    const agents = Array.from(results.values());

    return res.status(200).json({
      agents,
      count: agents.length,
      source: "Envio LUKSO mainnet indexer",
      indexer: ENVIO,
      note: "Agents with 'agent' in their UP name or 'ai agent' in description.",
    });
  } catch (err) {
    console.error("discover-agents error:", err?.message || "unknown");
    return res.status(500).json({ error: "Failed to discover agents — please try again" });
  }
}
