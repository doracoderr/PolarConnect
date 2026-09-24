const CATEGORIES = ["", "Antarctica", "Arctic", "Himalaya", "General"];

export default function SearchBar({ search, setSearch, category, setCategory, onSubmit, hideCategory }) {
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
      <button type="submit">Search</button>
    </form>
  );
}
