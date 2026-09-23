import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

/**
 * Human-readable sitemap page (distinct from /sitemap.xml, which is for
 * search-engine crawlers). This is a categorized index of the whole
 * site for visitors and screen-reader users to navigate from one page
 * — the pattern many large sites (e.g. UIDAI's "Site Map") use.
 */
export default function Sitemap() {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/sitemap")
      .then(({ data }) => setCategories(data.categories || {}))
      .catch(() => setError("Could not load the sitemap right now."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.title = "Sitemap — PolarConnect";
  }, []);

  const categoryNames = Object.keys(categories).sort();

  return (
    <div className="container">
      <h1>Sitemap</h1>
      <p className="muted">Every section of PolarConnect, in one place.</p>

      <section className="sitemap-section">
        <h2>Main</h2>
        <ul className="sitemap-list">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Contact</Link></li>
          <li><Link to="/admin/login">Admin Login</Link></li>
        </ul>
      </section>

      {loading && <p className="status">Loading sitemap...</p>}
      {error && <p className="status status-error">{error}</p>}

      {categoryNames.map((cat) => (
        <section className="sitemap-section" key={cat}>
          <h2>{cat}</h2>
          {categories[cat].length === 0 ? (
            <p className="muted">No published content yet.</p>
          ) : (
            <ul className="sitemap-list">
              {categories[cat].map((c) => (
                <li key={c.id}>
                  <Link to={`/content/${c.id}`}>{c.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {!loading && !error && categoryNames.length === 0 && (
        <p className="status">No published content yet — check back soon.</p>
      )}

      <p className="muted sitemap-footer-note">
        For search engines, see the machine-readable <a href="/sitemap.xml">sitemap.xml</a>.
      </p>
    </div>
  );
}
