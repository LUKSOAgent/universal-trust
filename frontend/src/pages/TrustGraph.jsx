import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import * as d3Lib from "d3";
const d3 = d3Lib;
import { getAllAgents, getEndorsers, getEndorsement, getSkills } from "../useContract";
import { fetchUPProfiles, fetchERC8004Agents, fetchOnChainReputation, fetchLSP26RegisteredFollowers, computeCompositeScore } from "../envio";
import { KNOWN_AGENTS, discoverAgentsFromEnvio } from "../agents";

// Case-insensitive lookup helper for upProfiles (keys are always lowercase)
function upLookup(upProfiles, address) {
  if (!address) return undefined;
  return upProfiles[address.toLowerCase()] || upProfiles[address];
}

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  agent_up:          "#FF2975",   // pink   — registered UP on Universal Trust
  agent_eoa:         "#8B5CF6",   // purple — registered EOA on Universal Trust
  agent_8004:        "#F97316",   // orange — registered on ERC-8004 Identity Registry
  ecosystem:         "#10B981",   // green  — known LUKSO agent, not yet registered
  skill:             "#22D3EE",   // cyan   — skill node
  endorsement:       "#F59E0B",   // amber  — endorsement event node
  external_endorser: "#64748B",   // slate  — non-registered endorser (human UP, external)
};

const TYPE_LABELS = {
  agent_up:          "Registered (UP)",
  agent_eoa:         "Registered (EOA)",
  agent_8004:        "ERC-8004 Agent",
  ecosystem:         "LUKSO Ecosystem Agent",
  skill:             "Skill",
  endorsement:       "Endorsement",
  external_endorser: "External Endorser",
};

const NODE_R = { agent_up: 16, agent_eoa: 13, agent_8004: 13, ecosystem: 11, skill: 9, endorsement: 7, external_endorser: 11 };
const SCORE_SCALE_MAX = 2.5; // max multiplier for trust score scaling

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrustGraph() {
  const svgRef      = useRef(null);
  const containerRef = useRef(null);
  const simRef      = useRef(null);
  const gRef        = useRef(null); // d3 zoom group

  const [rawData, setRawData]     = useState(null); // { agents, edges, skills }
  const [upProfiles, setUpProfiles] = useState({});
  const [ecosystemAgents, setEcosystemAgents] = useState([]); // agents from Envio, not on Universal Trust
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [erc8004Agents, setErc8004Agents] = useState([]); // agents from ERC-8004 registry

  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null); // node id
  const [filters, setFilters]     = useState({ agent_up: true, agent_eoa: true, agent_8004: false, ecosystem: true, skill: true, endorsement: false, external_endorser: true, lsp26_follow: true });
  const [dims, setDims]           = useState({ w: 900, h: 600 });

  // AI Query
  const [aiQuery, setAiQuery]     = useState("");
  const [aiAnswer, setAiAnswer]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── Measure container ──────────────────────────────────────────────────────
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: r.width || 900, h: Math.max(520, window.innerHeight - 280) });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    document.title = "Trust Graph — Universal Trust";
    return () => { document.title = "Universal Trust"; };
  }, []);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const agentList = await getAllAgents();

        // Endorsement edges
        const edgeSet = new Set();
        const endorseEdges = [];
        await Promise.all(agentList.map(async (agent) => {
          try {
            const endorsers = await getEndorsers(agent.address);
            for (const endorser of endorsers) {
              const key = `${endorser}→${agent.address}`;
              if (!edgeSet.has(key)) {
                edgeSet.add(key);
                let reason = "";
                try {
                  const e = await getEndorsement(endorser, agent.address);
                  reason = e.reason || "";
                } catch {}
                endorseEdges.push({ source: endorser, target: agent.address, reason });
              }
            }
          } catch {}
        }));

        // Skills
        const skillMap = {}; // agentAddr → [skillName, ...]
        await Promise.all(agentList.map(async (agent) => {
          try {
            const skills = await getSkills(agent.address);
            if (skills.length > 0) skillMap[agent.address] = skills;
          } catch {}
        }));

        // Enrich agents with Envio activity scores + LSP26 followers for composite score (non-blocking)
        const agentAddrsLower = agentList.map((a) => a.address.toLowerCase());
        Promise.allSettled([
          Promise.allSettled(agentList.map((a) => fetchOnChainReputation(a.address))),
          Promise.allSettled(agentList.map((a) => fetchLSP26RegisteredFollowers(a.address, agentAddrsLower))),
        ]).then(([repResults, lsp26Results]) => {
            const enriched = agentList.map((agent, i) => {
              const onChainScore = repResults.value?.[i]?.status === "fulfilled"
                ? (repResults.value[i].value?.generalScore ?? null)
                : null;
              const skillCount = (skillMap[agent.address] || []).length;
              const lsp26Data = lsp26Results.value?.[i]?.status === "fulfilled"
                ? (lsp26Results.value[i].value ?? { count: 0, addresses: [] })
                : { count: 0, addresses: [] };
              const lsp26Score = lsp26Data.count * 5;
              const composite = computeCompositeScore(
                agent.trustScore ?? agent.reputation + agent.endorsementCount * 10,
                onChainScore,
                skillCount,
                lsp26Score
              );
              return { ...agent, onChainScore, skillCount, lsp26FollowerCount: lsp26Data.count, lsp26Followers: lsp26Data.addresses, lsp26Score, composite };
            });
            // Build LSP26 follow edges from stored follower addresses
            const lsp26Edges = [];
            for (const agent of enriched) {
              for (const followerAddr of (agent.lsp26Followers ?? [])) {
                lsp26Edges.push({
                  source: followerAddr,
                  target: agent.address,
                  kind: "lsp26-follow",
                });
              }
            }
            setRawData({ agents: enriched, edges: endorseEdges, lsp26Edges, skills: skillMap });
          })
          .catch(() => {});

        setRawData({ agents: agentList, edges: endorseEdges, lsp26Edges: [], skills: skillMap });

        // Load ecosystem agents from Envio (non-blocking)
        const registeredAddrs = new Set(agentList.map((a) => a.address.toLowerCase()));

        // Start with known curated list immediately
        const filtered = KNOWN_AGENTS.filter((a) => !registeredAddrs.has(a.address.toLowerCase()));
        setEcosystemAgents(filtered);

        // Then enrich with live Envio discovery
        discoverAgentsFromEnvio().then((discovered) => {
          const unique = discovered.filter((a) => !registeredAddrs.has(a.address.toLowerCase()));
          // Merge with curated (curated takes precedence for known addresses)
          const curatedAddrs = new Set(KNOWN_AGENTS.map((a) => a.address.toLowerCase()));
          const curatedBase = KNOWN_AGENTS.filter((a) => !registeredAddrs.has(a.address.toLowerCase()));
          const seenNames = new Set(curatedBase.map((a) => (a.name || "").toLowerCase()));
          const merged = [
            ...curatedBase,
            ...unique.filter((a) => {
              if (curatedAddrs.has(a.address.toLowerCase())) return false;
              // Deduplicate by name to avoid "Agents on LUKSO" appearing twice
              const nameLower = (a.name || "").toLowerCase();
              if (nameLower && seenNames.has(nameLower)) return false;
              seenNames.add(nameLower);
              return true;
            }),
          ];
          setEcosystemAgents(merged);

          // Fetch UP profiles for ecosystem agents too
          fetchUPProfiles(merged.map((a) => a.address))
            .then((eco) => setUpProfiles((prev) => ({ ...prev, ...eco })))
            .catch(() => {});
        }).catch(() => {});

        fetchUPProfiles(agentList.map((a) => a.address))
          .then((profiles) => {
            setUpProfiles(profiles);
            // Also load UP profiles for external endorsers (non-registered endorsers)
            const registeredAddresses = new Set(agentList.map((a) => a.address.toLowerCase()));
            const externalEndorsers = [...new Set(
              endorseEdges
                .map((e) => e.source)
                .filter((addr) => !registeredAddresses.has(addr.toLowerCase()))
            )];
            if (externalEndorsers.length > 0) {
              fetchUPProfiles(externalEndorsers)
                .then((extProfiles) => setUpProfiles((prev) => ({ ...prev, ...extProfiles })))
                .catch(() => {});
            }
          })
          .catch(() => {});

        // Load ERC-8004 agents (non-blocking)
        fetchERC8004Agents().then((agents8004) => {
          setErc8004Agents(agents8004);
          // Enrich UP profiles for ERC-8004 owners too
          fetchUPProfiles(agents8004.map((a) => a.owner))
            .then((profiles) => setUpProfiles((prev) => ({ ...prev, ...profiles })))
            .catch(() => {});
        }).catch(() => {});

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Build graph nodes/links from rawData + filters ─────────────────────────
  const buildGraph = useCallback(() => {
    if (!rawData) return { nodes: [], links: [] };
    const { agents, edges, skills, lsp26Edges = [] } = rawData;

    const nodes = [];
    const links = [];
    const nodeIds = new Set();

    // Agent nodes (registered on Universal Trust)
    for (const a of agents) {
      const upData = upLookup(upProfiles, a.address); const type = (upData?.isUP === true) ? "agent_up" : "agent_eoa";
      if (!filters[type]) continue;
      // Use composite score (contract + activity + skills) if available, else fallback
      const score = a.composite ?? a.trustScore ?? (a.reputation + a.endorsementCount * 10);
      const rScale = d3.scaleSqrt().domain([0, 500]).range([1, SCORE_SCALE_MAX]);
      nodes.push({
        id: a.address,
        type,
        label: upLookup(upProfiles, a.address)?.name || a.name || a.address.slice(0, 8) + "…",
        fullName: a.name,
        address: a.address,
        trustScore: score,
        endorsementCount: a.endorsementCount,
        reputation: a.reputation,
        description: a.description,
        r: NODE_R[type] * Math.max(1, rScale(score)),
        registered: true,
      });
      nodeIds.add(a.address);
    }

    // ERC-8004 agents (registered on ERC-8004 Identity Registry, may or may not be on Universal Trust)
    if (filters.agent_8004) {
      for (const a of erc8004Agents) {
        if (nodeIds.has(a.owner)) continue; // already shown as agent_up / agent_eoa node
        const upData = upLookup(upProfiles, a.owner);
        const name = upData?.name || a.name || `Agent #${a.agentId}`;
        nodes.push({
          id: a.owner,
          type: "agent_8004",
          label: name,
          address: a.owner,
          agentId: a.agentId,
          description: a.description || "",
          r: NODE_R.agent_8004,
          registered: false,
          erc8004: true,
        });
        nodeIds.add(a.owner);
      }
    }

    // Ecosystem agents (known LUKSO agents, not yet on Universal Trust)
    if (filters.ecosystem) {
      for (const a of ecosystemAgents) {
        if (nodeIds.has(a.address)) continue; // already registered
        const name = upLookup(upProfiles, a.address)?.name || a.name || a.address.slice(0, 8) + "…";
        nodes.push({
          id: a.address,
          type: "ecosystem",
          label: name,
          address: a.address,
          description: a.description || "",
          twitter: a.twitter || null,
          tags: a.tags || [],
          r: NODE_R.ecosystem,
          registered: false,
        });
        nodeIds.add(a.address);
      }
    }

    // Skill nodes
    if (filters.skill) {
      for (const [agentAddr, skillList] of Object.entries(skills)) {
        if (!nodeIds.has(agentAddr)) continue;
        for (const s of skillList) {
          const skillId = `skill:${agentAddr}:${s.name}`;
          nodes.push({
            id: skillId,
            type: "skill",
            label: s.name,
            r: NODE_R.skill,
            agentAddr,
            content: s.content,
          });
          nodeIds.add(skillId);
          links.push({ source: agentAddr, target: skillId, kind: "has-skill" });
        }
      }
    }

    // External endorser nodes — endorsers not already in the graph
    if (filters.external_endorser) {
      for (const e of edges) {
        if (nodeIds.has(e.source)) continue; // already in graph
        if (!nodeIds.has(e.target)) continue; // target must exist
        const upData = upLookup(upProfiles, e.source);
        const label = upData?.name || (e.source.slice(0, 6) + "…" + e.source.slice(-4));
        nodes.push({
          id: e.source,
          type: "external_endorser",
          label,
          address: e.source,
          r: NODE_R.external_endorser,
          registered: false,
          avatar: upData?.avatar || null,
        });
        nodeIds.add(e.source);
      }
    }

    // Endorsement event nodes (optional)
    if (filters.endorsement) {
      for (const e of edges) {
        if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
        const eid = `endorse:${e.source}→${e.target}`;
        nodes.push({
          id: eid,
          type: "endorsement",
          label: "✓",
          r: NODE_R.endorsement,
          reason: e.reason,
          from: e.source,
          to: e.target,
        });
        nodeIds.add(eid);
        links.push({ source: e.source, target: eid, kind: "endorses" });
        links.push({ source: eid, target: e.target, kind: "endorsed-by" });
      }
    } else {
      // Direct edges (includes external endorsers → registered agents)
      for (const e of edges) {
        if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
        links.push({ source: e.source, target: e.target, kind: "endorses", reason: e.reason });
      }
    }

    // LSP26 soft endorsement edges — only between Universal Trust registered agents (not ERC-8004 or ecosystem nodes)
    // nodeIds uses original-case addresses; lsp26Edges may use lowercase — normalise with a lowercase set
    if (filters.lsp26_follow) {
      // Build lowercase set only from registered Universal Trust agents
      const registeredLower = new Set(
        nodes.filter((n) => n.registered).map((n) => n.id.toLowerCase())
      );
      const addrByLower = {};
      for (const n of nodes) if (n.registered) addrByLower[n.id.toLowerCase()] = n.id;

      for (const e of lsp26Edges) {
        const srcLower = e.source.toLowerCase();
        const tgtLower = e.target.toLowerCase();
        if (registeredLower.has(srcLower) && registeredLower.has(tgtLower)) {
          links.push({
            source: addrByLower[srcLower] ?? e.source,
            target: addrByLower[tgtLower] ?? e.target,
            kind: "lsp26-follow",
          });
        }
      }
    }

    return { nodes, links };
  }, [rawData, upProfiles, filters, ecosystemAgents, erc8004Agents]);

  // ── Render D3 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !rawData || !svgRef.current) return;
    const { nodes, links } = buildGraph();

    const { w, h } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Defs
    const defs = svg.append("defs");

    // Arrowhead per color
    Object.entries(COLORS).forEach(([type, color]) => {
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 24).attr("refY", 0)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", color);
    });

    // Glow
    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    const fm = glow.append("feMerge");
    fm.append("feMergeNode").attr("in", "blur");
    fm.append("feMergeNode").attr("in", "SourceGraphic");

    // Zoom group
    const g = svg.append("g");
    gRef.current = g;

    svg.call(
      d3.zoom().scaleExtent([0.2, 5])
        .on("zoom", (ev) => g.attr("transform", ev.transform))
    );

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance((l) => {
        if (l.kind === "has-skill") return 60;
        if (l.kind === "endorses" || l.kind === "endorsed-by") return 100;
        if (l.kind === "lsp26-follow") return 140;
        return 120;
      }).strength(0.6))
      .force("charge", d3.forceManyBody().strength((d) => d.type === "agent_up" || d.type === "agent_eoa" ? -350 : -120))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius((d) => d.r + 6));

    simRef.current = sim;

    // Detect mutual endorsements: A→B and B→A both exist
    const endorseSet = new Set(
      links.filter((l) => l.kind === "endorses")
        .map((l) => `${l.source?.id || l.source}→${l.target?.id || l.target}`)
    );
    const isMutual = (l) => {
      if (l.kind !== "endorses") return false;
      const s = l.source?.id || l.source;
      const t = l.target?.id || l.target;
      return endorseSet.has(`${s}→${t}`) && endorseSet.has(`${t}→${s}`);
    };

    // Mutual arrowhead (gold)
    defs.append("marker")
      .attr("id", "arrow-mutual")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 24).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#F59E0B");

    // LSP26 follow arrowhead (emerald)
    defs.append("marker")
      .attr("id", "arrow-lsp26")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 24).attr("refY", 0)
      .attr("markerWidth", 4).attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#10B981");

    // Links
    const link = g.append("g").selectAll("line")
      .data(links).join("line")
      .attr("class", "g-link")
      .attr("stroke", (d) => {
        if (d.kind === "lsp26-follow") return "#10B981";
        if (isMutual(d)) return "#F59E0B"; // gold for mutual
        const target = nodes.find((n) => n.id === (d.target?.id || d.target));
        return target ? COLORS[target.type] + "66" : "#ffffff22";
      })
      .attr("stroke-opacity", (d) => {
        if (d.kind === "lsp26-follow") return 0.4;
        return 1;
      })
      .attr("stroke-width", (d) => {
        if (d.kind === "lsp26-follow") return 0.8;
        if (isMutual(d)) return 2.5;
        if (d.kind === "endorses") return 1.2;
        return 1;
      })
      .attr("stroke-dasharray", (d) => {
        if (d.kind === "lsp26-follow") return "3,5";
        if (isMutual(d)) return null; // solid for mutual
        if (d.kind === "endorses") return "5,4"; // dashed for one-way
        return null;
      })
      .attr("marker-end", (d) => {
        if (d.kind === "lsp26-follow") return "url(#arrow-lsp26)";
        if (isMutual(d)) return "url(#arrow-mutual)";
        const target = nodes.find((n) => n.id === (d.target?.id || d.target));
        return target ? `url(#arrow-${target.type})` : "none";
      });

    // Node groups
    const node = g.append("g").selectAll("g")
      .data(nodes).join("g")
      .attr("class", "g-node")
      .style("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end",   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (ev, d) => { ev.stopPropagation(); setSelected((p) => p === d.id ? null : d.id); });

    // Clip paths for PFP images (one per node that has an avatar)
    nodes.forEach((d) => {
      const key = (d.id || d.address || "").toLowerCase();
      const avatar = upProfiles[key]?.profileImage || upLookup(upProfiles, d.id)?.profileImage || upLookup(upProfiles, d.address)?.profileImage;
      if (avatar && (d.type === "agent_up" || d.type === "agent_eoa" || d.type === "ecosystem" || d.type === "external_endorser")) {
        d._avatar = avatar;
        defs.append("clipPath")
          .attr("id", `clip-${d.id.replace(/[^a-zA-Z0-9]/g, "_")}`)
          .append("circle")
          .attr("r", d.r - 1)
          .attr("cx", 0).attr("cy", 0);
      }
    });

    // Glow ring for UPs
    node.filter((d) => d.type === "agent_up")
      .append("circle")
      .attr("r", (d) => d.r + 5)
      .attr("fill", "none")
      .attr("stroke", COLORS.agent_up)
      .attr("stroke-width", 1)
      .attr("opacity", 0.3)
      .attr("filter", "url(#glow)");

    // Main circle (background / border)
    node.append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => d._avatar ? "#111" : COLORS[d.type] + "20")
      .attr("stroke", (d) => COLORS[d.type])
      .attr("stroke-width", (d) => d.type.startsWith("agent") || d.type === "ecosystem" ? 2 : 1.5);

    // PFP image (only for agent nodes with avatar)
    node.filter((d) => !!d._avatar)
      .append("image")
      .attr("href", (d) => d._avatar)
      .attr("x", (d) => -d.r + 1).attr("y", (d) => -d.r + 1)
      .attr("width", (d) => (d.r - 1) * 2).attr("height", (d) => (d.r - 1) * 2)
      .attr("clip-path", (d) => `url(#clip-${d.id.replace(/[^a-zA-Z0-9]/g, "_")})`)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("pointer-events", "none");

    // Inner label (only for nodes WITHOUT avatar, or skill/endorsement)
    node.filter((d) => !d._avatar)
      .append("text")
      .text((d) => {
        if (d.type === "skill") return "⚡";
        if (d.type === "endorsement") return "✓";
        return d.trustScore;
      })
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("fill", (d) => COLORS[d.type])
      .attr("font-size", (d) => d.type.startsWith("agent") || d.type === "ecosystem" ? Math.max(9, d.r * 0.55) : 9)
      .attr("font-weight", "700")
      .attr("pointer-events", "none");

    // Trust score overlay (small badge) for nodes WITH avatar
    node.filter((d) => !!d._avatar && d.trustScore)
      .append("circle")
      .attr("cx", (d) => d.r * 0.6).attr("cy", (d) => d.r * 0.6)
      .attr("r", 8)
      .attr("fill", "#0d0d0d")
      .attr("stroke", (d) => COLORS[d.type])
      .attr("stroke-width", 1)
      .attr("pointer-events", "none");

    node.filter((d) => !!d._avatar && d.trustScore)
      .append("text")
      .text((d) => d.trustScore)
      .attr("x", (d) => d.r * 0.6).attr("y", (d) => d.r * 0.6)
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("fill", (d) => COLORS[d.type])
      .attr("font-size", 7).attr("font-weight", "700")
      .attr("pointer-events", "none");

    // Name below
    node.filter((d) => d.type.startsWith("agent") || d.type === "ecosystem").append("text")
      .text((d) => d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label)
      .attr("text-anchor", "middle")
      .attr("y", (d) => d.r + 13)
      .attr("fill", "#ccc").attr("font-size", 10)
      .attr("pointer-events", "none");

    // Skill label
    node.filter((d) => d.type === "skill").append("text")
      .text((d) => d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label)
      .attr("text-anchor", "middle")
      .attr("y", (d) => d.r + 11)
      .attr("fill", COLORS.skill + "cc").attr("font-size", 9)
      .attr("pointer-events", "none");

    // Background click deselects
    svg.on("click", () => setSelected(null));

    sim.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [loading, rawData, upProfiles, filters, dims, buildGraph]);

  // ── Search highlight ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const q = search.trim().toLowerCase();

    if (!q) {
      svg.selectAll(".g-node").attr("opacity", 1);
      return;
    }
    svg.selectAll(".g-node").attr("opacity", (d) => {
      const match =
        (d.label || "").toLowerCase().includes(q) ||
        (d.address || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q) ||
        (d.content || "").toLowerCase().includes(q);
      return match ? 1 : 0.1;
    });
  }, [search]);

  // ── Selected node detail (memoized) — must be declared before useEffect that uses graphLinks ──
  const { nodes: graphNodes, links: graphLinks } = useMemo(() => {
    if (!rawData) return { nodes: [], links: [] };
    return buildGraph();
  }, [rawData, buildGraph]);

  // ── Selected highlight ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !rawData) return;
    const svg = d3.select(svgRef.current);
    if (!selected) {
      // Re-apply search filter or reset all to full opacity
      const q = search.trim().toLowerCase();
      if (q) {
        svg.selectAll(".g-node").attr("opacity", (d) => {
          const match =
            (d.label || "").toLowerCase().includes(q) ||
            (d.address || "").toLowerCase().includes(q) ||
            (d.description || "").toLowerCase().includes(q) ||
            (d.content || "").toLowerCase().includes(q);
          return match ? 1 : 0.1;
        });
      } else {
        svg.selectAll(".g-node").attr("opacity", 1);
      }
      svg.selectAll(".g-link").attr("stroke-opacity", 1);
      return;
    }
    svg.selectAll(".g-node").attr("opacity", (d) => {
      if (d.id === selected) return 1;
      const connected = graphLinks.some((l) => {
        const s = l.source?.id || l.source;
        const t = l.target?.id || l.target;
        return (s === selected && t === d.id) || (t === selected && s === d.id);
      });
      return connected ? 1 : 0.15;
    });
  }, [selected, rawData, graphLinks, search]);

  // ── Simple local AI query (no external API — pure data analysis) ───────────
  async function handleAiQuery(e) {
    e.preventDefault();
    if (!aiQuery.trim() || !rawData) return;
    setAiLoading(true);
    setAiAnswer(null);

    const { agents, edges, skills } = rawData;
    const q = aiQuery.toLowerCase();

    // Basic pattern matching over graph data — runs fully client-side
    await new Promise((r) => setTimeout(r, 300)); // feel of computation

    let answer = "";

    if (q.includes("most trusted") || q.includes("highest trust") || q.includes("top agent")) {
      const sorted = [...agents].sort((a, b) => (b.reputation + b.endorsementCount * 10) - (a.reputation + a.endorsementCount * 10));
      const top = sorted.slice(0, 3);
      answer = `Top agents by trust score:\n${top.map((a, i) => `${i + 1}. ${upLookup(upProfiles, a.address)?.name || a.name} — score ${a.composite ?? a.trustScore ?? (a.reputation + a.endorsementCount * 10)}`).join("\n")}`;

    } else if (q.includes("most endors") || q.includes("most connected")) {
      const sorted = [...agents].sort((a, b) => b.endorsementCount - a.endorsementCount);
      const top = sorted.slice(0, 3);
      answer = `Most endorsed agents:\n${top.map((a, i) => `${i + 1}. ${upLookup(upProfiles, a.address)?.name || a.name} — ${a.endorsementCount} endorsements`).join("\n")}`;

    } else if (q.includes("skill") && (q.includes("who") || q.includes("which") || q.includes("have"))) {
      const withSkills = Object.entries(skills).map(([addr, s]) => {
        const agent = agents.find((a) => a.address === addr);
        return { name: upLookup(upProfiles, addr)?.name || agent?.name || addr.slice(0, 8), skills: s.map((sk) => sk.name) };
      });
      if (withSkills.length === 0) {
        answer = "No agents have published skills yet.";
      } else {
        answer = `Agents with skills:\n${withSkills.map((a) => `• ${a.name}: ${a.skills.join(", ")}`).join("\n")}`;
      }

    } else if (q.includes("universal profile") || q.includes("up") || q.includes("eoa")) {
      const ups = agents.filter((a) => !!upLookup(upProfiles, a.address)).length;
      const eoas = agents.length - ups;
      answer = `${ups} Universal Profile agents, ${eoas} EOA agents out of ${agents.length} total.`;

    } else if (q.includes("how many") || q.includes("count") || q.includes("total")) {
      const totalEdges = edges.length;
      const totalSkills = Object.values(skills).reduce((s, v) => s + v.length, 0);
      answer = `${agents.length} agents registered\n${totalEdges} endorsements\n${totalSkills} skills published`;

    } else if (q.includes("endorse") && q.includes("who")) {
      // "who does X endorse" or "who endorsed X"
      const names = agents.map((a) => ({ addr: a.address, name: (upLookup(upProfiles, a.address)?.name || a.name || "").toLowerCase() }));
      const match = names.find((n) => q.includes(n.name) && n.name.length > 2);
      if (match) {
        const outgoing = edges.filter((e) => e.source === match.addr).map((e) => {
          const t = agents.find((a) => a.address === e.target);
          return upLookup(upProfiles, e.target)?.name || t?.name || e.target.slice(0, 8);
        });
        const incoming = edges.filter((e) => e.target === match.addr).map((e) => {
          const s = agents.find((a) => a.address === e.source);
          return upLookup(upProfiles, e.source)?.name || s?.name || e.source.slice(0, 8);
        });
        answer = `${match.name}:\n• Endorsed by: ${incoming.length > 0 ? incoming.join(", ") : "nobody yet"}\n• Endorses: ${outgoing.length > 0 ? outgoing.join(", ") : "nobody yet"}`;
      } else {
        answer = "I couldn't identify which agent you mean. Try using their name or address.";
      }

    } else {
      answer = `I can answer questions like:\n• "Who has the highest trust score?"\n• "Which agents have skills?"\n• "How many agents are registered?"\n• "Who endorsed [agent name]?"\n• "How many Universal Profiles vs EOAs?"`;
    }

    setAiAnswer(answer);
    setAiLoading(false);
  }

  // ── Selected node detail ───────────────────────────────────────────────────
  const selectedNode = selected ? graphNodes.find((n) => n.id === selected) : null;
  const selectedAgent = selectedNode?.type?.startsWith("agent")
    ? rawData?.agents.find((a) => a.address === selectedNode.id)
    : null;
  const selectedEcoAgent = selectedNode?.type === "ecosystem"
    ? ecosystemAgents.find((a) => a.address === selectedNode.id)
    : null;

  const stats = rawData ? {
    agents: rawData.agents.length,
    ecosystem: ecosystemAgents.length,
    edges: rawData.edges.length,
    skills: Object.values(rawData.skills).reduce((s, v) => s + v.length, 0),
    nodes: graphNodes.length,
  } : null;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  function EndorserRow({ label, addr, name, avatar, color, onSelect }) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-500 w-7 shrink-0">{label}</span>
        <button onClick={onSelect} className="flex items-center gap-2 hover:opacity-80 transition min-w-0">
          {avatar
            ? <img src={avatar} alt={name} className="w-6 h-6 rounded-full object-cover shrink-0 border" style={{ borderColor: color }} onError={e => e.target.style.display="none"} />
            : <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: color + "44", borderColor: color, border: `1px solid ${color}` }}>
                {(name[0] || "?").toUpperCase()}
              </span>
          }
          <span className="text-gray-200 font-medium truncate">{name}</span>
          <span className="text-gray-600 font-mono shrink-0">{addr.slice(0,6)}…{addr.slice(-4)}</span>
        </button>
      </div>
    );
  }

  // Node detail card — shared between mobile bottom sheet and desktop right panel
  function NodeDetailCard() {
    if (!selectedNode) return null;
    const avatar = upLookup(upProfiles, selectedNode.id)?.profileImage;
    const nodeColor = COLORS[selectedNode.type];

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          {avatar ? (
            <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 shrink-0" style={{ borderColor: nodeColor }} />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: `linear-gradient(135deg, ${nodeColor}, ${COLORS.agent_eoa})` }}>
              {(selectedNode.label || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white text-sm truncate">{selectedNode.label}</p>
            <p className="text-xs" style={{ color: nodeColor }}>{TYPE_LABELS[selectedNode.type]}</p>
          </div>
          <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white shrink-0 p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Agent registered */}
        {selectedAgent && (
          <>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-lukso-darker rounded-lg p-2">
                <p className="text-xl font-bold" style={{ color: nodeColor }}>{selectedNode.trustScore}</p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
              <div className="bg-lukso-darker rounded-lg p-2">
                <p className="text-xl font-bold text-lukso-purple">{selectedAgent.endorsementCount}</p>
                <p className="text-xs text-gray-500">Endorsed</p>
              </div>
            </div>
            {selectedAgent.description && <p className="text-xs text-gray-400 line-clamp-3">{selectedAgent.description}</p>}
            <div className="flex flex-col gap-2">
              <Link to={`/agent/${selectedAgent.address}`} className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-pink/10 text-lukso-pink border border-lukso-pink/20 hover:bg-lukso-pink/20 transition">View Profile</Link>
              <Link to={`/endorse?address=${selectedAgent.address}`} className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-purple/10 text-lukso-purple border border-lukso-purple/20 hover:bg-lukso-purple/20 transition">Endorse</Link>
            </div>
          </>
        )}

        {/* Ecosystem */}
        {selectedNode.type === "ecosystem" && (
          <>
            {selectedNode.description && <p className="text-xs text-gray-400 line-clamp-3">{selectedNode.description}</p>}
            {selectedEcoAgent?.twitter && <p className="text-xs text-gray-500">Twitter: <span className="text-gray-300">{selectedEcoAgent.twitter}</span></p>}
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">Not yet on Universal Trust</div>
            <div className="flex flex-col gap-2">
              <a href={`https://universalprofile.cloud/${selectedNode.id}`} target="_blank" rel="noopener noreferrer" className="w-full text-center text-xs font-medium py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition">View UP Profile →</a>
              <Link to="/register" className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-pink/10 text-lukso-pink border border-lukso-pink/20 hover:bg-lukso-pink/20 transition">Register on Universal Trust</Link>
            </div>
          </>
        )}

        {/* ERC-8004 */}
        {selectedNode.type === "agent_8004" && (
          <>
            {selectedNode.description && <p className="text-xs text-gray-400 line-clamp-3">{selectedNode.description}</p>}
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs text-orange-400">
              ERC-8004 agentId #{selectedNode.agentId} · LUKSO registry
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={`https://explorer.execution.mainnet.lukso.network/address/0xe30B7514744D324e8bD93157E4c82230d6e6e8f3`}
                target="_blank" rel="noopener noreferrer"
                className="w-full text-center text-xs font-medium py-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition"
              >
                View ERC-8004 Registry →
              </a>
              <Link to="/register" className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-pink/10 text-lukso-pink border border-lukso-pink/20 hover:bg-lukso-pink/20 transition">Register on Universal Trust</Link>
            </div>
          </>
        )}

        {/* External Endorser */}
        {selectedNode.type === "external_endorser" && (() => {
          const upData = upLookup(upProfiles, selectedNode.address);
          const endorsedAgents = rawData?.edges
            ?.filter((e) => e.source.toLowerCase() === selectedNode.address.toLowerCase())
            .map((e) => {
              const agent = rawData?.agents?.find((a) => a.address?.toLowerCase() === e.target.toLowerCase());
              const up = upLookup(upProfiles, e.target);
              return { address: e.target, name: up?.name || agent?.name || (e.target.slice(0,8) + "…"), avatar: up?.profileImage };
            }) || [];
          return (
            <div className="space-y-3">
              {upData?.description && <p className="text-xs text-gray-400 line-clamp-3">{upData.description}</p>}
              <div className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-lg text-xs text-slate-400">
                Universal Profile — not registered as agent
              </div>
              {endorsedAgents.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Endorsed agents:</p>
                  {endorsedAgents.map((a) => (
                    <EndorserRow key={a.address} label="→" addr={a.address} name={a.name} avatar={a.avatar} color={COLORS.agent_up} onSelect={() => setSelected(a.address)} />
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <a href={`https://universaleverything.io/${selectedNode.address}`} target="_blank" rel="noopener noreferrer" className="w-full text-center text-xs font-medium py-2 rounded-lg bg-slate-500/10 text-slate-300 border border-slate-500/20 hover:bg-slate-500/20 transition">View UP on UE →</a>
              </div>
            </div>
          );
        })()}

        {/* Skill */}
        {selectedNode.type === "skill" && (
          <>
            {selectedNode.content && <pre className="text-xs text-gray-400 bg-lukso-darker rounded-lg p-2 whitespace-pre-wrap line-clamp-5 font-mono">{selectedNode.content.slice(0, 200)}{selectedNode.content.length > 200 ? "…" : ""}</pre>}
            <button onClick={() => setSelected(selectedNode.agentAddr)} className="w-full text-center text-xs font-medium py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition">View Agent</button>
          </>
        )}

        {/* Endorsement */}
        {selectedNode.type === "endorsement" && (() => {
          const fromAddr = selectedNode.from || "";
          const toAddr = selectedNode.to || "";
          const fromUp = upLookup(upProfiles, fromAddr);
          const toUp = upLookup(upProfiles, toAddr);
          const fromAgent = rawData?.agents?.find(a => a.address?.toLowerCase() === fromAddr.toLowerCase());
          const toAgent = rawData?.agents?.find(a => a.address?.toLowerCase() === toAddr.toLowerCase());
          const fromName = fromUp?.name || fromAgent?.name || (fromAddr.slice(0,8) + "…");
          const toName = toUp?.name || toAgent?.name || (toAddr.slice(0,8) + "…");
          const fromAvatar = fromUp?.profileImage;
          const toAvatar = toUp?.profileImage;
          return (
            <div className="space-y-3 text-xs">
              {selectedNode.reason && (
                <p className="text-gray-400 italic bg-lukso-darker rounded-lg px-3 py-2">"{selectedNode.reason}"</p>
              )}
              <div className="space-y-2">
                <EndorserRow label="From" addr={fromAddr} name={fromName} avatar={fromAvatar} color={COLORS.agent_up} onSelect={() => setSelected(fromAddr)} />
                <EndorserRow label="To" addr={toAddr} name={toName} avatar={toAvatar} color={COLORS.agent_up} onSelect={() => setSelected(toAddr)} />
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lukso-darker flex flex-col">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full flex-1 flex flex-col gap-3 sm:gap-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent mb-1">
              Trust Graph
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">
              On-chain agent endorsement network — live from LUKSO mainnet.
            </p>
          </div>
          {/* Mobile: sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="sm:hidden shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-lukso-card border border-lukso-border text-gray-400 hover:text-white hover:border-lukso-purple/50 transition"
            title="Open legend & filters"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs font-medium">Legend</span>
          </button>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-36">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-lukso-card border border-lukso-border rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lukso-pink/50"
            />
          </div>

          {/* Type filters — scroll horizontally on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {Object.entries(COLORS).map(([type, color]) => (
              <button
                key={type}
                onClick={() => setFilters((f) => ({ ...f, [type]: !f[type] }))}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition ${
                  filters[type] ? "opacity-100" : "opacity-30"
                }`}
                style={{ color, borderColor: color + "66" }}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: color }} />
                <span className="hidden sm:inline">{TYPE_LABELS[type]}</span>
                <span className="sm:hidden">{type.replace("agent_", "").replace("ecosystem", "eco")}</span>
              </button>
            ))}
            <button
              onClick={() => setFilters((f) => ({ ...f, lsp26_follow: !f.lsp26_follow }))}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition ${
                filters.lsp26_follow ? "opacity-100" : "opacity-30"
              }`}
              style={{ color: "#10B981", borderColor: "#10B98166" }}
            >
              <svg width="12" height="6" className="shrink-0"><line x1="0" y1="3" x2="12" y2="3" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2,3"/></svg>
              <span className="hidden sm:inline">LSP26 Follows</span>
              <span className="sm:hidden">LSP26</span>
            </button>
          </div>

          {/* Stats — desktop only */}
          {stats && (
            <div className="hidden md:flex ml-auto gap-3 text-xs text-gray-600 shrink-0">
              <span className="text-lukso-pink">{stats.agents} reg.</span>
              <span className="text-emerald-500">{stats.ecosystem} eco</span>
              <span>{stats.edges} endorse</span>
            </div>
          )}
        </div>

        {/* Main layout */}
        <div className="flex gap-3 flex-1 min-h-0 relative">

          {/* Left sidebar — hidden on mobile unless toggled */}
          <div className={`
            ${sidebarOpen ? "flex" : "hidden"} sm:flex
            w-48 shrink-0 flex-col gap-2 overflow-y-auto
            absolute sm:relative z-20 sm:z-auto
            bg-lukso-darker sm:bg-transparent
            inset-y-0 left-0 sm:inset-auto
            p-3 sm:p-0 shadow-xl sm:shadow-none
            rounded-r-2xl sm:rounded-none
            border-r border-lukso-border sm:border-0
          `}>
            {/* Close button mobile */}
            <button onClick={() => setSidebarOpen(false)} className="sm:hidden self-end text-gray-500 hover:text-white p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Legend */}
            <div className="bg-lukso-card border border-lukso-border rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Legend</p>
              {Object.entries(COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 py-0.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border" style={{ background: color + "22", borderColor: color }} />
                  <span className="text-xs text-gray-400">{TYPE_LABELS[type]}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-lukso-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#F59E0B" strokeWidth="2.5"/></svg>
                  <span className="text-xs text-gray-400">Mutual endorsement</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="4,3" strokeOpacity="0.5"/></svg>
                  <span className="text-xs text-gray-400">One-way endorsement</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3,5" strokeOpacity="0.6"/></svg>
                  <span className="text-xs text-gray-400">LSP26 Follow (social)</span>
                </div>
                <p className="text-xs text-gray-600">Node size = trust score</p>
              </div>
            </div>

            {/* Agent list */}
            {rawData && (
              <div className="bg-lukso-card border border-lukso-border rounded-xl p-3 flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Registered</p>
                <div className="space-y-0.5 mb-2">
                  {rawData.agents
                    .sort((a, b) => (b.reputation + b.endorsementCount * 10) - (a.reputation + a.endorsementCount * 10))
                    .map((a) => {
                      const name = upLookup(upProfiles, a.address)?.name || a.name || a.address.slice(0, 8);
                      const score = a.reputation + a.endorsementCount * 10;
                      const upData = upLookup(upProfiles, a.address); const type = (upData?.isUP === true) ? "agent_up" : "agent_eoa";
                      const avatar = upLookup(upProfiles, a.address)?.profileImage;
                      return (
                        <button key={a.address} onClick={() => { setSelected((p) => p === a.address ? null : a.address); setSidebarOpen(false); }}
                          className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition text-xs ${selected === a.address ? "bg-lukso-darker" : "hover:bg-lukso-darker/50"}`}>
                          {avatar
                            ? <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border" style={{ borderColor: COLORS[type] }} />
                            : <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[type] }} />}
                          <span className="truncate text-gray-300 flex-1">{name}</span>
                          <span className="text-gray-600 shrink-0">{score}</span>
                        </button>
                      );
                    })}
                </div>
                {ecosystemAgents.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 pt-2 border-t border-lukso-border">Ecosystem</p>
                    <div className="space-y-0.5">
                      {ecosystemAgents.map((a) => {
                        const name = upLookup(upProfiles, a.address)?.name || a.name || a.address.slice(0, 8);
                        const avatar = upLookup(upProfiles, a.address)?.profileImage;
                        return (
                          <button key={a.address} onClick={() => { setSelected((p) => p === a.address ? null : a.address); setSidebarOpen(false); }}
                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition text-xs ${selected === a.address ? "bg-lukso-darker" : "hover:bg-lukso-darker/50"}`}>
                            {avatar
                              ? <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-emerald-500/50" />
                              : <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS.ecosystem }} />}
                            <span className="truncate text-gray-400 flex-1">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && <div className="fixed inset-0 z-10 sm:hidden" onClick={() => setSidebarOpen(false)} />}

          {/* Graph + AI */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Graph canvas */}
            <div ref={containerRef} className="bg-lukso-card border border-lukso-border rounded-2xl overflow-hidden relative flex-1 min-h-[300px]">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-lukso-card/80 backdrop-blur-sm">
                  <div className="w-14 h-14 relative mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-lukso-pink/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-lukso-purple/40 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-2 border-lukso-pink border-t-transparent animate-spin" />
                  </div>
                  <p className="text-gray-300 text-sm font-medium">Loading trust network…</p>
                  <p className="text-gray-500 text-xs mt-1">Fetching agents, endorsements & skills from LUKSO</p>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-red-400 text-sm">Error: {error}</p>
                </div>
              )}
              <svg ref={svgRef} width={dims.w} height={dims.h} className="w-full touch-none" style={{ display: "block" }} />
              {/* API badge */}
              <div className="absolute bottom-2 left-2 hidden sm:flex items-center gap-2 bg-lukso-darker/90 border border-lukso-border rounded-lg px-2.5 py-1.5 text-xs">
                <span className="text-lukso-pink">🤖</span>
                <code className="text-gray-500">GET /api/trust-graph</code>
                <a href="/api/trust-graph" target="_blank" rel="noopener noreferrer" className="text-lukso-purple hover:text-lukso-pink">→</a>
              </div>
              {/* Mobile stats overlay */}
              {stats && (
                <div className="absolute top-2 right-2 sm:hidden flex gap-2 text-xs">
                  <span className="bg-lukso-darker/90 border border-lukso-border rounded px-2 py-1 text-lukso-pink">{stats.agents + stats.ecosystem} agents</span>
                </div>
              )}
            </div>

            {/* Mobile: selected node bottom sheet */}
            {selectedNode && (
              <div className="sm:hidden bg-lukso-card border border-lukso-border rounded-xl p-4">
                <NodeDetailCard />
              </div>
            )}

            {/* AI Query */}
            <div className="bg-lukso-card border border-lukso-border rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">Graph Query</span>
                <span className="text-xs text-gray-600 hidden sm:inline">— explore trust network data</span>
              </div>
              <form onSubmit={handleAiQuery} className="flex gap-2">
                <input value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Who has the highest score? Which agents have skills?"
                  className="flex-1 bg-lukso-darker border border-lukso-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lukso-pink/50 min-w-0" />
                <button type="submit" disabled={aiLoading || !aiQuery.trim()}
                  className="px-3 sm:px-4 py-2 bg-lukso-pink/10 border border-lukso-pink/30 text-lukso-pink text-sm font-medium rounded-lg hover:bg-lukso-pink/20 transition disabled:opacity-40 shrink-0">
                  {aiLoading ? "…" : "Query"}
                </button>
              </form>
              {/* Quick query chips */}
              {!aiAnswer && !aiLoading && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Top agents by score",
                    "Who has skills?",
                    "How many agents?",
                    "UPs vs EOAs",
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setAiQuery(q); }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-lukso-darker border border-lukso-border text-gray-500 hover:text-lukso-pink hover:border-lukso-pink/30 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {aiAnswer && (
                <div className="mt-3 relative">
                  <pre className="text-xs text-gray-300 bg-lukso-darker rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                    {aiAnswer}
                  </pre>
                  <button
                    type="button"
                    onClick={() => { setAiAnswer(null); setAiQuery(""); }}
                    className="absolute top-2 right-2 text-gray-600 hover:text-white transition p-1"
                    title="Clear"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — desktop only */}
          {selectedNode && (
            <div className="hidden sm:block w-52 shrink-0 bg-lukso-card border border-lukso-border rounded-2xl p-4 self-start">
              <NodeDetailCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
