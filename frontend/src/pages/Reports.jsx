import { useEffect, useState } from "react";
import { FileText, Download, ShieldCheck, Plus, X, Upload } from "lucide-react";
import Sidebar from "../components/Sidebar";


const REPORTS_API = "http://127.0.0.1:5000";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    case_id: "",
    title: "",
    analyst: "",
    summary: "",
    findings: "",
  });

  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  async function fetchReports() {
    try {
      const res = await fetch(`${REPORTS_API}/api/reports`);
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error("Could not load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setFormError("");

    if (!form.case_id || !form.title || !form.analyst || !form.summary || !form.findings) {
      setFormError("Please fill every field.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${REPORTS_API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        setFormError("Could not generate report.");
        setSubmitting(false);
        return;
      }

      setForm({ case_id: "", title: "", analyst: "", summary: "", findings: "" });
      setShowForm(false);
      fetchReports();
    } catch (err) {
      setFormError("Could not connect to reports server (is it running on port 5000?).");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    if (!verifyFile) return;
    setVerifying(true);
    setVerifyResult(null);

    try {
      const formData = new FormData();
      formData.append("report", verifyFile);

      const res = await fetch(`${REPORTS_API}/api/verify`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({ status: "error", message: "Could not connect to server." });
    } finally {
      setVerifying(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #2d455e",
    background: "#091827",
    color: "#edf5ff",
    fontSize: "0.85rem",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    color: "#9eb2c7",
    fontSize: "0.78rem",
    fontWeight: 600,
  };

  const sealed = reports.length;

  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <header className="topbar">
          <div className="topbar-left">
            <p className="eyebrow">DOCUMENTATION</p>
            <h1 className="topbar-title">Reports</h1>
          </div>
          <button className="qa-btn qa-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Generate Report
          </button>
        </header>

        <div className="stat-blocks">
          <div className="stat-block">
            <p className="stat-block-value">{reports.length}</p>
            <p className="stat-block-label">Total Reports</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#34d399" }}>{sealed}</p>
            <p className="stat-block-label">SHA-256 Sealed</p>
          </div>
        </div>

        {showForm && (
          <div className="panel" style={{ position: "relative" }}>
            <button
              onClick={() => setShowForm(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: 0, color: "#7890a8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
            <p className="panel-title" style={{ marginBottom: 18 }}>Generate Case Report</p>

            <form onSubmit={handleGenerate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Case ID</label>
                <input style={inputStyle} name="case_id" value={form.case_id} onChange={handleChange} placeholder="CL-2024-001" />
              </div>
              <div>
                <label style={labelStyle}>Case Title</label>
                <input style={inputStyle} name="title" value={form.title} onChange={handleChange} placeholder="Operation Shadownet" />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Analyst Name</label>
                <input style={inputStyle} name="analyst" value={form.analyst} onChange={handleChange} placeholder="rachit" />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Case Summary</label>
                <textarea style={{ ...inputStyle, minHeight: 70 }} name="summary" value={form.summary} onChange={handleChange} placeholder="Case summary..." />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Analysis Findings</label>
                <textarea style={{ ...inputStyle, minHeight: 70 }} name="findings" value={form.findings} onChange={handleChange} placeholder="Findings..." />
              </div>

              {formError && (
                <p style={{ gridColumn: "1 / -1", color: "#f87171", fontSize: "0.82rem", margin: 0 }}>{formError}</p>
              )}

              <button type="submit" className="qa-btn qa-primary" style={{ gridColumn: "1 / -1", justifyContent: "center" }} disabled={submitting}>
                {submitting ? "Generating..." : "Generate Report"}
              </button>
            </form>
          </div>
        )}

        {/* Verify Panel */}
        <div className="panel">
          <p className="panel-title" style={{ marginBottom: 14 }}>Verify Report Integrity</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label className="browse-btn" style={{ cursor: "pointer" }}>
              {verifyFile ? verifyFile.name : "Choose Report File"}
              <input type="file" accept=".pdf,.txt" onChange={(e) => setVerifyFile(e.target.files[0])} hidden />
            </label>
            <button className="qa-btn qa-primary" onClick={handleVerify} disabled={!verifyFile || verifying}>
              <Upload size={15} /> {verifying ? "Verifying..." : "Verify"}
            </button>
          </div>

          {verifyResult && (
            <div
              className={`upload-alert ${verifyResult.status === "success" ? "upload-alert--success" : "upload-alert--error"}`}
              style={{ marginTop: 14 }}
            >
              {verifyResult.status === "success" ? <ShieldCheck size={16} /> : <X size={16} />}
              {verifyResult.message}
            </div>
          )}
        </div>

        <section className="manifest-section">
          <div className="panel-head">
            <p className="panel-title">Report Log</p>
            <span className="panel-meta">{reports.length} generated</span>
          </div>

          {loading && <p className="muted">Loading reports…</p>}

          {!loading && (
            <div className="case-grid">
              {reports.map((r) => (
                <div className="case-card" key={r.report_id}>
                  <div className="case-card-top">
                    <div>
                      <p className="case-card-number">{r.report_id}</p>
                      <p className="case-card-title">Case Report</p>
                    </div>
                  </div>

                  <div className="case-card-meta">
                    <span className="badge" style={{ color: "#34d399", background: "#34d3991a", border: "1px solid #34d39944" }}>
                      <ShieldCheck size={13} /> Sealed
                    </span>
                  </div>

                  <div className="case-card-footer" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                    <span style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>SHA-256: {r.pdf_hash?.slice(0, 24)}...</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {r.pdf_filename && (
                        <a href={`${REPORTS_API}/download/${r.pdf_filename}`} target="_blank" rel="noreferrer" className="qa-btn qa-secondary" style={{ flex: 1, justifyContent: "center", padding: "6px 10px", fontSize: "0.76rem" }}>
                          <Download size={13} /> PDF
                        </a>
                      )}
                      {r.txt_filename && (
                        <a href={`${REPORTS_API}/download/${r.txt_filename}`} target="_blank" rel="noreferrer" className="qa-btn qa-secondary" style={{ flex: 1, justifyContent: "center", padding: "6px 10px", fontSize: "0.76rem" }}>
                          <Download size={13} /> TXT
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}