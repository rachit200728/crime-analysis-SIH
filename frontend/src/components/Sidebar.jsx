import { useNavigate, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  FolderOpen,
  Users,
  Network,
  Upload,
  FileText,
  LogOut,
  TrendingUp,
  MapPin,
} from "lucide-react";

const allNavItems = [
  { label: "Dashboard", icon: <TrendingUp size={18} />, path: "/dashboard" },
  { label: "Cases", icon: <FolderOpen size={18} />, path: "/cases" },
  { label: "Suspects", icon: <Users size={18} />, path: "/suspects" },
  { label: "Networks", icon: <Network size={18} />, path: "/networks" },
  { label: "Location Map", icon: <MapPin size={18} />, path: "/map" },
  { label: "Upload Case", icon: <Upload size={18} />, path: "/upload", supervisorOnly: true },
  { label: "Reports", icon: <FileText size={18} />, path: "/reports" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");

  const navItems = allNavItems.filter((item) => !item.supervisorOnly || role === "supervisor");

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark-sm">
          <ShieldCheck size={18} />
        </div>
        <div>
          <span className="brand-name">CrimeLink</span>
          <span className="brand-unit">Deck 01 · Ops</span>
        </div>
      </div>

      <p className="nav-kicker">Command</p>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`nav-item ${location.pathname === item.path ? "nav-item--active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <button
        className="nav-item logout-btn"
        onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          navigate("/");
        }}
      >
        <LogOut size={17} />
        End session
      </button>
    </aside>
  );
}