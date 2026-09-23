import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function AdminContentList() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.get("/content/admin/all")
      .then(({ data }) => setItems(data.items))
      .catch(() => setError("Could not load content."));
  }

  useEffect(load, []);

  async function togglePublish(item) {
    setBusyId(item._id);
    try {
      await api.put(`/content/${item._id}`, { approvedForDisplay: !item.approvedForDisplay });
      load();
    } catch {
      alert("Could not update publish status.");
    } finally {
      setBusyId(null);
    }
  }

  async function fixMediaType(item) {
    // If marked as "image" but is actually a document, fix it
    if (item.mediaType !== "image") return;
    
    setBusyId(item._id);
    try {
      await api.patch(`/content/${item._id}/fix-type`);
      load();
    } catch {
      alert("Could not fix media type.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    setBusyId(item._id);
    try {
      await api.delete(`/content/${item._id}`);
      load();
    } catch {
      alert("Could not delete this item.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <div className="container"><p className="status status-error">{error}</p></div>;
  if (!items) return <div className="container"><p className="status">Loading...</p></div>;

  return (
    <div className="container">
      <h1>Manage Content</h1>
      <p className="muted">
        Newly uploaded items are saved as <strong>Draft</strong> and won't appear on the public
        portal until you click Publish.
      </p>

      {items.length === 0 && <p className="status">Nothing uploaded yet.</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>{item.title}</td>
              <td>{item.category}</td>
              <td>{item.mediaType}</td>
              <td>
                <span className={`badge ${item.approvedForDisplay ? "badge-live" : "badge-draft"}`}>
                  {item.approvedForDisplay ? "Published" : "Draft"}
                </span>
              </td>
              <td className="admin-actions">
                <a href={item.viewUrl} target="_blank" rel="noreferrer">View</a>
                <Link to={`/admin/content/${item._id}/edit`}>Edit</Link>
                {item.mediaType === "image" && (
                  <button
                    className="link-button"
                    disabled={busyId === item._id}
                    onClick={() => fixMediaType(item)}
                    title="If this is a PDF/document marked as image, click to fix"
                  >
                    Fix Type →
                  </button>
                )}
                <button
                  className="link-button"
                  disabled={busyId === item._id}
                  onClick={() => togglePublish(item)}
                >
                  {item.approvedForDisplay ? "Unpublish" : "Publish"}
                </button>
                <button
                  className="link-button link-danger"
                  disabled={busyId === item._id}
                  onClick={() => remove(item)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
