import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import ContentCard from "../components/ContentCard.jsx";

const REGIONS = [
  {
    key: "Antarctica",
    route: "/antarctica",
    icon: "🧊",
    text: "Maitri and Bharati station expedition reports, photos and videos.",
  },
  {
    key: "Arctic",
    route: "/arctic",
    icon: "❄️",
    text: "Research from Himadri station, Svalbard.",
  },
  {
    key: "Himalaya",
    route: "/himalaya",
    icon: "🏔️",
    text: "Cryosphere and glacier studies across the Himalaya.",
  },
];

const LATEST_LIMIT = 6;

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/content");
        setItems(data.items);
      } catch (err) {
        setError("Could not load content. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const counts = REGIONS.reduce((acc, r) => {
    acc[r.key] = items.filter((i) => i.category === r.key).length;
    return acc;
  }, {});
  const expeditionCount = new Set(
    items.map((i) => (i.expeditionName || "").trim()).filter(Boolean)
  ).size;
  const latest = items.slice(0, LATEST_LIMIT);

  return (
    <div className="container">
      <section className="home-hero">
        <h1>PolarConnect</h1>
        <p>
          India's gateway to polar and high-altitude science — browse expedition
          reports, photos and videos from Antarctica, the Arctic and the Himalaya,
          all in one searchable archive.
        </p>
        <div className="hero-actions">
          <Link to="/expeditions" className="nav-button">Browse expeditions</Link>
          <Link to="/about" className="nav-button nav-button-outline">About NCPOR</Link>
        </div>
      </section>

      {!loading && !error && items.length > 0 && (
        <div className="stat-strip">
          <div className="stat-pill"><span className="stat-icon">🗂️</span><strong>{items.length}</strong><span>Total items</span></div>
          <div className="stat-pill"><span className="stat-icon">🧭</span><strong>{expeditionCount}</strong><span>Expeditions</span></div>
          <div className="stat-pill"><span className="stat-icon">🧊</span><strong>{counts.Antarctica}</strong><span>Antarctica</span></div>
          <div className="stat-pill"><span className="stat-icon">❄️</span><strong>{counts.Arctic}</strong><span>Arctic</span></div>
          <div className="stat-pill"><span className="stat-icon">🏔️</span><strong>{counts.Himalaya}</strong><span>Himalaya</span></div>
        </div>
      )}

      <section className="region-section">
        <h2>Explore by region</h2>
        <div className="region-grid">
          {REGIONS.map((r) => (
            <Link to={r.route} key={r.key} className={`region-card region-${r.key.toLowerCase()}`}>
              <span className="region-icon">{r.icon}</span>
              <h3>{r.key}</h3>
              <p>{r.text}</p>
              <span className="region-count">
                {counts[r.key] || 0} item{counts[r.key] === 1 ? "" : "s"} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {loading && <p className="status">Loading content...</p>}
      {error && <p className="status status-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="status">No content published yet — check back soon.</p>
      )}

      {!loading && !error && latest.length > 0 && (
        <section className="category-section">
          <div className="category-heading">
            <h2>Latest from the field</h2>
            <Link to="/expeditions" className="view-all-link">View all expeditions →</Link>
          </div>
          <div className="grid">
            {latest.map((item) => <ContentCard key={item._id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}