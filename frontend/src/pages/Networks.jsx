import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Network, ArrowRight } from "lucide-react";

const riskColor = { high: "#d64545", medium: "#f59e0b", low: "#34d399" };

export default function Networks() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCases() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://127.0.0.1:8000/cases", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setError("Could not load cases.");
          return;
        }

        const data = await response.json();
        const role = localStorage.getItem("role");
        const username = localStorage.getItem("username");

        if (role === "analyst") {
          setCases(data.filter((c) => c.assigned_investigator === username));
        } else {
          setCases(data);
        }
      } catch (err) {
        setError("Could not connect to server.");
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, []);

  const highRisk = cases.filter((c) => c.priority === "high").length;

  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <header className="topbar">
          <div className="topbar-left">
            <p className="eyebrow">GRAPH INTELLIGENCE</p>
            <h1 className="topbar-title">Crime Networks</h1>
          </div>
        </header>

        <div className="stat-blocks">
          <div className="stat-block">
            <p className="stat-block-value">{cases.length}</p>
            <p className="stat-block-label">Active Networks</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#d64545" }}>{highRisk}</p>
            <p className="stat-block-label">High Risk Networks</p>
          </div>
        </div>

        <section className="manifest-section">
          <div className="panel-head">
            <p className="panel-title">Network Registry</p>
            <span className="panel-meta">One graph per case</span>
          </div>

          {loading && <p className="muted">Loading networks…</p>}
          {error && <p style={{ color: "#f87171" }}>{error}</p>}

          {!loading && !error && (
            <div className="case-grid">
              {cases.map((c) => (
                <div
                  className="case-card"
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/network", { state: { caseId: c.id, caseNumber: c.case_number, caseTitle: c.title } })}
                >
                  <div className="case-card-top">
                    <div>
                      <p className="case-card-number">{c.case_number}</p>
                      <p className="case-card-title">{c.title}</p>
                    </div>
                  </div>

                  <div className="case-card-meta">
                    <span className="badge" style={{ color: riskColor[c.priority], background: riskColor[c.priority] + "1a", border: `1px solid ${riskColor[c.priority]}44` }}>
                      {c.priority} Risk
                    </span>
                  </div>

                  <div className="case-card-footer">
                    <span>{c.assigned_investigator || "Unassigned"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#5b9bd5" }}>
                      View Graph <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}

              {cases.length === 0 && (
                <p className="muted">No cases yet. Add a case to see its network here.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}