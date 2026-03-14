import { useState, useEffect, useRef } from "react";

// Demo trust network data based on the 2 registered agents + simulated growth
const DEMO_NODES = [
  { id: "deployer", label: "Deployer Agent", short: "0x7315…7B7b", trust: 100, x: 300, y: 180, isUP: false },
  { id: "up-agent", label: "UP Agent", short: "0x293E…232a", trust: 110, x: 500, y: 180, isUP: true },
  // Simulated future agents to show the vision
  { id: "trader", label: "DeFi Trader", short: "0xA1b2…C3d4", trust: 230, x: 180, y: 80, isUP: true },
  { id: "oracle", label: "Data Oracle", short: "0xE5f6…G7h8", trust: 350, x: 620, y: 80, isUP: false },
  { id: "curator", label: "Content Curator", short: "0xI9j0…K1l2", trust: 150, x: 400, y: 320, isUP: true },
  { id: "auditor", label: "Security Auditor", short: "0xM3n4…O5p6", trust: 500, x: 130, y: 280, isUP: true },
];

const DEMO_EDGES = [
  { from: "deployer", to: "up-agent", reason: "Verified UP agent" },
  { from: "trader", to: "deployer", reason: "Reliable" },
  { from: "trader", to: "up-agent", reason: "Trusted" },
  { from: "oracle", to: "up-agent", reason: "Accurate data" },
  { from: "oracle", to: "trader", reason: "Good trades" },
  { from: "auditor", to: "deployer", reason: "Clean code" },
  { from: "auditor", to: "oracle", reason: "Verified feeds" },
  { from: "curator", to: "up-agent", reason: "Quality content" },
  { from: "curator", to: "auditor", reason: "Thorough audits" },
  { from: "deployer", to: "curator", reason: "Helpful" },
];

function getNodeRadius(trust) {
  // Scale radius based on trust score: min 18, max 36
  return Math.min(36, Math.max(18, 14 + trust / 20));
}

function getTierColor(trust) {
  if (trust >= 500) return { fill: "#22c55e", glow: "rgba(34,197,94,0.3)" };
  if (trust >= 200) return { fill: "#3b82f6", glow: "rgba(59,130,246,0.3)" };
  if (trust >= 100) return { fill: "#eab308", glow: "rgba(234,179,8,0.3)" };
  return { fill: "#6b7280", glow: "rgba(107,114,128,0.3)" };
}

export default function TrustGraph() {
  const [visible, setVisible] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [animPhase, setAnimPhase] = useState(0); // 0=hidden, 1=edges, 2=nodes, 3=labels
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          setVisible(true);
        }
      },
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const timers = [
      setTimeout(() => setAnimPhase(1), 100),
      setTimeout(() => setAnimPhase(2), 500),
      setTimeout(() => setAnimPhase(3), 900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const nodeMap = {};
  DEMO_NODES.forEach((n) => { nodeMap[n.id] = n; });

  const highlightedEdges = hoveredNode
    ? DEMO_EDGES.filter((e) => e.from === hoveredNode || e.to === hoveredNode)
    : [];
  const highlightedNodeIds = hoveredNode
    ? new Set([hoveredNode, ...highlightedEdges.map((e) => e.from), ...highlightedEdges.map((e) => e.to)])
    : null;

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Trust Network Graph</h3>
          <span className="text-xs text-gray-600 bg-lukso-darker px-2 py-1 rounded">
            {DEMO_NODES.length} agents · {DEMO_EDGES.length} endorsements
          </span>
        </div>

        <div className="relative w-full" style={{ paddingBottom: "50%" }}>
          <svg
            viewBox="0 0 800 400"
            className="absolute inset-0 w-full h-full"
            role="img"
            aria-label="Trust network visualization showing agents connected by endorsements"
          >
            <defs>
              <linearGradient id="tg-edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FE005B" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="tg-edge-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FE005B" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <filter id="tg-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Edges */}
            {DEMO_EDGES.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;

              const isHighlighted = highlightedEdges.includes(edge);
              const isDimmed = hoveredNode && !isHighlighted;

              // Curved line via quadratic bezier
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const nx = -dy * 0.1;
              const ny = dx * 0.1;

              return (
                <path
                  key={`edge-${i}`}
                  d={`M ${from.x} ${from.y} Q ${mx + nx} ${my + ny} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={isHighlighted ? "url(#tg-edge-highlight)" : "url(#tg-edge-grad)"}
                  strokeWidth={isHighlighted ? 2.5 : 1.2}
                  opacity={animPhase >= 1 ? (isDimmed ? 0.1 : 1) : 0}
                  style={{
                    transition: "opacity 0.5s ease, stroke-width 0.3s ease",
                    transitionDelay: animPhase >= 1 ? `${i * 60}ms` : "0ms",
                  }}
                />
              );
            })}

            {/* Nodes */}
            {DEMO_NODES.map((node, i) => {
              const r = getNodeRadius(node.trust);
              const tier = getTierColor(node.trust);
              const isHovered = hoveredNode === node.id;
              const isDimmed = highlightedNodeIds && !highlightedNodeIds.has(node.id);

              return (
                <g
                  key={node.id}
                  style={{
                    cursor: "pointer",
                    opacity: animPhase >= 2 ? (isDimmed ? 0.25 : 1) : 0,
                    transition: "opacity 0.4s ease, transform 0.3s ease",
                    transitionDelay: animPhase >= 2 ? `${i * 80}ms` : "0ms",
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onFocus={() => setHoveredNode(node.id)}
                  onBlur={() => setHoveredNode(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${node.label}: trust score ${node.trust}`}
                >
                  {/* Pulse ring */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r + 6}
                    fill="none"
                    stroke={tier.fill}
                    strokeWidth="1"
                    opacity={isHovered ? 0.5 : 0.2}
                  >
                    <animate
                      attributeName="r"
                      values={`${r + 4};${r + 10};${r + 4}`}
                      dur="3s"
                      repeatCount="indefinite"
                      begin={`${i * 0.5}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values={isHovered ? "0.5;0.8;0.5" : "0.15;0.35;0.15"}
                      dur="3s"
                      repeatCount="indefinite"
                      begin={`${i * 0.5}s`}
                    />
                  </circle>

                  {/* Glow */}
                  {isHovered && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r + 2}
                      fill={tier.glow}
                      filter="url(#tg-glow)"
                    />
                  )}

                  {/* Main circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? r + 3 : r}
                    fill="#14142b"
                    stroke={tier.fill}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ transition: "r 0.2s ease, stroke-width 0.2s ease" }}
                  />

                  {/* Trust score text */}
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={tier.fill}
                    fontSize={r > 24 ? 14 : 11}
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                  >
                    {node.trust}
                  </text>

                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + r + 16}
                    textAnchor="middle"
                    fill={isHovered ? "#e5e7eb" : "#9ca3af"}
                    fontSize="11"
                    fontWeight={isHovered ? "600" : "400"}
                    fontFamily="system-ui, sans-serif"
                    opacity={animPhase >= 3 ? 1 : 0}
                    style={{ transition: "opacity 0.4s ease, fill 0.2s ease" }}
                  >
                    {node.label}
                  </text>

                  {/* UP badge */}
                  {node.isUP && (
                    <g opacity={animPhase >= 3 ? 1 : 0} style={{ transition: "opacity 0.3s ease" }}>
                      <circle
                        cx={node.x + r * 0.7}
                        cy={node.y - r * 0.7}
                        r="7"
                        fill="#8B5CF6"
                      />
                      <text
                        x={node.x + r * 0.7}
                        y={node.y - r * 0.7 + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize="7"
                        fontWeight="700"
                        fontFamily="system-ui, sans-serif"
                      >
                        UP
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Tooltip / hover info */}
        {hoveredNode && (
          <div className="mt-3 px-4 py-3 bg-lukso-darker rounded-lg border border-lukso-border animate-fade-in text-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-white">{nodeMap[hoveredNode].label}</span>
              <span className="font-mono text-xs text-gray-500">{nodeMap[hoveredNode].short}</span>
              {nodeMap[hoveredNode].isUP && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-lukso-purple/20 text-lukso-purple">UP</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Trust: <span className="text-white font-semibold">{nodeMap[hoveredNode].trust}</span></span>
              <span>Endorsements received: <span className="text-lukso-pink font-semibold">
                {DEMO_EDGES.filter((e) => e.to === hoveredNode).length}
              </span></span>
              <span>Given: <span className="text-lukso-purple font-semibold">
                {DEMO_EDGES.filter((e) => e.from === hoveredNode).length}
              </span></span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-500 to-gray-400" /> New (&lt;100)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400" /> Verified (100+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400" /> Trusted (200+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-400" /> Highly Trusted (500+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-lukso-purple" /> Universal Profile
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px bg-gradient-to-r from-lukso-pink to-lukso-purple" /> Endorsement
          </span>
        </div>

        <p className="text-xs text-gray-600 mt-3">
          Visualization includes 2 live agents + 4 simulated agents to demonstrate the trust network at scale.
          Node size reflects trust score. Hover to explore connections.
        </p>
      </div>
    </div>
  );
}
