import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { User, X, MapPin, FolderOpen, ShieldAlert } from "lucide-react";

const mockSuspects = [
  { id: "SP-001", name: "Rahul Sharma", role: "Suspect", location: "Delhi", cases: 3, risk: "High", age: 34, contact: "9876543210", linkedCases: ["CL-2024-001"], notes: "Primary suspect in Operation Shadownet. Known associate of Amit Verma." },
  { id: "SP-002", name: "Amit Verma", role: "Associate", location: "Mumbai", cases: 1, risk: "Medium", age: 29, contact: "9812345678", linkedCases: ["CL-2024-002"], notes: "Financial handler suspected of laundering funds through shell accounts." },
  { id: "SP-003", name: "Priya Singh", role: "Associate", location: "Lucknow", cases: 2, risk: "Medium", age: 27, contact: "9900112233", linkedCases: ["CL-2024-002"], notes: "Communication intermediary between network cells." },
  { id: "SP-004", name: "Vikram Yadav", role: "Suspect", location: "Kanpur", cases: 4, risk: "High", age: 41, contact: "9765432109", linkedCases: ["CL-2024-003"], notes: "Suspected leader of trafficking route in northern zone." },
  { id: "SP-005", name: "Neha Gupta", role: "Peripheral", location: "Agra", cases: 1, risk: "Low", age: 23, contact: "9654321098", linkedCases: ["CL-2024-004"], notes: "Peripheral contact, limited involvement suspected." },
  { id: "SP-006", name: "Deepak Joshi", role: "Suspect", location: "Delhi", cases: 2, risk: "High", age: 38, contact: "9543210987", linkedCases: ["CL-2024-001"], notes: "Cyber operations specialist, believed to manage digital infrastructure." },
];

const riskColor = { High: "#d64545", Medium: "#f59e0b", Low: "#34d399" };

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(name) {
  const colors = ["#1a6fd4", "#8b5cf6", "#d64545", "#f59e0b", "#34d399", "#5b9bd5"];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function Suspects() {
  const [selected, setSelected] = useState(null);

  const high = mockSuspects.filter((s) => s.risk === "High").length;
  const medium = mockSuspects.filter((s) => s.risk === "Medium").length;
  const low = mockSuspects.filter((s) => s.risk === "Low").length;

  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <header className="topbar">
          <div className="topbar-left">
            <p className="eyebrow">PERSON REGISTRY</p>
            <h1 className="topbar-title">Suspects & Associates</h1>
          </div>
        </header>

        <div className="stat-blocks">
          <div className="stat-block">
            <p className="stat-block-value">{mockSuspects.length}</p>
            <p className="stat-block-label">Tracked Individuals</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#d64545" }}>{high}</p>
            <p className="stat-block-label">High Risk</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#f59e0b" }}>{medium}</p>
            <p className="stat-block-label">Medium Risk</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#34d399" }}>{low}</p>
            <p className="stat-block-label">Low Risk</p>
          </div>
        </div>

        <section className="manifest-section">
          <div className="panel-head">
            <p className="panel-title">Person Manifest</p>
            <span className="panel-meta">{mockSuspects.length} tracked individuals</span>
          </div>

          <div className="case-grid">
            {mockSuspects.map((s) => (
              <div className="case-card" key={s.id} style={{ cursor: "pointer" }} onClick={() => setSelected(s)}>
                <div className="case-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center",
                      background: avatarColor(s.name) + "22", color: avatarColor(s.name), fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                    }}>
                      {getInitials(s.name)}
                    </div>
                    <div>
                      <p className="case-card-number">{s.id}</p>
                      <p className="case-card-title">{s.name}</p>
                    </div>
                  </div>
                </div>

                <div className="case-card-meta">
                  <span className="badge" style={{ color: riskColor[s.risk], background: riskColor[s.risk] + "1a", border: `1px solid ${riskColor[s.risk]}44` }}>
                    {s.risk} Risk
                  </span>
                  <span className="badge" style={{ color: "#9eb2c7", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)" }}>
                    {s.role}
                  </span>
                </div>

                <div className="case-card-footer">
                  <span>{s.location}</span>
                  <span>{s.cases} linked cases</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "grid", placeItems: "center", zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="panel"
            style={{ width: "min(90vw, 480px)", position: "relative", maxHeight: "85vh", overflowY: "auto" }}
          >
            <button
              onClick={() => setSelected(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: 0, color: "#7890a8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 14, display: "grid", placeItems: "center",
                background: avatarColor(selected.name) + "22", color: avatarColor(selected.name), fontWeight: 700, fontSize: "1.3rem", flexShrink: 0,
              }}>
                {getInitials(selected.name)}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#eef2f6" }}>{selected.name}</p>
                <p style={{ margin: "4px 0 0", color: "#7c8ea3", fontSize: "0.8rem", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{selected.id}</p>
              </div>
            </div>

            <p style={{ fontSize: "0.72rem", color: "#55697d", marginBottom: 16, padding: "8px 12px", background: "rgba(148,163,184,0.06)", borderRadius: 8 }}>
              No photo on file — placeholder shown. Real photo would be attached via evidence upload in production use.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, color: "#7c8ea3", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Role</p>
                <p style={{ margin: "4px 0 0", color: "#eef2f6", fontWeight: 600 }}>{selected.role}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: "#7c8ea3", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Age</p>
                <p style={{ margin: "4px 0 0", color: "#eef2f6", fontWeight: 600 }}>{selected.age}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: "#7c8ea3", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <MapPin size={11} style={{ display: "inline", marginRight: 4 }} /> Location
                </p>
                <p style={{ margin: "4px 0 0", color: "#eef2f6", fontWeight: 600 }}>{selected.location}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: "#7c8ea3", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Contact</p>
                <p style={{ margin: "4px 0 0", color: "#eef2f6", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{selected.contact}</p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 8px", color: "#7c8ea3", fontSize: "0.78rem", fontWeight: 600 }}>
                <ShieldAlert size={14} /> RISK ASSESSMENT
              </p>
              <span className="badge" style={{ color: riskColor[selected.risk], background: riskColor[selected.risk] + "1a", border: `1px solid ${riskColor[selected.risk]}44`, fontSize: "0.82rem", padding: "5px 12px" }}>
                {selected.risk} Risk
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 8px", color: "#7c8ea3", fontSize: "0.78rem", fontWeight: 600 }}>
                <FolderOpen size={14} /> LINKED CASES
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selected.linkedCases.map((c) => (
                  <span key={c} className="badge" style={{ color: "#5b9bd5", background: "#5b9bd51a", border: "1px solid #5b9bd544", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p style={{ margin: "0 0 8px", color: "#7c8ea3", fontSize: "0.78rem", fontWeight: 600 }}>NOTES</p>
              <p style={{ margin: 0, color: "#c9d6e4", fontSize: "0.85rem", lineHeight: 1.6 }}>{selected.notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}