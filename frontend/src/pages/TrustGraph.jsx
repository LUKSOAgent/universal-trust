import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as d3 from "d3";
import { getAllAgents, getEndorsers, getEndorsement, getSkills } from "../useContract";
import { fetchUPProfiles } from "../envio";

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  agent_up:        "#FF2975",   // pink  — Universal Profile agent
  agent_eoa:       "#8B5CF6",   // purple — EOA agent
  skill:           "#22D3EE",   // cyan  — skill node
  endorsement:     "#F59E0B",   // amber — endorsement event node
};

const TYPE_LABELS = {
  agent_up:    "Universal Profile",
  agent_eoa:   "EOA Agent",
  skill:       "Skill",
  endorsement: "Endorsement",
};

const NODE_R = { agent_up: 16, agent_eoa: 13, skill: 9, endorsement: 7 };
const SCORE_SCALE_MAX = 2.5; // max multiplier for trust score scaling

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrustGraph() {
  const svgRef      = useRef(null);
  const containerRef = useRef(null);
  const simRef      = useRef(null);
  const gRef        = useRef(null); // d3 zoom group

  const [rawData, setRawData]     = useState(null); // { agents, edges, skills }
  const [upProfiles, setUpProfiles] = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null); // node id
  const [filters, setFilters]     = useState({ agent_up: true, agent_eoa: true, skill: true, endorsement: false });
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

        setRawData({ agents: agentList, edges: endorseEdges, skills: skillMap });

        fetchUPProfiles(agentList.map((a) => a.address))
          .then(setUpProfiles)
          .catch(() => {});
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
    const { agents, edges, skills } = rawData;

    const nodes = [];
    const links = [];
    const nodeIds = new Set();

    // Agent nodes
    for (const a of agents) {
      const type = upProfiles[a.address] ? "agent_up" : "agent_eoa";
      if (!filters[type]) continue;
      const score = a.reputation + a.endorsementCount * 10;
      const rScale = d3.scaleSqrt().domain([0, 500]).range([1, SCORE_SCALE_MAX]);
      nodes.push({
        id: a.address,
        type,
        label: upProfiles[a.address]?.name || a.name || a.address.slice(0, 8) + "…",
        fullName: a.name,
        address: a.address,
        trustScore: score,
        endorsementCount: a.endorsementCount,
        reputation: a.reputation,
        description: a.description,
        r: NODE_R[type] * Math.max(1, rScale(score)),
      });
      nodeIds.add(a.address);
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
      // Direct edges
      for (const e of edges) {
        if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
        links.push({ source: e.source, target: e.target, kind: "endorses", reason: e.reason });
      }
    }

    return { nodes, links };
  }, [rawData, upProfiles, filters]);

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
        return 120;
      }).strength(0.6))
      .force("charge", d3.forceManyBody().strength((d) => d.type === "agent_up" || d.type === "agent_eoa" ? -350 : -120))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius((d) => d.r + 6));

    simRef.current = sim;

    // Links
    const link = g.append("g").selectAll("line")
      .data(links).join("line")
      .attr("class", "g-link")
      .attr("stroke", (d) => {
        const target = nodes.find((n) => n.id === (d.target?.id || d.target));
        return target ? COLORS[target.type] + "55" : "#ffffff22";
      })
      .attr("stroke-width", (d) => d.kind === "endorses" ? 1.5 : 1)
      .attr("marker-end", (d) => {
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

    // Glow ring for UPs
    node.filter((d) => d.type === "agent_up")
      .append("circle")
      .attr("r", (d) => d.r + 5)
      .attr("fill", "none")
      .attr("stroke", COLORS.agent_up)
      .attr("stroke-width", 1)
      .attr("opacity", 0.3)
      .attr("filter", "url(#glow)");

    // Main circle
    node.append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => COLORS[d.type] + "20")
      .attr("stroke", (d) => COLORS[d.type])
      .attr("stroke-width", (d) => d.type.startsWith("agent") ? 2 : 1.5);

    // Inner label
    node.append("text")
      .text((d) => {
        if (d.type === "skill") return "⚡";
        if (d.type === "endorsement") return "✓";
        return d.trustScore;
      })
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("fill", (d) => COLORS[d.type])
      .attr("font-size", (d) => d.type.startsWith("agent") ? Math.max(9, d.r * 0.55) : 9)
      .attr("font-weight", "700")
      .attr("pointer-events", "none");

    // Name below
    node.filter((d) => d.type.startsWith("agent")).append("text")
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

  // ── Selected highlight ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !rawData) return;
    const svg = d3.select(svgRef.current);
    if (!selected) {
      svg.selectAll(".g-node").attr("opacity", search.trim() ? undefined : 1);
      svg.selectAll(".g-link").attr("stroke-opacity", 1);
      return;
    }
    svg.selectAll(".g-node").attr("opacity", (d) => {
      if (d.id === selected) return 1;
      const { links } = buildGraph();
      const connected = links.some((l) => {
        const s = l.source?.id || l.source;
        const t = l.target?.id || l.target;
        return (s === selected && t === d.id) || (t === selected && s === d.id);
      });
      return connected ? 1 : 0.15;
    });
  }, [selected, rawData, buildGraph, search]);

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
      answer = `Top agents by trust score:\n${top.map((a, i) => `${i + 1}. ${upProfiles[a.address]?.name || a.name} — score ${a.reputation + a.endorsementCount * 10}`).join("\n")}`;

    } else if (q.includes("most endors") || q.includes("most connected")) {
      const sorted = [...agents].sort((a, b) => b.endorsementCount - a.endorsementCount);
      const top = sorted.slice(0, 3);
      answer = `Most endorsed agents:\n${top.map((a, i) => `${i + 1}. ${upProfiles[a.address]?.name || a.name} — ${a.endorsementCount} endorsements`).join("\n")}`;

    } else if (q.includes("skill") && (q.includes("who") || q.includes("which") || q.includes("have"))) {
      const withSkills = Object.entries(skills).map(([addr, s]) => {
        const agent = agents.find((a) => a.address === addr);
        return { name: upProfiles[addr]?.name || agent?.name || addr.slice(0, 8), skills: s.map((sk) => sk.name) };
      });
      if (withSkills.length === 0) {
        answer = "No agents have published skills yet.";
      } else {
        answer = `Agents with skills:\n${withSkills.map((a) => `• ${a.name}: ${a.skills.join(", ")}`).join("\n")}`;
      }

    } else if (q.includes("universal profile") || q.includes("up") || q.includes("eoa")) {
      const ups = agents.filter((a) => !!upProfiles[a.address]).length;
      const eoas = agents.length - ups;
      answer = `${ups} Universal Profile agents, ${eoas} EOA agents out of ${agents.length} total.`;

    } else if (q.includes("how many") || q.includes("count") || q.includes("total")) {
      const totalEdges = edges.length;
      const totalSkills = Object.values(skills).reduce((s, v) => s + v.length, 0);
      answer = `${agents.length} agents registered\n${totalEdges} endorsements\n${totalSkills} skills published`;

    } else if (q.includes("endorse") && q.includes("who")) {
      // "who does X endorse" or "who endorsed X"
      const names = agents.map((a) => ({ addr: a.address, name: (upProfiles[a.address]?.name || a.name || "").toLowerCase() }));
      const match = names.find((n) => q.includes(n.name) && n.name.length > 2);
      if (match) {
        const outgoing = edges.filter((e) => e.source === match.addr).map((e) => {
          const t = agents.find((a) => a.address === e.target);
          return upProfiles[e.target]?.name || t?.name || e.target.slice(0, 8);
        });
        const incoming = edges.filter((e) => e.target === match.addr).map((e) => {
          const s = agents.find((a) => a.address === e.source);
          return upProfiles[e.source]?.name || s?.name || e.source.slice(0, 8);
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
  const { nodes: graphNodes } = rawData ? buildGraph() : { nodes: [] };
  const selectedNode = selected ? graphNodes.find((n) => n.id === selected) : null;
  const selectedAgent = selectedNode?.type?.startsWith("agent")
    ? rawData?.agents.find((a) => a.address === selectedNode.id)
    : null;

  const stats = rawData ? {
    agents: rawData.agents.length,
    edges: rawData.edges.length,
    skills: Object.values(rawData.skills).reduce((s, v) => s + v.length, 0),
    nodes: graphNodes.length,
  } : null;

  return (
    <div className="min-h-screen bg-lukso-darker flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col gap-4">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent mb-1">
            Trust Graph
          </h1>
          <p className="text-gray-500 text-sm">
            On-chain agent endorsement network — live from LUKSO mainnet. Drag, zoom, click to explore.
          </p>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes…"
              className="w-full bg-lukso-card border border-lukso-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lukso-pink/50"
            />
          </div>

          {/* Type filters */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(COLORS).map(([type, color]) => (
              <button
                key={type}
                onClick={() => setFilters((f) => ({ ...f, [type]: !f[type] }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  filters[type]
                    ? "border-current opacity-100"
                    : "border-lukso-border opacity-40"
                }`}
                style={{ color, borderColor: filters[type] ? color : undefined }}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Stats */}
          {stats && (
            <div className="ml-auto flex gap-4 text-xs text-gray-600">
              <span>{stats.agents} agents</span>
              <span>{stats.edges} endorsements</span>
              <span>{stats.skills} skills</span>
            </div>
          )}
        </div>

        {/* Main layout: sidebar + graph */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* Left sidebar — explorer */}
          <div className="w-52 shrink-0 flex flex-col gap-3 overflow-y-auto max-h-[600px]">
            {/* Node type legend */}
            <div className="bg-lukso-card border border-lukso-border rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Legend</p>
              {Object.entries(COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 py-0.5">
                  <span className="w-3 h-3 rounded-full shrink-0 border" style={{ background: color + "22", borderColor: color }} />
                  <span className="text-xs text-gray-400">{TYPE_LABELS[type]}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-lukso-border text-xs text-gray-600">
                Node size = trust score
              </div>
            </div>

            {/* Agent list */}
            {rawData && (
              <div className="bg-lukso-card border border-lukso-border rounded-xl p-3 flex-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Agents</p>
                <div className="space-y-1">
                  {rawData.agents
                    .sort((a, b) => (b.reputation + b.endorsementCount * 10) - (a.reputation + a.endorsementCount * 10))
                    .map((a) => {
                      const name = upProfiles[a.address]?.name || a.name || a.address.slice(0, 8);
                      const score = a.reputation + a.endorsementCount * 10;
                      const type = upProfiles[a.address] ? "agent_up" : "agent_eoa";
                      const isSelected = selected === a.address;
                      return (
                        <button
                          key={a.address}
                          onClick={() => setSelected((p) => p === a.address ? null : a.address)}
                          className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition text-xs ${
                            isSelected ? "bg-lukso-darker" : "hover:bg-lukso-darker/50"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[type] }} />
                          <span className="truncate text-gray-300 flex-1">{name}</span>
                          <span className="text-gray-600 shrink-0">{score}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Graph + panels */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Graph canvas */}
            <div ref={containerRef} className="bg-lukso-card border border-lukso-border rounded-2xl overflow-hidden relative flex-1">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <div className="w-10 h-10 border-4 border-lukso-border border-t-lukso-pink rounded-full animate-spin mb-3" />
                  <p className="text-gray-400 text-sm">Loading trust graph from chain…</p>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-red-400 text-sm">Error: {error}</p>
                </div>
              )}
              <svg ref={svgRef} width={dims.w} height={dims.h} className="w-full" style={{ display: "block" }} />

              {/* Agent discovery badge */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-lukso-darker/90 border border-lukso-border rounded-lg px-3 py-1.5 text-xs">
                <span className="text-lukso-pink font-semibold">🤖</span>
                <code className="text-gray-400">GET /api/trust-graph</code>
                <a href="/api/trust-graph" target="_blank" rel="noopener noreferrer" className="text-lukso-purple hover:text-lukso-pink transition">→</a>
              </div>
            </div>

            {/* AI Query interface */}
            <div className="bg-lukso-card border border-lukso-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white text-xs font-bold">N</div>
                <span className="text-sm font-semibold text-white">Nexus AI</span>
                <span className="text-xs text-gray-600">— query the trust network</span>
              </div>
              <form onSubmit={handleAiQuery} className="flex gap-2">
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Who has the highest trust score? Which agents have skills? How many endorsements?"
                  className="flex-1 bg-lukso-darker border border-lukso-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lukso-pink/50"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuery.trim()}
                  className="px-4 py-2 bg-lukso-pink/10 border border-lukso-pink/30 text-lukso-pink text-sm font-medium rounded-lg hover:bg-lukso-pink/20 transition disabled:opacity-40"
                >
                  {aiLoading ? "…" : "Ask"}
                </button>
              </form>
              {aiAnswer && (
                <pre className="mt-3 text-xs text-gray-300 bg-lukso-darker rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed">
                  {aiAnswer}
                </pre>
              )}
            </div>
          </div>

          {/* Right panel — selected node */}
          {selectedNode && (
            <div className="w-56 shrink-0 bg-lukso-card border border-lukso-border rounded-2xl p-4 space-y-4 self-start">
              {/* Agent panel */}
              {selectedAgent && (
                <>
                  <div className="flex items-center gap-3">
                    {upProfiles[selectedNode.id]?.profileImage ? (
                      <img src={upProfiles[selectedNode.id].profileImage} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-lukso-pink" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: `linear-gradient(135deg, ${COLORS[selectedNode.type]}, ${COLORS.agent_eoa})` }}>
                        {(selectedNode.label || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{selectedNode.label}</p>
                      <p className="text-xs" style={{ color: COLORS[selectedNode.type] }}>{TYPE_LABELS[selectedNode.type]}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-lukso-darker rounded-lg p-2">
                      <p className="text-xl font-bold" style={{ color: COLORS[selectedNode.type] }}>{selectedNode.trustScore}</p>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                    <div className="bg-lukso-darker rounded-lg p-2">
                      <p className="text-xl font-bold text-lukso-purple">{selectedAgent.endorsementCount}</p>
                      <p className="text-xs text-gray-500">Endorsed</p>
                    </div>
                  </div>
                  {selectedAgent.description && (
                    <p className="text-xs text-gray-400 line-clamp-3">{selectedAgent.description}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <Link to={`/agent/${selectedAgent.address}`} className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-pink/10 text-lukso-pink border border-lukso-pink/20 hover:bg-lukso-pink/20 transition">
                      View Profile
                    </Link>
                    <Link to={`/endorse?target=${selectedAgent.address}`} className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-purple/10 text-lukso-purple border border-lukso-purple/20 hover:bg-lukso-purple/20 transition">
                      Endorse
                    </Link>
                  </div>
                </>
              )}

              {/* Skill panel */}
              {selectedNode.type === "skill" && (
                <>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">⚡ {selectedNode.label}</p>
                    <p className="text-xs" style={{ color: COLORS.skill }}>Skill</p>
                  </div>
                  {selectedNode.content && (
                    <pre className="text-xs text-gray-400 bg-lukso-darker rounded-lg p-2 whitespace-pre-wrap line-clamp-6 font-mono">{selectedNode.content.slice(0, 300)}{selectedNode.content.length > 300 ? "…" : ""}</pre>
                  )}
                  <button onClick={() => setSelected(selectedNode.agentAddr)} className="w-full text-center text-xs font-medium py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition">
                    View Agent
                  </button>
                </>
              )}

              {/* Endorsement panel */}
              {selectedNode.type === "endorsement" && (
                <div>
                  <p className="font-semibold text-white text-sm mb-2">✓ Endorsement</p>
                  {selectedNode.reason && <p className="text-xs text-gray-400 italic">"{selectedNode.reason}"</p>}
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p>From: <span className="text-gray-300 font-mono">{(selectedNode.from || "").slice(0, 10)}…</span></p>
                    <p>To: <span className="text-gray-300 font-mono">{(selectedNode.to || "").slice(0, 10)}…</span></p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
