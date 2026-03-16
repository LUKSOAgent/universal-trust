/**
 * Known AI agents on LUKSO — discovered via Envio indexer.
 * These are displayed in the Trust Graph even if not yet registered on Universal Trust.
 * Source: Envio LUKSO mainnet indexer, manually curated.
 *
 * To add more agents, call:
 *   GET /api/discover-agents  (returns fresh list from Envio)
 * or fetch directly:
 *   POST https://envio.lukso-mainnet.universal.tech/v1/graphql
 *   query { Profile(where: {name: {_ilike: "%agent%"}}) { id name description } }
 */

export const KNOWN_AGENTS = [
  {
    address: "0x293E96ebbf264ed7715cff2b67850517De70232a",
    name: "LUKSO Agent",
    description: "First AI agent on LUKSO. Powered by Claude. Helps devs & community navigate the LUKSO ecosystem.",
    twitter: "@LUKSOAgent",
    tags: ["ai", "assistant", "lukso"],
  },
  {
    address: "0x1089e1c613db8cb91db72be4818632153e62557a",
    name: "Emmet",
    description: "AI agent with Universal Profile on LUKSO. Built by @fhildeb.",
    twitter: "@emmet_ai_",
    tags: ["ai", "assistant"],
  },
  {
    address: "0x73c196651f48638a094ced1f6403cea44695a337",
    name: "Agent Nezha",
    description: "Born on Base, converted to LUKSO. Agent Nezha exists to create — not to optimize the past, but to invent what doesn't yet exist.",
    twitter: "@AgentNezha",
    tags: ["ai", "creative"],
  },
  {
    address: "0x0deabe10ff3b1676c21ecad65753d9c3e5d2aab9",
    name: "Lora",
    description: "A Web3 native who knows where the bodies are buried.",
    twitter: "@lora_42_bot",
    tags: ["ai", "web3"],
  },
  {
    address: "0x888033b1492161b5f867573d675d178fa56854ae",
    name: "Agent Council",
    description: "First ever AI Agent DAO on LUKSO — controlled only by AI agents with their own Universal Profile.",
    tags: ["dao", "council", "ai"],
  },
  {
    address: "0x4d10c16638997d789fae60a1bf784dc9f95515f2",
    name: "Agentconomics",
    description: "AI agent focused on agent economics on LUKSO.",
    tags: ["ai", "economics"],
  },
  {
    address: "0xfd53058d635233cd6f9b5975eb01dbb292d43fe0",
    name: "Agent Registry",
    description: "On-chain agent registry on LUKSO.",
    tags: ["registry", "ai"],
  },
  {
    address: "0x3dd5031c9da6dc6a448f9b903caf2d31589a4ecb",
    name: "agentcrevaux",
    description: "",
    tags: ["ai"],
  },
  {
    address: "0xc8e0e92f95d9dd55054e8e94321bf38f57820a42",
    name: "agent-robbot",
    description: "",
    tags: ["ai", "bot"],
  },
];

/**
 * Fetch agents from Envio dynamically — searches for "agent", "bot", "ai" in profile names/descriptions.
 * Returns array of { address, name, description }
 */
export async function discoverAgentsFromEnvio() {
  const ENVIO = "https://envio.lukso-mainnet.universal.tech/v1/graphql";

  const queries = [
    `Profile(where: {name: {_ilike: "%agent%"}}, limit: 50) { id name description }`,
    `Profile(where: {_and: [{name: {_ilike: "%ai%"}}, {description: {_ilike: "%agent%"}}]}, limit: 20) { id name description }`,
  ];

  const results = new Map();

  await Promise.all(queries.map(async (q) => {
    try {
      const res = await fetch(ENVIO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `query { ${q} }` }),
        signal: AbortSignal.timeout(6000),
      });
      const { data } = await res.json();
      const key = Object.keys(data)[0];
      for (const p of data[key] || []) {
        if (p.id && p.name) {
          results.set(p.id.toLowerCase(), {
            address: p.id,
            name: p.name,
            description: p.description || "",
          });
        }
      }
    } catch {}
  }));

  return Array.from(results.values());
}
