import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";

const CATEGORIES = [
  "Antarctica",
  "Arctic",
  "Himalaya",
  "General",
];

export default function AdminEditContent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadContent() {
      try {
        setError("");

        const { data } = await api.get(
          "/content/admin/all"
        );

        const found = data.items.find(
          (content) => content._id === id
        );

        if (!found) {
          throw new Error("Content not found");
        }

        if (mounted) {
          setItem({
            ...found,
            tagsText: (found.tags || []).join(", "),
          });
        }
      } catch {
        if (mounted) {
          setError(
            "This item could not be found."
          );
        }
      }
    }

    loadContent();

    return () => {
      mounted = false;
    };
  }, [id]);

  function update(field, value) {
    setItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!item) return;

    setSaving(true);

    try {
      await api.put(`/content/${id}`, {
        title: item.title,
        category: item.category,
        expeditionName: item.expeditionName,
        description: item.description,
        socialCaption: item.socialCaption,
        tags: item.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      navigate("/admin/content");
    } catch {
      alert("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="container">
        <p className="status status-error">
          {error}
        </p>

        <Link
          to="/admin/content"
          className="back-link"
        >
          &larr; Back to content list
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container">
        <p className="status">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="container narrow admin-edit-page">
      <Link
        to="/admin/content"
        className="back-link"
      >
        &larr; Back to Content
      </Link>

      <section className="admin-hero">
        <p className="admin-eyebrow">
          POLARCONNECT ADMIN
        </p>

        <h1>Edit Content</h1>

        <p className="admin-hero-description">
          Update the title, category, description,
          tags, and other information for this
          content item.
        </p>
      </section>

      <form
        className="form admin-edit-form"
        onSubmit={handleSubmit}
      >
        <div className="admin-form-section">
          <h2>Content Information</h2>

          <p>
            Make your changes below and save them when
            you're finished.
          </p>
        </div>

        <label>
          Title
          <input
            type="text"
            value={item.title || ""}
            onChange={(e) =>
              update("title", e.target.value)
            }
            placeholder="Enter content title"
            required
          />
        </label>

        <label>
          Category
          <select
            value={item.category || "General"}
            onChange={(e) =>
              update("category", e.target.value)
            }
          >
            {CATEGORIES.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          Expedition Name
          <input
            type="text"
            value={item.expeditionName || ""}
            onChange={(e) =>
              update(
                "expeditionName",
                e.target.value
              )
            }
            placeholder="e.g. 43rd Indian Antarctic Expedition"
          />
        </label>

        <label>
          Tags
          <input
            type="text"
            value={item.tagsText || ""}
            onChange={(e) =>
              update(
                "tagsText",
                e.target.value
              )
            }
            placeholder="ice-core, glaciology, Maitri"
          />

          <small className="muted">
            Separate multiple tags with commas.
          </small>
        </label>

        <label>
          Description
          <textarea
            value={item.description || ""}
            onChange={(e) =>
              update(
                "description",
                e.target.value
              )
            }
            rows={5}
            placeholder="Enter content description"
          />
        </label>

        <label>
          Social Caption
          <textarea
            value={item.socialCaption || ""}
            onChange={(e) =>
              update(
                "socialCaption",
                e.target.value
              )
            }
            rows={4}
            placeholder="Enter social media caption"
          />
        </label>

        <div className="admin-edit-note">
          <strong>Note:</strong>

          <p>
            To replace the file itself, delete this
            item and upload it again. Editing here only
            changes the text and metadata.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </form>
    </div>
  );
}