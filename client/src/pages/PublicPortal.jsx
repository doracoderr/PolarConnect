import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import ContentCard from "../components/ContentCard.jsx";
import SearchBar from "../components/SearchBar.jsx";

const PLACE_COPY = {
  Antarctica: {
    icon: "🧊",
    text: "Field reports, photographs and video from NCPOR's Maitri and Bharati stations, documenting India's ongoing presence in Antarctica.",
    accent: "#2f6fa8",
  },
  Arctic: {
    icon: "❄️",
    text: "Dispatches from Himadri, India's Arctic research station in Svalbard — glaciology, atmospheric and marine studies.",
    accent: "#1c8fa8",
  },
  Himalaya: {
    icon: "🏔️",
    text: "Glacier surveys and cryosphere fieldwork from across the Indian Himalaya, tracking change at its highest reaches.",
    accent: "#7a6a53",
  },
};
const PLACE_ORDER = ["Antarctica", "Arctic", "Himalaya"];

// A single place's content (fixedCategory: "Antarctica" / "Arctic" /
// "Himalaya") or a single expedition's content (fixedExpedition: its name).
// Used by /antarctica, /arctic, /himalaya and /expedition/:name — never
// rendered bare, so it always has exactly one of the two.
export default function PublicPortal({ fixedCategory, fixedExpedition }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchContent(searchValue = search) {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/content", {
        params: { search: searchValue, category: fixedCategory, expedition: fixedExpedition },
      });
      setItems(data.items);
    } catch (err) {
      setError("Could not load content. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchContent(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const place = fixedCategory ? PLACE_COPY[fixedCategory] : null;
  const heroTitle = fixedCategory || fixedExpedition || "";
  const heroText = fixedCategory
    ? (place?.text ?? `NCPOR's ${fixedCategory} expedition reports, photos and videos.`)
    : `All reports, photos and videos from the ${fixedExpedition} expedition.`;
  const accent = place?.accent || "var(--accent)";

  return (
    <div className="container">
      <div className="breadcrumb-row">
        <Link to="/" className="breadcrumb-link">← Home</Link>
        {fixedExpedition && <Link to="/expeditions" className="breadcrumb-link">All expeditions</Link>}
        {fixedCategory && PLACE_ORDER.filter((p) => p !== fixedCategory).map((p) => (
          <Link key={p} to={`/${p.toLowerCase()}`} className="breadcrumb-link">
            {PLACE_COPY[p].icon} {p}
          </Link>
        ))}
      </div>

      <section className="place-hero" style={{ "--place-accent": accent }}>
        {place && <span className="place-hero-icon">{place.icon}</span>}
        <h1>{heroTitle}</h1>
        <p>{heroText}</p>
      </section>

      <SearchBar
        search={search} setSearch={setSearch}
        onSubmit={() => fetchContent()}
        hideCategory
      />

      {loading && <p className="status">Loading content...</p>}
      {error && <p className="status status-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="status">No content published here yet — check back soon.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <p className="result-count">{items.length} result{items.length === 1 ? "" : "s"}</p>
          <div className="grid">
            {items.map((item) => <ContentCard key={item._id} item={item} />)}
          </div>
        </>
      )}
    </div>
  );
}