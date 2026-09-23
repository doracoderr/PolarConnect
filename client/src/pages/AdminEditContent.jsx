import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";

const CATEGORIES = ["Antarctica", "Arctic", "Himalaya", "General"];

export default function AdminEditContent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/content/admin/all")
      .then(({ data }) => {
        const found = data.items.find((i) => i._id === id);
        if (!found) throw new Error();
        setItem({ ...found, tagsText: (found.tags || []).join(", ") });
      })
      .catch(() => setError("This item could not be found."));
  }, [id]);

  function update(field, value) {
    setItem((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/content/${id}`, {
        title: item.title,
        category: item.category,
        expeditionName: item.expeditionName,
        description: item.description,
        socialCaption: item.socialCaption,
        tags: item.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      });
      navigate("/admin/content");
    } catch {
      alert("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="container"><p className="status status-error">{error}</p></div>;
  if (!item) return <div className="container"><p className="status">Loading...</p></div>;

  return (
    <div className="container narrow">
      <Link to="/admin/content" className="back-link">&larr; Back to content list</Link>
      <h1>Edit Content</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input type="text" value={item.title} onChange={(e) => update("title", e.target.value)} required />
        </label>
        <label>
          Category
          <select value={item.category} onChange={(e) => update("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Expedition name
          <input type="text" value={item.expeditionName || ""} onChange={(e) => update("expeditionName", e.target.value)} />
        </label>
        <label>
          Tags (comma separated)
          <input type="text" value={item.tagsText} onChange={(e) => update("tagsText", e.target.value)} />
        </label>
        <label>
          Description
          <textarea value={item.description || ""} onChange={(e) => update("description", e.target.value)} rows={4} />
        </label>
        <label>
          Social caption
          <textarea value={item.socialCaption || ""} onChange={(e) => update("socialCaption", e.target.value)} rows={2} />
        </label>

        <p className="muted">
          To replace the file itself, delete this item and upload it again — editing here only
          changes the text/metadata.
        </p>

        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </form>
    </div>
  );
}
