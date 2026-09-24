import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

// Derives the distinct expedition list from published content — there's no
// separate "expeditions" collection, expeditionName just lives on Content.
export default function Expeditions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expeditions, setExpeditions] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/content");
        const byName = new Map();
        for (const item of data.items) {
          const name = (item.expeditionName || "").trim();
          if (!name) continue;
          if (!byName.has(name)) {
            byName.set(name, { name, count: 0, categories: new Set() });
          }
          const entry = byName.get(name);
          entry.count += 1;
          entry.categories.add(item.category);
        }
        const list = Array.from(byName.values()).sort((a, b) => b.count - a.count);
        setExpeditions(list);
      } catch (err) {
        setError("Could not load expeditions. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="container">
      <section className="hero">
        <h1>Expeditions</h1>
        <p>Browse content grouped by NCPOR expedition, across Antarctica, Arctic and Himalaya.</p>
      </section>

      {loading && <p className="status">Loading expeditions...</p>}
      {error && <p className="status status-error">{error}</p>}
      {!loading && !error && expeditions.length === 0 && (
        <p className="status">No expeditions tagged yet — check back soon.</p>
      )}

      {!loading && !error && expeditions.length > 0 && (
        <div className="expedition-list">
          {expeditions.map((exp) => (
            <Link
              key={exp.name}
              to={`/expedition/${encodeURIComponent(exp.name)}`}
              className="expedition-card"
            >
              <h3>{exp.name}</h3>
              <p>{Array.from(exp.categories).join(", ")}</p>
              <span className="category-count">{exp.count} item{exp.count === 1 ? "" : "s"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
