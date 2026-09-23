import { useEffect, useState } from "react";
import api from "../api/client";
import ContentCard from "../components/ContentCard.jsx";
import SearchBar from "../components/SearchBar.jsx";

const CATEGORY_ORDER = ["Antarctica", "Arctic", "Himalaya", "General"];

export default function PublicPortal() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchContent() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/content", { params: { search, category } });
      setItems(data.items);
    } catch (err) {
      setError("Could not load content. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchContent(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isFiltered = Boolean(search.trim() || category);

  // Group into category sections for the default browsing view; a search
  // or an explicit category pick switches to a flat filtered grid instead.
  const sections = CATEGORY_ORDER
    .map((cat) => ({ cat, list: items.filter((i) => i.category === cat) }))
    .filter((s) => s.list.length > 0);
  const knownCats = new Set(CATEGORY_ORDER);
  const other = items.filter((i) => !knownCats.has(i.category));
  if (other.length > 0) sections.push({ cat: "Other", list: other });

  return (
    <div className="container">
      <section className="hero">
        <h1>PolarConnect</h1>
        <p>Explore NCPOR's Antarctica, Arctic and Himalaya expedition reports, photos and videos.</p>
      </section>

      <SearchBar
        search={search} setSearch={setSearch}
        category={category} setCategory={setCategory}
        onSubmit={fetchContent}
      />

      {loading && <p className="status">Loading content...</p>}
      {error && <p className="status status-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="status">No content published yet — check back soon.</p>
      )}

      {!loading && !error && items.length > 0 && (
        isFiltered ? (
          <div className="grid">
            {items.map((item) => <ContentCard key={item._id} item={item} />)}
          </div>
        ) : (
          sections.map(({ cat, list }) => (
            <section className="category-section" key={cat}>
              <div className="category-heading">
                <h2>{cat}</h2>
                <span className="category-count">{list.length}</span>
              </div>
              <div className="grid">
                {list.map((item) => <ContentCard key={item._id} item={item} />)}
              </div>
            </section>
          ))
        )
      )}
    </div>
  );
}

