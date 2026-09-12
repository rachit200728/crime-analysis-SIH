import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  ShieldCheck,
  FolderOpen,
  Users,
  Network,
  Upload,
  FileText,
  LogOut,
  Bell,
  Activity,
  Radio,
} from "lucide-react";

// mockCases will come from inside the component

const alerts = [
  { time: "21:04:11", level: "CRIT", text: "Suspect count on CL-2024-003 crossed operational threshold (19)." },
  { time: "19:41:02", level: "WARN", text: "Graph delta on Shadownet: +2 unlinked nodes awaiting attribution." },
  { time: "18:12:44", level: "INFO", text: "Weekly intelligence brief queued — 7 reports pending sign-off." },
  { time: "16:58:09", level: "WARN", text: "Duplicate identifier flagged across Bazaar Fraud and Forgery dockets." },
];

const caseload = [
  { key: "Active", value: 68, color: "#c45c4a" },
  { key: "Under Review", value: 41, color: "#c9a227" },
  { key: "Closed", value: 33, color: "#3dba8b" },
];

const riskMix = [
  { key: "High", value: 48, color: "#c45c4a" },
  { key: "Medium", value: 61, color: "#c9a227" },
  { key: "Low", value: 33, color: "#3dba8b" },
];

function formatClock(d) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function RiskDonut({ slices, drawn, hovered, onHover, radarAngle }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const r = 58;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const dominant = slices.reduce((max, s) => (s.value > max.value ? s : max), slices[0]);

  // Figure out which slice the radar beam currently points at
  let sweepAcc = 0;
  const sweepFraction = radarAngle / 360;
  let activeSlice = slices[0];
  for (const s of slices) {
    const fraction = s.value / total;
    if (sweepFraction >= sweepAcc && sweepFraction < sweepAcc + fraction) {
      activeSlice = s;
      break;
    }
    sweepAcc += fraction;
  }

  const displaySlice = hovered ? slices.find((s) => s.key === hovered) : activeSlice;

  return (
    <div className="risk-donut-stage">
      <svg className="risk-donut" viewBox="0 0 160 160" aria-hidden="true">
        <defs>
          {slices.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={s.color} stopOpacity="1" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.6" />
            </linearGradient>
          ))}
        </defs>
        <circle className="risk-donut-track" cx="80" cy="80" r={r} />
        {slices.map((s) => {
          const len = (s.value / total) * c;
          const offset = acc;
          acc += len;
          const isDimmed = hovered && hovered !== s.key;
          return (
            <circle
              key={s.key}
              className={`risk-donut-seg ${s.key === dominant.key ? "risk-donut-seg--dominant" : ""} ${s.key === activeSlice.key ? "risk-donut-seg--active" : ""}`}
              cx="80"
              cy="80"
              r={r}
              stroke={`url(#grad-${s.key})`}
              strokeDasharray={drawn ? `${len} ${c - len}` : `0 ${c}`}
              strokeDashoffset={-offset}
              opacity={isDimmed ? 0.25 : 1}
              onMouseEnter={() => onHover(s.key)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: "pointer" }}
            />
          );
        })}
      </svg>
      <span className="risk-donut-sweep" style={{ transform: `rotate(${radarAngle}deg)` }} />
      <div className="risk-donut-center">
        <b>{displaySlice.value}</b>
        <span>{displaySlice.key.toLowerCase()}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [active, setActive] = useState("Dashboard");
  const [drawn, setDrawn] = useState(false);
 const [now, setNow] = useState(() => new Date());
  const [hoveredRisk, setHoveredRisk] = useState(null);
  const [radarAngle, setRadarAngle] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const [mockCases, setMockCases] = useState([]);

  useEffect(() => {
    async function fetchCases() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://127.0.0.1:8000/cases", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to load cases: ${response.status}`);
        }

        const data = await response.json();

        const role = localStorage.getItem("role");
        const username = localStorage.getItem("username");
        const filtered = role === "analyst" ? data.filter((c) => c.assigned_investigator === username) : data;

        const mapped = filtered.map((c) => ({
          id: c.case_number,
          title: c.title,
          suspects: 0,
          status:
            c.status === "open"
              ? "Active"
              : c.status === "under_review"
                ? "Under Review"
                : c.status === "closed"
                  ? "Closed"
                  : c.status === "archived"
                    ? "Archived"
                    : "Active",
          risk: c.priority.charAt(0).toUpperCase() + c.priority.slice(1),
          date: c.created_at?.split("T")[0],
          unit: c.assigned_investigator || "—",
        }));

        setMockCases(mapped);
      } catch (err) {
        console.error("Could not load cases for dashboard");
      }
    }
    fetchCases();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    const tick = setInterval(() => setNow(new Date()), 1000);
    const radarTick = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 25);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tick);
      clearInterval(radarTick);
    };
  }, []);

  const totalCases = mockCases.length;
  const caseloadMax = Math.max(...caseload.map((c) => c.value));
  const riskTotal = useMemo(() => riskMix.reduce((s, r) => s + r.value, 0), []);

  const navItems = [
    { label: "Dashboard", icon: <Activity size={17} />, path: "/dashboard" },
    { label: "Cases", icon: <FolderOpen size={17} /> },
    { label: "Suspects", icon: <Users size={17} /> },
    { label: "Networks", icon: <Network size={17} />, path: "/network" },
    { label: "Upload Case", icon: <Upload size={17} />, path: "/upload" },
    { label: "Reports", icon: <FileText size={17} /> },
  ];

  function onNav(item) {
    setActive(item.label);
    if (item.path) navigate(item.path);
  }

  return (
    <div className="dash-shell deck">
      

      <Sidebar />

      <div className="dash-main">
        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">Operations command deck</p>
            <h1 className="topbar-title">Situation room</h1>
          </div>
          <div className="topbar-right">
            <div className="live-chip">
              <span className="live-dot" />
              <Radio size={13} />
              Live
              <span className="live-clock">{formatClock(now)}</span>
            </div>
            <button className="icon-btn" aria-label="Alerts">
              <Bell size={16} />
              <span className="icon-btn-mark" />
            </button>
            <div className="officer" style={{ position: "relative", cursor: "pointer" }} onClick={() => setProfileOpen(!profileOpen)}>
              <div className="avatar">
                {(localStorage.getItem("username") || "??").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="officer-name">{localStorage.getItem("username") || "Guest"}</p>
                <p className="officer-role">{localStorage.getItem("role") || "Unknown"}</p>
              </div>

              {profileOpen && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0, width: 200,
                    background: "#0e131b", border: "1px solid rgba(148,163,184,0.15)",
                    borderRadius: 10, padding: 8, zIndex: 50,
                    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.6)",
                  }}
                >
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(148,163,184,0.1)", marginBottom: 6 }}>
                    <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: "#eef2f6" }}>
                      {localStorage.getItem("username") || "Guest"}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#7c8ea3", textTransform: "capitalize" }}>
                      {localStorage.getItem("role") || "Unknown"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      localStorage.removeItem("token");
                      localStorage.removeItem("role");
                      localStorage.removeItem("username");
                      navigate("/");
                    }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 10px", background: "transparent", border: 0,
                      color: "#f87171", fontSize: "0.82rem", fontWeight: 500,
                      cursor: "pointer", borderRadius: 6, textAlign: "left",
                    }}
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={`command-grid ${drawn ? "command-grid--drawn" : ""}`}>
          <section className="panel situation">
            <div className="panel-head">
              <h2>Situation overview</h2>
              <span className="panel-meta">Caseload · last 30 days</span>
            </div>
            <div className="situation-hero">
              <div>
                <p className="sit-value">{totalCases}</p>
                <p className="sit-label">Open records on file</p>
              </div>
              <div className="sit-delta">
                <span>+4</span>
                ingested this week
              </div>
            </div>
            <ul className="sit-bars">
              {caseload.map((row) => (
                <li key={row.key}>
                  <div className="sit-bar-meta">
                    <span>{row.key}</span>
                    <b>{row.value}</b>
                  </div>
                  <div className="sit-bar-track">
                    <span
                      className="sit-bar-fill"
                      style={{
                        width: drawn ? `${(row.value / caseloadMax) * 100}%` : "0%",
                        background: row.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="sit-kpis">
              <div>
                <span>Suspects</span>
                <strong>839</strong>
              </div>
              <div>
                <span>Networks</span>
                <strong>37</strong>
              </div>
              <div>
                <span>Reports</span>
                <strong>94</strong>
              </div>
            </div>
          </section>

          <section className="panel risk-panel">
            <div className="panel-head">
              <h2>Risk distribution</h2>
              <span className="panel-meta">{riskTotal} scored cases</span>
            </div>
            <div className="risk-body">
              <RiskDonut slices={riskMix} drawn={drawn} hovered={hoveredRisk} onHover={setHoveredRisk} radarAngle={radarAngle} />
              <ul className="risk-legend">
                {riskMix.map((r) => (
                  <li
                    key={r.key}
                    className={hoveredRisk === r.key ? "risk-legend-item--active" : ""}
                    onMouseEnter={() => setHoveredRisk(r.key)}
                    onMouseLeave={() => setHoveredRisk(null)}
                  >
                    <i style={{ background: r.color }} />
                    <span>{r.key}</span>
                    <b>{r.value}</b>
                    <em>{Math.round((r.value / riskTotal) * 100)}%</em>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="toolbar-strip" role="toolbar" aria-label="Deck actions">
            <button className="seg-btn seg-btn--on" onClick={() => navigate("/upload")}>
              <Upload size={14} /> Ingest case
            </button>
            <button className="seg-btn" onClick={() => navigate("/reports")}>
              <FileText size={14} /> Compile brief
            </button>
            <button className="seg-btn" onClick={() => navigate("/network")}>
              <Network size={14} /> Open graph
            </button>
          </div>

          <section className="panel manifest">
            <div className="panel-head">
              <h2>Case manifest</h2>
              <span className="panel-meta">Priority queue</span>
            </div>
            <div className="manifest-head">
              <span>Docket</span>
              <span>Operation</span>
              <span>Unit</span>
              <span>Pax</span>
              <span>Risk</span>
              <span>State</span>
              <span>Opened</span>
            </div>
            <ol className="manifest-log">
              {mockCases.map((c) => (
                <li key={c.id} className={`manifest-row risk-${c.risk.toLowerCase()}`}>
                  <span className="mono">{c.id}</span>
                  <span>{c.title}</span>
                  <span className="mono muted">{c.unit}</span>
                  <span className="mono">{String(c.suspects).padStart(2, "0")}</span>
                  <span className={`risk-tag risk-tag--${c.risk.toLowerCase()}`}>{c.risk}</span>
                  <span className="state-tag">{c.status}</span>
                  <span className="mono muted">{c.date}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel alerts">
            <div className="panel-head">
              <h2>Watch desk</h2>
              <span className="panel-meta">4 unacked</span>
            </div>
            <ul className="alert-feed">
              {alerts.map((a) => (
                <li key={a.time} className={`alert-item alert-item--${a.level.toLowerCase()}`}>
                  <span className="mono">{a.time}</span>
                  <span className="alert-level">{a.level}</span>
                  <p>{a.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
