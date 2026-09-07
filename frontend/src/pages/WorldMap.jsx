import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import { MapPin } from "lucide-react";

const AI_API = "http://127.0.0.1:5001";

export default function WorldMap() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch(`${AI_API}/api/locations`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setLocations(data);
      } catch (err) {
        setError("Could not load location data (is AI service running on port 5001?).");
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  const totalCases = new Set(locations.flatMap((l) => l.cases)).size;

  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <header className="topbar">
          <div className="topbar-left">
            <p className="eyebrow">GEOSPATIAL INTELLIGENCE</p>
            <h1 className="topbar-title">Target Location Map</h1>
          </div>
        </header>

        <div className="stat-blocks">
          <div className="stat-block">
            <p className="stat-block-value">{locations.length}</p>
            <p className="stat-block-label">Tracked Locations</p>
          </div>
          <div className="stat-block">
            <p className="stat-block-value" style={{ color: "#5b9bd5" }}>{totalCases}</p>
            <p className="stat-block-label">Cases Mapped</p>
          </div>
        </div>

        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        <div className="panel map-panel">
          {loading ? (
            <p className="muted" style={{ padding: 20 }}>Loading map…</p>
          ) : (
            <MapContainer center={[22.9734, 78.6569]} zoom={5} className="crime-map">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors, &copy; Wikimedia'
                url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
              />
              {locations.map((loc) => (
                <CircleMarker
                  key={loc.name}
                  center={[loc.lat, loc.lng]}
                  radius={9 + loc.cases.length * 3}
                  pathOptions={{
                    color: "#d64545",
                    fillColor: "#d64545",
                    fillOpacity: 0.45,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <strong>{loc.name}</strong>
                    <br />
                    Linked cases: {loc.cases.join(", ")}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}

          {!loading && locations.length === 0 && !error && (
            <div className="node-empty" style={{ padding: 40 }}>
              <MapPin size={36} color="#2d455e" />
              <p>No locations tracked yet. Upload evidence mentioning place names to populate the map.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}