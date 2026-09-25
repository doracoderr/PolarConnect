import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const PAGE_SIZE = 10;

const SORTS = {
  newest: {
    label: "Newest first",
    compare: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  },
  oldest: {
    label: "Oldest first",
    compare: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  },
  title: {
    label: "Title A–Z",
    compare: (a, b) => (a.title || "").localeCompare(b.title || ""),
  },
};

const DEFAULT_FILTERS = {
  q: "",
  status: "all",
  category: "all",
  type: "all",
  sort: "newest",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/* ---------- small presentational pieces ---------- */

function TypeIcon({ type, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
  };
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (type === "video") {
    return (
      <svg {...common}>
        <rect x="3" y="5.5" width="13" height="13" rx="2.5" {...stroke} />
        <path d="M16 10.5l5-3v9l-5-3" {...stroke} />
      </svg>
    );
  }

  if (type === "image") {
    return (
      <svg {...common}>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...stroke} />
        <circle cx="9" cy="10" r="1.6" {...stroke} />
        <path d="M4 17l5-4.5 3.5 3L15 13l5 4.5" {...stroke} />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 3.5h8l4 4V20.5H6V3.5Z" {...stroke} />
      <path d="M14 3.5v4h4" {...stroke} />
      <path d="M9 12h6M9 15.5h6" {...stroke} />
    </svg>
  );
}

function Thumb({ item, onImageError }) {
  const [failed, setFailed] = useState(false);
  const showImage = item.mediaType === "image" && item.viewUrl && !failed;

  return (
    <div className={`mc-thumb mc-thumb-${item.mediaType}`}>
      {showImage ? (
        <img
          src={item.viewUrl}
          alt=""
          loading="lazy"
          onError={() => {
            setFailed(true);
            onImageError?.();
          }}
        />
      ) : (
        <TypeIcon type={item.mediaType} />
      )}
    </div>
  );
}

function ContentRow({
  item,
  isSelected,
  isBusy,
  onSelect,
  onTogglePublish,
  onDelete,
  onFixType,
}) {
  const [imageBroken, setImageBroken] = useState(false);
  const published = Boolean(item.approvedForDisplay);

  return (
    <div
      role="row"
      className={
        "mc-row" +
        (isSelected ? " is-selected" : "") +
        (isBusy ? " is-busy" : "")
      }
    >
      <div role="cell" className="mc-check">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item._id)}
          aria-label={`Select ${item.title}`}
        />
      </div>

      <div role="cell" className="mc-main">
        <Thumb item={item} onImageError={() => setImageBroken(true)} />

        <div className="mc-main-text">
          <Link
            to={`/admin/content/${item._id}/edit`}
            className="mc-title"
            title={item.title}
          >
            {item.title || "Untitled content"}
          </Link>

          <span className="mc-sub">
            {item.expeditionName || "No expedition"}
          </span>

          {item.mediaType === "image" && imageBroken && (
            <button
              type="button"
              className="mc-fix"
              disabled={isBusy}
              onClick={() => onFixType(item)}
              title="This file couldn't load as an image. If it's a PDF/document, click to fix its type."
            >
              Not an image? Mark as document
            </button>
          )}
        </div>
      </div>

      <div className="mc-meta">
        <div role="cell" className="mc-cell mc-cell-category" data-label="Category">
          <span className="mc-category">{item.category}</span>
        </div>

        <div role="cell" className="mc-cell mc-cell-type" data-label="Type">
          <span className="mc-type">
            <TypeIcon type={item.mediaType} size={15} />
            {item.mediaType}
          </span>
        </div>

        <div role="cell" className="mc-cell mc-cell-status" data-label="Status">
          <span className={`mc-status ${published ? "is-live" : "is-draft"}`}>
            {published ? "Published" : "Draft"}
          </span>
        </div>

        <div role="cell" className="mc-cell mc-cell-date" data-label="Added">
          {formatDate(item.createdAt)}
        </div>
      </div>

      <div role="cell" className="mc-actions">
        <a
          href={item.viewUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mc-act"
        >
          View
        </a>

        <Link to={`/admin/content/${item._id}/edit`} className="mc-act">
          Edit
        </Link>

        <button
          type="button"
          className="mc-act mc-act-toggle"
          disabled={isBusy}
          onClick={() => onTogglePublish(item)}
        >
          {isBusy ? "Working…" : published ? "Unpublish" : "Publish"}
        </button>

        <button
          type="button"
          className="mc-act mc-act-danger"
          disabled={isBusy}
          onClick={() => onDelete(item)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mc-card" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="mc-skeleton-row" key={i}>
          <span className="mc-skeleton mc-skeleton-thumb" />
          <span className="mc-skeleton mc-skeleton-line" />
          <span className="mc-skeleton mc-skeleton-pill" />
        </div>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function AdminContentList() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(() => new Set());

  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const headCheckRef = useRef(null);
  const cancelBtnRef = useRef(null);

  /* ----- loading ----- */

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/content/admin/all");
      setItems(data.items);
    } catch {
      setError("Could not load content. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ----- toast ----- */

  const notify = useCallback((message, tone = "success") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ----- confirm dialog: focus + Esc ----- */

  useEffect(() => {
    if (!confirm) return undefined;
    cancelBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") setConfirm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);

  /* ----- derived data ----- */

  const counts = useMemo(() => {
    const all = items || [];
    const published = all.filter((i) => i.approvedForDisplay).length;
    return {
      all: all.length,
      published,
      draft: all.length - published,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = filters.q.trim().toLowerCase();

    return items
      .filter((i) => {
        if (filters.status === "published" && !i.approvedForDisplay) return false;
        if (filters.status === "draft" && i.approvedForDisplay) return false;
        if (filters.category !== "all" && i.category !== filters.category) return false;
        if (filters.type !== "all" && i.mediaType !== filters.type) return false;

        if (q) {
          const haystack = [
            i.title,
            i.expeditionName,
            i.category,
            ...(i.tags || []),
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort(SORTS[filters.sort].compare);
  }, [items, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const selectedItems = useMemo(
    () => (items || []).filter((i) => selected.has(i._id)),
    [items, selected]
  );

  const pageIds = pageItems.map((i) => i._id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  useEffect(() => {
    if (headCheckRef.current) {
      headCheckRef.current.indeterminate =
        someOnPageSelected && !allOnPageSelected;
    }
  }, [someOnPageSelected, allOnPageSelected]);

  const filtersActive =
    filters.q !== "" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.type !== "all";

  const onlyStatusFilter =
    filters.status !== "all" &&
    filters.q === "" &&
    filters.category === "all" &&
    filters.type === "all";

  const emptyTitle = onlyStatusFilter
    ? filters.status === "published"
      ? "No Published Content"
      : "No Draft Content"
    : "No matching content";

  const emptyText = onlyStatusFilter
    ? filters.status === "published"
      ? "There are no published items."
      : "There are no draft items."
    : "Nothing matches your current search or filters.";

  /* ----- filter / paging helpers (selection is cleared so bulk actions
         never touch rows the admin can't currently see) ----- */

  function updateFilter(patch) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
    setSelected(new Set());
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setSelected(new Set());
  }

  function goToPage(next) {
    setPage(next);
    setSelected(new Set());
  }

    try {
      await api.patch(`/content/${item._id}/fix-type`);

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  /* ----- actions ----- */

  function setBusyFor(ids, on) {
    setBusy((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function report(ok, failed, pastTense) {
    if (!failed) notify(`${pastTense} ${plural(ok, "item")}.`);
    else if (!ok) notify(`Could not update ${plural(failed, "item")}.`, "error");
    else notify(`${pastTense} ${ok}, but ${failed} failed.`, "error");
  }

  async function setPublished(targets, publish) {
    const list = targets.filter((i) => Boolean(i.approvedForDisplay) !== publish);
    if (list.length === 0) {
      notify(
        publish ? "Those items are already published." : "Those items are already drafts.",
        "info"
      );
      return;
    }

    const ids = list.map((i) => i._id);
    setBusyFor(ids, true);

    const results = await Promise.allSettled(
      list.map((i) => api.put(`/content/${i._id}`, { approvedForDisplay: publish }))
    );

    const okIds = new Set();
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") okIds.add(list[idx]._id);
    });

    // Update in place — no need to re-fetch the whole library.
    setItems((prev) =>
      prev.map((i) => (okIds.has(i._id) ? { ...i, approvedForDisplay: publish } : i))
    );
    setBusyFor(ids, false);
    setSelected(new Set());
    report(okIds.size, list.length - okIds.size, publish ? "Published" : "Moved to draft:");
  }

  async function fixType(item) {
    setBusyFor([item._id], true);
    try {
      await api.patch(`/content/${item._id}/fix-type`);
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, mediaType: "document" } : i))
      );
      notify("Marked as document.");
    } catch {
      notify("Could not fix the media type.", "error");
    } finally {
      setBusyFor([item._id], false);
    }
  }

  function requestDelete(targets) {
    const many = targets.length > 1;
    setConfirm({
      title: many ? `Delete ${targets.length} items?` : "Delete this item?",
      message: many
        ? "These items will be permanently removed from PolarConnect. This can't be undone."
        : `“${targets[0].title}” will be permanently removed. This can't be undone.`,
      confirmLabel: many ? `Delete ${targets.length} items` : "Delete",
      onConfirm: () => runDelete(targets),
    });
  }

  async function runDelete(targets) {
    setConfirm(null);
    const ids = targets.map((t) => t._id);
    setBusyFor(ids, true);

    const results = await Promise.allSettled(
      targets.map((t) => api.delete(`/content/${t._id}`))
    );

    const goneIds = new Set();
    results.forEach((r, idx) => {
      const alreadyGone = r.status === "rejected" && r.reason?.response?.status === 404;
      if (r.status === "fulfilled" || alreadyGone) goneIds.add(targets[idx]._id);
    });

    setItems((prev) => prev.filter((i) => !goneIds.has(i._id)));
    setBusyFor(ids, false);
    setSelected(new Set());
    report(goneIds.size, targets.length - goneIds.size, "Deleted");
  }

  /* ----- early states ----- */

  const header = (
    <header className="mc-header">
      <div>
        <p className="mc-eyebrow">PolarConnect Admin</p>
        <h1>Manage Content</h1>
        <p className="mc-lead">
          Review, edit, publish or remove everything uploaded to PolarConnect.
          New uploads are saved as <strong>Draft</strong> and stay hidden from
          the public portal until you publish them.
        </p>
      </div>

      <div className="mc-header-side">
        {items && (
          <div className="mc-total" aria-label="Total content">
            <span>{items.length}</span>
            <small>Total Content</small>
          </div>
        )}

        <Link to="/admin/upload" className="mc-btn mc-btn-primary">
          Go to Upload Page
        </Link>
      </div>
    </header>
  );

  if (error) {
    return (
      <div className="container">
        <p className="status status-error">{error}</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="container">
        <p className="status">Loading...</p>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (filter === "published") {
      return item.approvedForDisplay;
    }

    if (filter === "draft") {
      return !item.approvedForDisplay;
    }

    return true;
  });

  return (
    <div className="container admin-content-page">
      <section className="admin-hero">
        <div>
          <p className="admin-eyebrow">POLARCONNECT ADMIN</p>

          <h1>Manage Content</h1>

          <p className="admin-hero-description">
            Manage and publish your PolarConnect content.
          </p>
        </div>

        <div className="admin-content-count">
          <span>{items.length}</span>
          <small>Total Content</small>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            
          </div>

          <Link
            to="/admin/upload"
            className="admin-primary-link"
          >
            Go to Upload Page
          </Link>
        </div>

        <div className="admin-filter-bar">
          <label htmlFor="content-filter">
            Filter:
          </label>

          <select
            id="content-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Content</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="admin-empty-state">
            <div
              className="admin-empty-icon"
              aria-hidden="true"
            >
              🗂️
            </div>

            <h3>
              {filter === "published"
                ? "No Published Content"
                : filter === "draft"
                  ? "No Draft Content"
                  : "No Content Yet"}
            </h3>

            <p>
              {filter === "published"
                ? "There are no published items."
                : filter === "draft"
                  ? "There are no draft items."
                  : "No content has been uploaded yet."}
            </p>

            {filter === "all" && (
              <Link
                to="/admin/upload"
                className="admin-primary-link"
              >
                Go to Upload Page
              </Link>
            )}
          </div>
        ) : (
          <div className="admin-table-card">
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
                  {filteredItems.map((item) => {
                    const isBusy = busyId === item._id;

                    return (
                      <tr key={item._id}>
                        <td>
                          <div className="admin-content-title">
                            {item.title}
                          </div>
                        </td>

                        <td>
                          <span className="admin-category">
                            {item.category}
                          </span>
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
                                  : "Fix Type"}
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
                              onClick={() => remove(item)}
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
          </div>
        )}
      </section>

      {/* confirm dialog */}
      {confirm && (
        <div
          className="mc-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirm(null);
          }}
        >
          <div
            className="mc-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mc-dialog-title"
            aria-describedby="mc-dialog-desc"
          >
            <h3 id="mc-dialog-title">{confirm.title}</h3>
            <p id="mc-dialog-desc">{confirm.message}</p>

            <div className="mc-dialog-actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="mc-btn"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mc-btn mc-btn-danger"
                onClick={confirm.onConfirm}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div
          key={toast.id}
          className={`mc-toast is-${toast.tone}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
