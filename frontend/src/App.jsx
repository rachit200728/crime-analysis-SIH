import { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import {
  ShieldCheck,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import Dashboard from "./pages/Dashboard";
import UploadCase from "./pages/UploadCase";
import NetworkGraph from "./pages/NetworkGraph";
import Cases from "./pages/Cases";
import Suspects from "./pages/Suspects";
import Networks from "./pages/Networks";
import Reports from "./pages/Reports";
import WorldMap from "./pages/WorldMap";
import "./App.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;

    if (!email || !password) {
      setMessage("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const formData = new URLSearchParams();
      formData.append("grant_type", "password");
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        setMessage("Invalid username or password.");
        setSubmitting(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", email);

      navigate("/dashboard");
    } catch (err) {
      setMessage("Could not connect to server. Is the backend running?");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">

      <section className="login-brand">
        <svg className="brand-graphic" viewBox="0 0 460 460" xmlns="http://www.w3.org/2000/svg">
          <line x1="230" y1="230" x2="90" y2="120" stroke="rgba(87,182,255,0.25)" strokeWidth="1" />
          <line x1="230" y1="230" x2="360" y2="90" stroke="rgba(87,182,255,0.25)" strokeWidth="1" />
          <line x1="230" y1="230" x2="380" y2="260" stroke="rgba(87,182,255,0.25)" strokeWidth="1" />
          <line x1="230" y1="230" x2="150" y2="360" stroke="rgba(87,182,255,0.25)" strokeWidth="1" />
          <line x1="230" y1="230" x2="330" y2="380" stroke="rgba(87,182,255,0.25)" strokeWidth="1" />
          <line x1="90" y1="120" x2="150" y2="60" stroke="rgba(87,182,255,0.15)" strokeWidth="1" />
          <line x1="360" y1="90" x2="410" y2="150" stroke="rgba(87,182,255,0.15)" strokeWidth="1" />
          <line x1="380" y1="260" x2="440" y2="230" stroke="rgba(87,182,255,0.15)" strokeWidth="1" />
          <line x1="150" y1="360" x2="80" y2="410" stroke="rgba(87,182,255,0.15)" strokeWidth="1" />
          <line x1="330" y1="380" x2="390" y2="430" stroke="rgba(87,182,255,0.15)" strokeWidth="1" />
          <line x1="90" y1="120" x2="360" y2="90" stroke="rgba(87,182,255,0.08)" strokeWidth="1" />

          <circle cx="150" cy="60" r="3" fill="#57b6ff" opacity="0.4" />
          <circle cx="410" cy="150" r="3" fill="#57b6ff" opacity="0.4" />
          <circle cx="440" cy="230" r="3" fill="#57b6ff" opacity="0.4" />
          <circle cx="80" cy="410" r="3" fill="#57b6ff" opacity="0.4" />
          <circle cx="390" cy="430" r="3" fill="#57b6ff" opacity="0.4" />

          <circle cx="90" cy="120" r="5" fill="#57b6ff" opacity="0.6" />
          <circle cx="360" cy="90" r="5" fill="#57b6ff" opacity="0.6" />
          <circle cx="380" cy="260" r="5" fill="#57b6ff" opacity="0.6" />
          <circle cx="150" cy="360" r="5" fill="#57b6ff" opacity="0.6" />
          <circle cx="330" cy="380" r="5" fill="#57b6ff" opacity="0.6" />

          <circle cx="230" cy="230" r="7" fill="#57d6c0" className="hub-node" />
          <circle cx="230" cy="230" r="14" fill="none" stroke="#57d6c0" strokeWidth="1" opacity="0.4" className="hub-ring" />
        </svg>

        <div className="login-status-pulse">
          
          <span className="pulse-dot" />
          SYSTEM OPERATIONAL
        </div>

        <div className="brand-mark">
          <ShieldCheck size={32} />
        </div>
        <p className="eyebrow">SECURE INVESTIGATION PLATFORM</p>
        <h1>CrimeLink Intelligence Portal</h1>
        <p className="brand-description">
          Transform case records into clear, explainable network intelligence.
        </p>

        <div className="brand-chips">
          <span className="brand-chip">
            <LockKeyhole size={13} /> 256-bit Encryption
          </span>
          <span className="brand-chip">
            <ShieldCheck size={13} /> Role-based Access
          </span>
          <span className="brand-chip">
            <ArrowRight size={13} /> Audit-ready Records
          </span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-subtitle">
            Use your authorised investigation account.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Username</label>
            <div className="input-wrap">
              <Mail size={18} />
              <input
                id="email"
                name="email"
                type="text"
                placeholder="Enter your username"
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <LockKeyhole size={18} />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
              />
              <button
                className="password-toggle"
                type="button"
                aria-label="Show or hide password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="form-row">
              <label className="remember-me">
                <input type="checkbox" />
                Remember this device
              </label>
              <button type="button" className="text-button">
                Forgot password?
              </button>
            </div>

            <button className="sign-in-button" type="submit" disabled={submitting}>
              {submitting ? "Verifying..." : "Sign in securely"}
              <ArrowRight size={18} />
            </button>

            {message && <p className="form-message" style={{ color: message.includes("Invalid") || message.includes("Could not") || message.includes("required") || message.includes("Please") ? "#f87171" : "#85e8d7" }}>{message}</p>}
          </form>

          <p className="access-note">
            Access is monitored and recorded for authorised use only.
          </p>
        </div>
      </section>
    </main>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><UploadCase /></ProtectedRoute>} />
      <Route path="/network" element={<ProtectedRoute><NetworkGraph /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
      <Route path="/suspects" element={<ProtectedRoute><Suspects /></ProtectedRoute>} />
      <Route path="/networks" element={<ProtectedRoute><Networks /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><WorldMap /></ProtectedRoute>} />
    </Routes>
  );
}