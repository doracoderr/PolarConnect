import { useEffect, useState } from "react";
import api from "../api/client";
import ContentCard from "../components/ContentCard.jsx";
import SearchBar from "../components/SearchBar.jsx";

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

      <div className="grid">
        {items.map((item) => <ContentCard key={item._id} item={item} />)}
      </div>
    </div>
  );
}
