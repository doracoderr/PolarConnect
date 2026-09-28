const CATEGORIES = ["", "Antarctica", "Arctic", "Himalaya", "General"];
const CONTENT_TYPES = [
  "",
  "Expedition Report",
  "Scientific Dataset",
  "Publication",
  "Photograph",
  "Video",
  "Institutional Activity",
];

export default function SearchBar({
  search, setSearch,
  category, setCategory,
  contentType, setContentType,
  onSubmit, hideCategory, hideContentType,
}) {
  return (
    <form className="search-bar" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <input
        type="text"
        placeholder="Search expeditions, reports, tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!hideCategory && (
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c || "All categories"}</option>
          ))}
        </select>
      )}
      {!hideContentType && (
        <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
          {CONTENT_TYPES.map((c) => (
            <option key={c} value={c}>{c || "All content types"}</option>
          ))}
        </select>
      )}
      <button type="submit">Search</button>
    </form>
  );
}
