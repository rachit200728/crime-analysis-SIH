import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { AlertTriangle, Clock, CheckCircle, Plus, X, Pencil, Link2, Sparkles, CalendarClock } from "lucide-react";

const AI_API = "http://127.0.0.1:5001";

const statusIcon = {
  open: <AlertTriangle size={14} />,
  under_review: <Clock size={14} />,
  closed: <CheckCircle size={14} />,
  archived: <CheckCircle size={14} />,
};

const statusColor = { open: "#d64545", under_review: "#f59e0b", closed: "#34d399", archived: "#7890a8" };
const riskColor = { high: "#d64545", medium: "#f59e0b", low: "#34d399" };

const emptyForm = {
  case_number: "",
  title: "",
  description: "",
  status: "open",
  priority: "medium",
  assigned_investigator: "",
};

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [linkedFor, setLinkedFor] = useState(null);
  const [linkedMatches, setLinkedMatches] = useState([]);
  const [linkedLoading, setLinkedLoading] = useState(false);

  const [timelineFor, setTimelineFor] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  async function fetchCases() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/cases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  useEffect(() => {
    fetchCases();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(c) {
    setForm({
      case_number: c.case_number,
      title: c.title,
      description: c.description || "",
      status: c.status,
      priority: c.priority,
      assigned_investigator: c.assigned_investigator || "",
    });
    setEditingId(c.id);
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    setFormError("");

    if (!form.case_number || !form.title) {
      setFormError("Case number and title are required.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const isEditing = editingId !== null;

      const url = isEditing
        ? `http://127.0.0.1:8000/cases/${editingId}`
        : "http://127.0.0.1:8000/cases";

      const body = isEditing
        ? {
            title: form.title,
            description: form.description,
            status: form.status,
            priority: form.priority,
            assigned_investigator: form.assigned_investigator,
          }
        : form;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setFormError(isEditing ? "Could not update case." : "Could not create case. Check case number is unique.");
        setSubmitting(false);
        return;
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      fetchCases();
    } catch (err) {
      setFormError("Could not connect to server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function checkLinkedCases(c) {
    setLinkedFor(c);
    setLinkedLoading(true);
    setLinkedMatches([]);

    try {
      const res = await fetch(`${AI_API}/api/linked-cases/${c.case_number}`);
      const data = await res.json();
      setLinkedMatches(data.matches || []);
    } catch (err) {
      setLinkedMatches([]);
    } finally {
      setLinkedLoading(false);
    }
  }

  async function checkTimeline(c) {
    setTimelineFor(c);
    setTimelineLoading(true);
    setTimelineEvents([]);

    try {
      const res = await fetch(`${AI_API}/api/timeline/${c.case_number}`);
      const data = await res.json();
      setTimelineEvents(data.events || []);
    } catch (err) {
      setTimelineEvents([]);
    } finally {
      setTimelineLoading(false);
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

  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <header className="topbar">
          <div className="topbar-left">
            <p className="eyebrow">CASE REGISTRY</p>
            <h1 className="topbar-title">All Cases</h1>
          </div>
          <button className="qa-btn qa-primary" onClick={openAddForm}>
            <Plus size={16} /> Add Case
          </button>
        </header>

        <div className="stat-blocks">
          <div className="stat-block">
            <p className="stat-block-value">{cases.length}</p>
            <p className="stat-block-label">Total Cases</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#d64545" }}>{cases.filter((c) => c.status === "open").length}</p>
            <p className="stat-block-label">Open</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#f59e0b" }}>{cases.filter((c) => c.status === "under_review").length}</p>
            <p className="stat-block-label">Under Review</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#34d399" }}>{cases.filter((c) => c.status === "closed").length}</p>
            <p className="stat-block-label">Closed</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#7890a8" }}>{cases.filter((c) => c.status === "archived").length}</p>
            <p className="stat-block-label">Archived</p>
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
            <p className="panel-title" style={{ marginBottom: 18 }}>
              {editingId !== null ? "Edit Case" : "New Case"}
            </p>

            <form onSubmit={handleSubmitForm} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Case Number</label>
                <input
                  style={{ ...inputStyle, opacity: editingId !== null ? 0.5 : 1 }}
                  name="case_number"
                  value={form.case_number}
                  onChange={handleChange}
                  placeholder="CL-2024-007"
                  disabled={editingId !== null}
                />
              </div>
              <div>
                <label style={labelStyle}>Title</label>
                <input style={inputStyle} name="title" value={form.title} onChange={handleChange} placeholder="Case title" />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} name="description" value={form.description} onChange={handleChange} placeholder="Short description" />
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} name="status" value={form.status} onChange={handleChange}>
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} name="priority" value={form.priority} onChange={handleChange}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Assigned Investigator (username)</label>
                <input style={inputStyle} name="assigned_investigator" value={form.assigned_investigator} onChange={handleChange} placeholder="e.g. rachit or priya" />
              </div>

              {formError && (
                <p style={{ gridColumn: "1 / -1", color: "#f87171", fontSize: "0.82rem", margin: 0 }}>{formError}</p>
              )}

              <button
                type="submit"
                className="qa-btn qa-primary"
                style={{ gridColumn: "1 / -1", justifyContent: "center" }}
                disabled={submitting}
              >
                {submitting ? "Saving..." : editingId !== null ? "Save Changes" : "Create Case"}
              </button>
            </form>
          </div>
        )}

        <section className="manifest-section">
          <div className="panel-head">
            <p className="panel-title">Case Manifest</p>
            <span className="panel-meta">{cases.length} total records</span>
          </div>

          {loading && <p className="muted">Loading cases…</p>}
          {error && <p style={{ color: "#f87171" }}>{error}</p>}

          {!loading && !error && (
            <div className="case-grid">
              {cases.map((c) => (
                <div className="case-card" key={c.id}>
                  <div className="case-card-top">
                    <div>
                      <p className="case-card-number">{c.case_number}</p>
                      <p className="case-card-title">{c.title}</p>
                    </div>
                    <button
                      onClick={() => openEditForm(c)}
                      style={{ background: "transparent", border: 0, color: "#5b9bd5", cursor: "pointer", display: "flex", alignItems: "center" }}
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  <div className="case-card-meta">
                    <span className="badge" style={{ color: riskColor[c.priority], background: riskColor[c.priority] + "1a", border: `1px solid ${riskColor[c.priority]}44` }}>
                      {c.priority}
                    </span>
                    <span className="badge" style={{ color: statusColor[c.status], background: statusColor[c.status] + "1a", border: `1px solid ${statusColor[c.status]}44` }}>
                      {statusIcon[c.status]} {c.status}
                    </span>
                  </div>

                  <div className="case-card-footer" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{c.assigned_investigator || "Unassigned"}</span>
                      <span>{c.created_at?.split("T")[0]}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="qa-btn qa-secondary"
                        style={{ flex: 1, justifyContent: "center", padding: "7px 10px", fontSize: "0.78rem" }}
                        onClick={() => checkLinkedCases(c)}
                      >
                        <Link2 size={13} /> Linked
                      </button>
                      <button
                        className="qa-btn qa-secondary"
                        style={{ flex: 1, justifyContent: "center", padding: "7px 10px", fontSize: "0.78rem" }}
                        onClick={() => checkTimeline(c)}
                      >
                        <CalendarClock size={13} /> Timeline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {linkedFor && (
        <div
          onClick={() => setLinkedFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="panel"
            style={{ width: "min(90vw, 480px)", position: "relative", maxHeight: "80vh", overflowY: "auto" }}
          >
            <button
              onClick={() => setLinkedFor(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: 0, color: "#7890a8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <p className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Sparkles size={16} color="#5b9bd5" /> AI Linked Case Analysis
            </p>
            <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 18 }}>{linkedFor.case_number} — {linkedFor.title}</p>

            {linkedLoading && <p className="muted">Analyzing shared entities…</p>}

            {!linkedLoading && linkedMatches.length === 0 && (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No overlapping suspects, locations, or organizations found with other cases. Upload evidence with shared entities to see connections here.
              </p>
            )}

            {!linkedLoading && linkedMatches.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {linkedMatches.map((m, i) => (
                  <div key={i} style={{ padding: "12px 14px", border: "1px solid rgba(59,163,255,0.2)", borderRadius: 10, background: "rgba(59,163,255,0.05)" }}>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#eef2f6" }}>
                      Linked to <span style={{ color: "#5b9bd5", fontWeight: 700 }}>{m.linked_case}</span>
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#9eb2c7" }}>
                      Shared {m.type}: <strong>{m.shared_entity}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {timelineFor && (
        <div
          onClick={() => setTimelineFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="panel"
            style={{ width: "min(90vw, 500px)", position: "relative", maxHeight: "80vh", overflowY: "auto" }}
          >
            <button
              onClick={() => setTimelineFor(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: 0, color: "#7890a8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <p className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <CalendarClock size={16} color="#5b9bd5" /> AI-Generated Timeline
            </p>
            <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 18 }}>{timelineFor.case_number} — {timelineFor.title}</p>

            {timelineLoading && <p className="muted">Building timeline…</p>}

            {!timelineLoading && timelineEvents.length === 0 && (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                No dated events found in uploaded evidence yet. Upload evidence mentioning specific dates to populate the timeline.
              </p>
            )}

            {!timelineLoading && timelineEvents.length > 0 && (
              <div style={{ position: "relative", paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: "rgba(59,163,255,0.2)" }} />
                {timelineEvents.map((ev, i) => (
                  <div key={i} style={{ position: "relative", paddingBottom: 20 }}>
                    <div style={{ position: "absolute", left: -20, top: 3, width: 10, height: 10, borderRadius: "50%", background: "#5b9bd5", boxShadow: "0 0 8px rgba(91,155,213,0.6)" }} />
                    <p style={{ margin: 0, color: "#5b9bd5", fontSize: "0.78rem", fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{ev.date}</p>
                    <p style={{ margin: "4px 0 0", color: "#c9d6e4", fontSize: "0.85rem", lineHeight: 1.5 }}>{ev.context}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}