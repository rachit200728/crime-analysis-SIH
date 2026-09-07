import { useEffect, useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
  User,
  MapPin,
  Building2,
} from "lucide-react";
import Sidebar from "../components/Sidebar";


const AI_API = "http://127.0.0.1:5001";

export default function UploadCase() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [entities, setEntities] = useState(null);
  const [aiError, setAiError] = useState("");

  const allowed = ["csv", "json", "pdf", "txt", "jpg", "jpeg", "png"];

  useEffect(() => {
    async function fetchCases() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://127.0.0.1:8000/cases", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setCases(data);
      } catch (err) {
        console.error("Could not load cases");
      }
    }
    fetchCases();
  }, []);

  function validateFile(f) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError("File type not supported.");
      setFile(null);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB.");
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
    setSuccess(false);
    setEntities(null);
    setAiError("");

    if (ext === "txt") {
      analyzeTextFile(f);
    }
  }

  async function analyzeTextFile(f) {
    setAnalyzing(true);
    setAiError("");
    try {
      const text = await f.text();
      const caseObj = cases.find((c) => String(c.id) === String(selectedCase));
      const caseNumber = caseObj ? caseObj.case_number : null;

      const res = await fetch(`${AI_API}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, case_id: caseNumber }),
      });

      if (!res.ok) {
        setAiError("Could not analyze file.");
        return;
      }

      const data = await res.json();
      setEntities(data.entities);
    } catch (err) {
      setAiError("AI service not reachable (is it running on port 5001?).");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) validateFile(f);
  }

  function handleInput(e) {
    const f = e.target.files[0];
    if (f) validateFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    if (!selectedCase) {
      setError("Please select a case first.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `http://127.0.0.1:8000/cases/${selectedCase}/evidence`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        setError("Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      setSuccess(true);
      setFile(null);
    } catch (err) {
      setError("Could not connect to server.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="dash-shell">
      
      <Sidebar />
      <div className="upload-page">
        <div className="upload-header">
          <p className="eyebrow">CASE MANAGEMENT</p>
          <h1 className="topbar-title">Upload Evidence</h1>
          <p className="upload-subtitle">
            Attach evidence files to an existing case. Text files are automatically scanned for names, locations, and organizations.
          </p>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, color: "#dce7f4", fontSize: "0.9rem", fontWeight: 600 }}>
            Select Case
          </label>
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #2d455e",
              background: "#091827",
              color: "#edf5ff",
              fontSize: "0.9rem",
            }}
          >
            <option value="">-- Choose a case --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`drop-zone ${dragOver ? "drop-zone--active" : ""} ${file ? "drop-zone--filled" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="file-preview">
              <FileText size={36} color="#1a6fd4" />
              <div>
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button className="remove-file" onClick={() => { setFile(null); setSuccess(false); setEntities(null); }}>
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={40} color="#1a6fd4" />
              <p className="drop-title">Drag & drop your file here</p>
              <p className="drop-sub">Supports csv, json, pdf, txt, images — max 10MB</p>
              <label className="browse-btn">
                Browse File
                <input type="file" onChange={handleInput} hidden />
              </label>
            </>
          )}
        </div>

        {analyzing && (
          <div className="scan-panel">
            <div className="scan-line" />
            <Sparkles size={16} className="scan-icon" />
            <span>Analyzing document for entities...</span>
          </div>
        )}

        {aiError && (
          <div className="upload-alert upload-alert--error">
            <AlertTriangle size={16} /> {aiError}
          </div>
        )}

        {entities && (
          <div className="panel">
            <div className="panel-head">
              <p className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="#5b9bd5" /> AI Extracted Entities
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <p style={{ display: "flex", alignItems: "center", gap: 6, color: "#7c8ea3", fontSize: "0.78rem", fontWeight: 600, marginBottom: 8 }}>
                  <User size={14} /> PEOPLE
                </p>
                {entities.person.length ? entities.person.map((p, i) => (
                  <span key={i} className="badge" style={{ color: "#5b9bd5", background: "#5b9bd51a", border: "1px solid #5b9bd544", marginRight: 6, marginBottom: 6, display: "inline-flex" }}>
                    {p}
                  </span>
                )) : <p className="muted" style={{ fontSize: "0.8rem" }}>None found</p>}
              </div>

              <div>
                <p style={{ display: "flex", alignItems: "center", gap: 6, color: "#7c8ea3", fontSize: "0.78rem", fontWeight: 600, marginBottom: 8 }}>
                  <MapPin size={14} /> LOCATIONS
                </p>
                {entities.location.length ? entities.location.map((l, i) => (
                  <span key={i} className="badge" style={{ color: "#34d399", background: "#34d3991a", border: "1px solid #34d39944", marginRight: 6, marginBottom: 6, display: "inline-flex" }}>
                    {l}
                  </span>
                )) : <p className="muted" style={{ fontSize: "0.8rem" }}>None found</p>}
              </div>

              <div>
                <p style={{ display: "flex", alignItems: "center", gap: 6, color: "#7c8ea3", fontSize: "0.78rem", fontWeight: 600, marginBottom: 8 }}>
                  <Building2 size={14} /> ORGANIZATIONS
                </p>
                {entities.organization.length ? entities.organization.map((o, i) => (
                  <span key={i} className="badge" style={{ color: "#f59e0b", background: "#f59e0b1a", border: "1px solid #f59e0b44", marginRight: 6, marginBottom: 6, display: "inline-flex" }}>
                    {o}
                  </span>
                )) : <p className="muted" style={{ fontSize: "0.8rem" }}>None found</p>}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="upload-alert upload-alert--error">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {success && (
          <div className="upload-alert upload-alert--success">
            <CheckCircle size={16} /> Evidence uploaded successfully!
          </div>
        )}

        <button
          className={`qa-btn qa-primary upload-submit ${!file || uploading ? "upload-submit--disabled" : ""}`}
          onClick={handleSubmit}
          disabled={!file || uploading}
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload Evidence"}
        </button>
      </div>
    </div>
  );
}