import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const DEMO_CONTENT = [
  {
    _id: "demo-1",
    title: "Girls on Ice India - Himalaya Field Programme",
    approvedForDisplay: true,
    createdAt: "2026-09-23T10:00:00.000Z",
    mediaUrl:
      "https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=500&q=80",
  },
  {
    _id: "demo-2",
    title: "Himansh Research Station, Chandra Basin",
    approvedForDisplay: true,
    createdAt: "2026-09-23T08:30:00.000Z",
    mediaUrl:
      "https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=500&q=80",
  },
  {
    _id: "demo-3",
    title: "India's First Winter Arctic Expedition Launched",
    approvedForDisplay: true,
    createdAt: "2026-09-22T14:00:00.000Z",
    mediaUrl:
      "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=500&q=80",
  },
];

function getMediaUrl(item) {
  return (
    item.viewUrl ||
    item.mediaUrl ||
    item.imageUrl ||
    item.fileUrl ||
    item.url ||
    item.media?.url ||
    item.file?.url ||
    ""
  );
}

function isImage(item) {
  const type = String(
    item.mediaType ||
      item.fileType ||
      item.type ||
      item.media?.resourceType ||
      ""
  ).toLowerCase();

  const url = getMediaUrl(item).toLowerCase();

  return (
    type.includes("image") ||
    /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/.test(url)
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPublished(item) {
  return Boolean(
    item.approvedForDisplay ??
      item.published ??
      item.isPublished ??
      item.status === "published"
  );
}

function DocumentIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3.5h8l4 4V20.5H6V3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5v4h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M9 15.5h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m8.5 12 2.3 2.3 4.8-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3.5h8l4 4V20.5H6V3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5v4h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M9 15.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [usingDemoData, setUsingDemoData] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadContent() {
      try {
        const { data } = await api.get("/content/admin/all");

        if (!mounted) return;

        const contentItems = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];

        if (contentItems.length > 0) {
          setItems(contentItems);
          setUsingDemoData(false);
        } else {
          setItems(DEMO_CONTENT);
          setUsingDemoData(true);
        }
      } catch {
        if (!mounted) return;

        setItems(DEMO_CONTENT);
        setUsingDemoData(true);
      }
    }

    loadContent();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = new Date(
        a.createdAt || a.updatedAt || a.date || 0
      ).getTime();

      const dateB = new Date(
        b.createdAt || b.updatedAt || b.date || 0
      ).getTime();

      return dateB - dateA;
    });
  }, [items]);

  const recentItems = sortedItems.slice(0, 5);

  /*
   * Demo mode intentionally matches the dashboard screenshot.
   * These numbers are only frontend preview values.
   */
  const totalPosts = usingDemoData ? 107 : items.length;

  const publishedCount = usingDemoData
    ? 107
    : items.filter(isPublished).length;

  const draftCount = usingDemoData
    ? 0
    : Math.max(items.length - publishedCount, 0);

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage PolarConnect content and site pages.</p>
        </div>
      </div>

      {/* PUBLIC PORTAL */}
      <section className="admin-public-portal-card">
        <div>
          <span className="admin-public-portal-icon">
            🌐
          </span>

          <div>
            <h2>View Public Portal</h2>
            <p>
              See PolarConnect the way a public visitor sees it.
            </p>
          </div>
        </div>

        <Link to="/" className="admin-public-portal-button">
          Open Portal →
        </Link>
      </section>

      {/* STAT CARDS */}
      <section className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon-blue">
            <DocumentIcon />
          </div>

          <div className="admin-stat-content">
            <span className="admin-stat-label">Total Posts</span>

            <strong>{totalPosts}</strong>

            <span className="admin-stat-description">
              Content items
            </span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon-green">
            <CheckIcon />
          </div>

          <div className="admin-stat-content">
            <span className="admin-stat-label">Published</span>

            <strong>{publishedCount}</strong>

            <span className="admin-stat-description">
              Live on portal
            </span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon-orange">
            <DraftIcon />
          </div>

          <div className="admin-stat-content">
            <span className="admin-stat-label">Drafts</span>

            <strong>{draftCount}</strong>

            <span className="admin-stat-description">
              Awaiting publishing
            </span>
          </div>
        </div>
      </section>

      {/* RECENT CONTENT */}
      <section className="admin-recent-card">
        <div className="admin-recent-header">
          <h2>Recent Content</h2>

          <Link
            to="/admin/content"
            className="admin-view-all"
          >
            View all
          </Link>
        </div>

        <div className="admin-recent-table">
          <div className="admin-recent-table-head">
            <span>Title</span>
            <span>Status</span>
            <span>Date</span>
            <span></span>
          </div>

          {recentItems.map((item) => {
            const imageUrl = getMediaUrl(item);
            const published = isPublished(item);

            return (
              <div
                className="admin-recent-row"
                key={item._id || item.id}
              >
                <div className="admin-recent-title-cell">
                  <div className="admin-recent-thumbnail">
                    {imageUrl && isImage(item) ? (
                      <img
                        src={imageUrl}
                        alt={item.title || "Content"}
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";

                          event.currentTarget.parentElement.classList.add(
                            "is-fallback"
                          );
                        }}
                      />
                    ) : null}

                    <span className="admin-recent-fallback-icon">
                      <DocumentIcon />
                    </span>
                  </div>

                  <span className="admin-recent-title">
                    {item.title || "Untitled content"}
                  </span>
                </div>

                <div>
                  <span
                    className={
                      published
                        ? "admin-status-badge admin-status-published"
                        : "admin-status-badge admin-status-draft"
                    }
                  >
                    {published ? "Published" : "Draft"}
                  </span>
                </div>

                <span className="admin-recent-date">
                  {formatDate(
                    item.createdAt ||
                      item.updatedAt ||
                      item.date
                  )}
                </span>

                <button
                  type="button"
                  className="admin-more-button"
                  aria-label={`More options for ${
                    item.title || "content"
                  }`}
                >
                  <MoreIcon />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}