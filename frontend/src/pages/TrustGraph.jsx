import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import * as d3 from "d3";
import { getAllAgents, getEndorsers } from "../useContract";
import { fetchUPProfiles } from "../envio";

const LUKSO_PINK = "#FF2975";
const LUKSO_PURPLE = "#8B5CF6";
const NODE_BASE = 14;
const LINK_COLOR = "rgba(139,92,246,0.4)";
const LINK_HIGHLIGHT = "#FF2975";

export default function TrustGraph() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  const [agents, setAgents] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // selected node address
  const [upProfiles, setUpProfiles] = useState({});
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    document.title = "Trust Graph — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);

  // Measure container
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDims({ w: rect.width || 800, h: Math.max(500, window.innerHeight - 260) });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Load graph data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const agentList = await getAllAgents();
        setAgents(agentList);

        // Build edges: for each agent, fetch who endorsed them
        const edgeSet = new Set();
        const edgeList = [];
        await Promise.all(
          agentList.map(async (agent) => {
            try {
              const endorsers = await getEndorsers(agent.address);
              for (const endorser of endorsers) {
                const key = `${endorser}→${agent.address}`;
                if (!edgeSet.has(key)) {
                  edgeSet.add(key);
                  edgeList.push({ source: endorser, target: agent.address });
                }
              }
            } catch {
              // agent has no endorsers
            }
          })
        );
        setEdges(edgeList);

        // Enrich with UP names/avatars
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

  // D3 force graph
  useEffect(() => {
    if (loading || !agents.length || !svgRef.current) return;

    const { w, h } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Defs: arrowhead marker + glow filter
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", LINK_COLOR);

    defs.append("marker")
      .attr("id", "arrow-highlight")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", LINK_HIGHLIGHT);

    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = glow.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Build node map (only include agents that are in our list)
    const addrSet = new Set(agents.map((a) => a.address.toLowerCase()));
    const nodes = agents.map((a) => ({
      id: a.address,
      name: upProfiles[a.address]?.name || a.name || a.address.slice(0, 8) + "…",
      trustScore: a.reputation + a.endorsementCount * 10,
      endorsementCount: a.endorsementCount,
      isUP: !!upProfiles[a.address],
      avatar: upProfiles[a.address]?.profileImage || null,
    }));

    // Filter edges to only valid nodes
    const links = edges.filter(
      (e) =>
        addrSet.has(e.source.toLowerCase()) &&
        addrSet.has(e.target.toLowerCase())
    ).map((e) => ({ ...e }));

    // Node radius based on trust score
    const maxScore = Math.max(...nodes.map((n) => n.trustScore), 1);
    const rScale = d3.scaleSqrt().domain([0, maxScore]).range([NODE_BASE, NODE_BASE * 2.8]);

    // Color: pink for UPs, purple for EOAs
    const nodeColor = (d) => d.isUP ? LUKSO_PINK : LUKSO_PURPLE;

    // Zoom/pan container
    const g = svg.append("g");
    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(120).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius((d) => rScale(d.trustScore) + 8));

    simulationRef.current = simulation;

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", LINK_COLOR)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)")
      .attr("class", "trust-link");

    // Node groups
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "trust-node")
      .style("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelected((prev) => prev === d.id ? null : d.id);
      });

    // Outer glow ring for UPs
    node.filter((d) => d.isUP)
      .append("circle")
      .attr("r", (d) => rScale(d.trustScore) + 4)
      .attr("fill", "none")
      .attr("stroke", LUKSO_PINK)
      .attr("stroke-width", 1)
      .attr("opacity", 0.35)
      .attr("filter", "url(#glow)");

    // Main circle
    node.append("circle")
      .attr("r", (d) => rScale(d.trustScore))
      .attr("fill", (d) => nodeColor(d) + "22")
      .attr("stroke", (d) => nodeColor(d))
      .attr("stroke-width", 2);

    // Trust score label inside
    node.append("text")
      .text((d) => d.trustScore)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", (d) => nodeColor(d))
      .attr("font-size", (d) => Math.max(9, rScale(d.trustScore) * 0.55))
      .attr("font-weight", "700")
      .attr("pointer-events", "none");

    // Name label below
    node.append("text")
      .text((d) => d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name)
      .attr("text-anchor", "middle")
      .attr("y", (d) => rScale(d.trustScore) + 14)
      .attr("fill", "#ccc")
      .attr("font-size", 11)
      .attr("pointer-events", "none");

    // Click on background deselects
    svg.on("click", () => setSelected(null));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [loading, agents, edges, upProfiles, dims]);

  // Highlight selected node + its connections
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (!selected) {
      svg.selectAll(".trust-node").attr("opacity", 1);
      svg.selectAll(".trust-link")
        .attr("stroke", LINK_COLOR)
        .attr("stroke-width", 1.5)
        .attr("marker-end", "url(#arrow)");
      return;
    }

    svg.selectAll(".trust-link").each(function(d) {
      const isConnected =
        d.source.id === selected ||
        d.target.id === selected ||
        d.source === selected ||
        d.target === selected;
      d3.select(this)
        .attr("stroke", isConnected ? LINK_HIGHLIGHT : LINK_COLOR)
        .attr("stroke-width", isConnected ? 2.5 : 1)
        .attr("marker-end", isConnected ? "url(#arrow-highlight)" : "url(#arrow)");
    });

    svg.selectAll(".trust-node").attr("opacity", (d) => {
      if (d.id === selected) return 1;
      // check if connected
      const connected = edges.some(
        (e) =>
          (e.source === selected && e.target === d.id) ||
          (e.target === selected && e.source === d.id) ||
          (e.source.id === selected && e.target.id === d.id) ||
          (e.target.id === selected && e.source.id === d.id)
      );
      return connected ? 1 : 0.25;
    });
  }, [selected, edges]);

  const selectedAgent = selected ? agents.find((a) => a.address === selected) : null;
  const selectedProfile = selected ? upProfiles[selected] : null;

  return (
    <div className="min-h-screen bg-lukso-darker">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent mb-2">
            Trust Graph
          </h1>
          <p className="text-gray-400 text-sm">
            On-chain endorsement network. Each node is a registered agent. Arrows show who endorsed who.
            Node size = trust score.
          </p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 inline-block" style={{borderColor: LUKSO_PINK, background: LUKSO_PINK + "22"}}></span>
              Universal Profile
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 inline-block" style={{borderColor: LUKSO_PURPLE, background: LUKSO_PURPLE + "22"}}></span>
              EOA
            </span>
            <span className="text-gray-600">Click a node to inspect • Drag to reposition • Scroll to zoom</span>
          </div>
        </div>

        {/* Agent discovery callout */}
        <div className="mb-4 bg-lukso-card border border-lukso-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-lukso-pink font-semibold">🤖 For agents:</span>
          <code className="bg-lukso-darker px-2 py-1 rounded text-gray-300">
            GET /.well-known/agent-trust.json
          </code>
          <span className="text-gray-500">→ full trust graph as JSON, no wallet needed</span>
          <a
            href="/.well-known/trust-graph.json"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-lukso-purple hover:text-lukso-pink transition font-medium"
          >
            View raw graph →
          </a>
        </div>

        <div className="flex gap-4 items-start">
          {/* Graph canvas */}
          <div ref={containerRef} className="flex-1 min-w-0 bg-lukso-card border border-lukso-border rounded-2xl overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="w-10 h-10 border-4 border-lukso-border border-t-lukso-pink rounded-full animate-spin mb-3" />
                <p className="text-gray-400 text-sm">Loading trust graph…</p>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <p className="text-red-400 text-sm">Error: {error}</p>
              </div>
            )}
            {!loading && agents.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <p className="text-gray-500 text-sm">No agents registered yet.</p>
              </div>
            )}
            <svg
              ref={svgRef}
              width={dims.w}
              height={dims.h}
              className="w-full"
              style={{ display: "block" }}
            />
          </div>

          {/* Selected node panel */}
          {selectedAgent && (
            <div className="w-64 shrink-0 bg-lukso-card border border-lukso-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                {selectedProfile?.profileImage ? (
                  <img
                    src={selectedProfile.profileImage}
                    alt={selectedAgent.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-lukso-pink"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: `linear-gradient(135deg, ${LUKSO_PINK}, ${LUKSO_PURPLE})` }}
                  >
                    {(selectedAgent.name || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{selectedAgent.name}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    {selectedAgent.address.slice(0, 10)}…{selectedAgent.address.slice(-6)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-lukso-darker rounded-lg p-2">
                  <p className="text-2xl font-bold text-lukso-pink">
                    {selectedAgent.reputation + selectedAgent.endorsementCount * 10}
                  </p>
                  <p className="text-xs text-gray-500">Trust Score</p>
                </div>
                <div className="bg-lukso-darker rounded-lg p-2">
                  <p className="text-2xl font-bold text-lukso-purple">{selectedAgent.endorsementCount}</p>
                  <p className="text-xs text-gray-500">Endorsements</p>
                </div>
              </div>

              {selectedAgent.description && (
                <p className="text-xs text-gray-400 line-clamp-3">{selectedAgent.description}</p>
              )}

              <div className="flex flex-col gap-2">
                <Link
                  to={`/agent/${selectedAgent.address}`}
                  className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-pink/10 text-lukso-pink border border-lukso-pink/20 hover:bg-lukso-pink/20 transition"
                >
                  View Full Profile
                </Link>
                <Link
                  to={`/endorse?target=${selectedAgent.address}`}
                  className="w-full text-center text-xs font-medium py-2 rounded-lg bg-lukso-purple/10 text-lukso-purple border border-lukso-purple/20 hover:bg-lukso-purple/20 transition"
                >
                  Endorse This Agent
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {!loading && (
          <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-500">
            <span>{agents.length} agents</span>
            <span>{edges.length} endorsements</span>
            <span>
              {agents.filter((a) => a.endorsementCount > 0).length} agents with endorsements
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
