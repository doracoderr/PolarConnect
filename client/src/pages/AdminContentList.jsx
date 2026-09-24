import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function AdminContentList() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setError("");

    try {
      const { data } = await api.get("/content/admin/all");
      setItems(data.items);
    } catch {
      setError("Could not load content.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePublish(item) {
    setBusyId(item._id);

    try {
      await api.put(`/content/${item._id}`, {
        approvedForDisplay: !item.approvedForDisplay,
      });

      await load();
    } catch {
      alert("Could not update publish status.");
    } finally {
      setBusyId(null);
    }
  }

  async function fixMediaType(item) {
    if (item.mediaType !== "image") return;

    setBusyId(item._id);

    try {
      await api.patch(
        `/content/${item._id}/fix-type`
      );

      await load();
    } catch {
      alert("Could not fix media type.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item) {
    const confirmed = confirm(
      `Delete "${item.title}"? This can't be undone.`
    );

    if (!confirmed) return;

    setBusyId(item._id);

    try {
      await api.delete(`/content/${item._id}`);

      await load();
    } catch {
      alert("Could not delete this item.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return (
      <div className="container">
        <p className="status status-error">
          {error}
        </p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="container">
        <p className="status">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="container admin-content-page">
      <section className="admin-hero">
        <p className="admin-eyebrow">
          POLARCONNECT ADMIN
        </p>

        <h1>Manage Content</h1>

        <p className="admin-hero-description">
          Review, edit, publish, unpublish, or delete
          content uploaded to PolarConnect.
        </p>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <h2>Content Library</h2>

            <p>
              Newly uploaded items are saved as{" "}
              <strong>Draft</strong> and won't appear
              on the public portal until you publish them.
            </p>
          </div>

          <Link
            to="/admin/upload"
            className="admin-primary-link"
          >
            + Upload Content
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="admin-empty-state">
            <div
              className="admin-empty-icon"
              aria-hidden="true"
            >
              🗂️
            </div>

            <h3>No Content Yet</h3>

            <p>
              You haven't uploaded any expedition
              content yet.
            </p>

            <Link
              to="/admin/upload"
              className="admin-primary-link"
            >
              Upload Your First Content
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrapper">
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
                {items.map((item) => {
                  const isBusy =
                    busyId === item._id;

                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="admin-content-title">
                          {item.title}
                        </div>
                      </td>

                      <td>
                        {item.category}
                      </td>

                      <td>
                        <span className="admin-type">
                          {item.mediaType}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            item.approvedForDisplay
                              ? "badge-live"
                              : "badge-draft"
                          }`}
                        >
                          {item.approvedForDisplay
                            ? "Published"
                            : "Draft"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <a
                            href={item.viewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-action-link"
                          >
                            View
                          </a>

                          <Link
                            to={`/admin/content/${item._id}/edit`}
                            className="admin-action-link"
                          >
                            Edit
                          </Link>

                          {item.mediaType === "image" && (
                            <button
                              type="button"
                              className="link-button"
                              disabled={isBusy}
                              onClick={() =>
                                fixMediaType(item)
                              }
                              title="If this is a PDF/document marked as image, click to fix"
                            >
                              {isBusy
                                ? "Working..."
                                : "Fix Type →"}
                            </button>
                          )}

                          <button
                            type="button"
                            className="link-button"
                            disabled={isBusy}
                            onClick={() =>
                              togglePublish(item)
                            }
                          >
                            {isBusy
                              ? "Working..."
                              : item.approvedForDisplay
                                ? "Unpublish"
                                : "Publish"}
                          </button>

                          <button
                            type="button"
                            className="link-button link-danger"
                            disabled={isBusy}
                            onClick={() =>
                              remove(item)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}