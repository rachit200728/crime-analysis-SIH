import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  Network,
  RefreshCw,
  User,
  AlertTriangle,
  Shield,
  X,
} from "lucide-react";

const GRAPH_API = "http://127.0.0.1:5002";

const groupColor = {
  "Group A": "#3b82f6",
  "Group B": "#ef4444",
  "Group C": "#10b981",
  "Group D": "#f59e0b",
  "Group E": "#8b5cf6",
  "Group F": "#ec4899",
};

// Layout positions for up to ~12 nodes in a circle
function generatePositions(count) {
  const positions = [];
  const centerX = 50;
  const centerY = 46;
  const radius = Math.min(30, 20 + count * 1.2);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return positions;
}

export default function NetworkGraph() {
  const routeLocation = useLocation();
  const caseFilter = routeLocation.state || null;
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], is_real_data: false });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  async function fetchNetwork() {
    setLoading(true);
    setError("");
    try {
      const url = caseFilter?.caseNumber
        ? `${GRAPH_API}/api/network?case_id=${encodeURIComponent(caseFilter.caseNumber)}`
        : `${GRAPH_API}/api/network`;
      const res = await fetch(url);
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      setError("Could not connect to graph service (is it running on port 5002?).");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNetwork();
  }, []);

  async function handleSimulate(personId) {
    setSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch(`${GRAPH_API}/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person: personId }),
      });
      const data = await res.json();
      setSimulationResult(data);
      setGraphData(data.disrupted_network);
      setSelected(null);
    } catch (err) {
      setError("Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  function resetGraph() {
    setSimulationResult(null);
    setSelected(null);
    fetchNetwork();
  }

  const positions = generatePositions(graphData.nodes.length);
  const nodeIndex = {};
  graphData.nodes.forEach((n, i) => { nodeIndex[n.id] = i; });

  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <div className="graph-header">
          <div>
            <p className="eyebrow">NETWORK INTELLIGENCE</p>
            <h1 className="topbar-title">
              {caseFilter?.caseTitle ? `Network — ${caseFilter.caseTitle}` : "Crime Network Graph (All Cases)"}
            </h1>
            {!loading && (
              <span className="badge" style={{
                marginTop: 8, display: "inline-flex",
                color: graphData.is_real_data ? "#34d399" : "#f59e0b",
                background: graphData.is_real_data ? "#34d3991a" : "#f59e0b1a",
                border: `1px solid ${graphData.is_real_data ? "#34d39944" : "#f59e0b44"}`,
              }}>
                {graphData.is_real_data ? "● LIVE — built from uploaded evidence" : "○ DEMO DATA — upload evidence to build a real network"}
              </span>
            )}
          </div>
          <div className="graph-header-actions">
            <button className="icon-btn" title="Reset" onClick={resetGraph}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {loading && <p className="muted">Loading network…</p>}
        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        {!loading && !error && (
          <div className="graph-body">
            <div className="graph-canvas">
              <svg viewBox="0 -3 100 96" className="graph-svg" preserveAspectRatio="xMidYMid meet">
                {graphData.edges.map((edge, i) => {
                  const a = positions[nodeIndex[edge.source]];
                  const b = positions[nodeIndex[edge.target]];
                  if (!a || !b) return null;
                  return (
                    <line
                      key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="rgba(148,163,184,0.25)"
                      strokeWidth="0.6"
                    />
                  );
                })}

                {(() => {
                  const topBridge = graphData.nodes.reduce(
                    (max, n) => (n.bridge_score > (max?.bridge_score || 0) ? n : max),
                    null
                  );

                  return graphData.nodes.map((node) => {
                    const pos = positions[nodeIndex[node.id]];
                    if (!pos) return null;
                    const isSelected = selected?.id === node.id;
                    const isTopBridge = topBridge && node.id === topBridge.id;

                    return (
                      <g key={node.id} onClick={() => setSelected(node)} style={{ cursor: "pointer" }}>
                        {isTopBridge && (
                          <circle
                            cx={pos.x} cy={pos.y} r={4}
                            fill="none"
                            stroke={groupColor[node.group] || "#94a3b8"}
                            strokeWidth="0.6"
                            className="bridge-pulse-ring"
                          />
                        )}
                        <circle
                          cx={pos.x} cy={pos.y}
                          r={isSelected ? 5.5 : isTopBridge ? 4.8 : 4}
                          fill={groupColor[node.group] || "#94a3b8"}
                          opacity={0.9}
                          stroke={isSelected ? "#fff" : isTopBridge ? "#fbbf24" : "transparent"}
                          strokeWidth={isTopBridge ? 0.7 : 0.8}
                        />
                        <text x={pos.x} y={pos.y + 7} textAnchor="middle" fontSize="3" fill="#a9bdd1">
                          {node.id}
                        </text>
                        {isTopBridge && (
                          <text x={pos.x} y={pos.y - 6} textAnchor="middle" fontSize="2.4" fill="#fbbf24" fontWeight="700">
                            KEY BRIDGE
                          </text>
                        )}
                      </g>
                    );
                  });
                })()}
              </svg>

              <div className="graph-legend">
                {Object.entries(groupColor).map(([group, color]) => (
                  <div key={group} className="legend-item">
                    <span className="legend-dot" style={{ background: color }} />
                    {group}
                  </div>
                ))}
              </div>
            </div>

            <div className="graph-panel">
              {selected ? (
                <div className="node-detail">
                  <div className="node-detail-header">
                    <div className="node-avatar" style={{ background: (groupColor[selected.group] || "#94a3b8") + "33", color: groupColor[selected.group] || "#94a3b8" }}>
                      <User size={22} />
                    </div>
                    <div>
                      <h3 className="node-name">{selected.id}</h3>
                      <span className="badge" style={{ color: groupColor[selected.group], background: (groupColor[selected.group] || "#94a3b8") + "22" }}>
                        {selected.group}
                      </span>
                    </div>
                    <button className="remove-file" onClick={() => setSelected(null)}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="node-stats">
                    <div className="node-stat">
                      <p className="node-stat-label">Role</p>
                      <p className="node-stat-value">{selected.role}</p>
                    </div>
                    <div className="node-stat">
                      <p className="node-stat-label">Location</p>
                      <p className="node-stat-value">{selected.location}</p>
                    </div>
                    <div className="node-stat">
                      <p className="node-stat-label">Connections</p>
                      <p className="node-stat-value">{selected.connections}</p>
                    </div>
                    <div className="node-stat">
                      <p className="node-stat-label">Bridge Score</p>
                      <p className="node-stat-value">{selected.bridge_score}</p>
                    </div>
                  </div>

                  <div className="bridge-bar-wrap">
                    <div className="bridge-bar-label">
                      <Shield size={14} />
                      <span>Network Importance</span>
                    </div>
                    <div className="bridge-bar-track">
                      <div
                        className="bridge-bar-fill"
                        style={{ width: `${selected.bridge_score * 100}%`, background: selected.bridge_score > 0.3 ? "#ef4444" : selected.bridge_score > 0.1 ? "#f59e0b" : "#10b981" }}
                      />
                    </div>
                  </div>

                  <div className="disruption-box">
                    <div className="disruption-title">
                      <AlertTriangle size={15} />
                      Disruption Simulation
                    </div>
                    <p className="disruption-desc">
                      Remove this person to see how the network breaks apart (real graph algorithm — NetworkX betweenness centrality).
                    </p>
                    <button
                      className="qa-btn qa-primary"
                      style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                      onClick={() => handleSimulate(selected.id)}
                      disabled={simulating}
                    >
                      {simulating ? "Simulating..." : "Simulate Removal"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="node-empty">
                  <Network size={36} color="#2d455e" />
                  <p>Click any node on the graph to view person details and run disruption simulation.</p>
                </div>
              )}

              {simulationResult && (
                <div className="disruption-box" style={{ marginTop: 16 }}>
                  <div className="disruption-title">
                    <AlertTriangle size={15} />
                    Simulation Result
                  </div>
                  <p className="disruption-desc">
                    Removed <strong>{simulationResult.removed}</strong>: components went from{" "}
                    <strong>{simulationResult.before.components}</strong> to{" "}
                    <strong>{simulationResult.after.components}</strong>.
                  </p>
                  {simulationResult.became_more_disconnected ? (
                    <p style={{ color: "#f59e0b", fontSize: "0.8rem", marginTop: 8 }}>⚠️ Network became more disconnected.</p>
                  ) : (
                    <p style={{ color: "#34d399", fontSize: "0.8rem", marginTop: 8 }}>✓ Network stayed connected.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}