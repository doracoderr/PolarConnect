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

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      <div className="admin-content-page mc-page">
        {header}
        <div className="mc-card mc-empty" role="alert">
          <div className="mc-empty-icon" aria-hidden="true">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button type="button" className="mc-btn mc-btn-primary" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="admin-content-page mc-page">
        {header}
        <LoadingSkeleton />
      </div>
    );
  }

  /* ----- main render ----- */

  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "published", label: "Published", count: counts.published },
    { key: "draft", label: "Drafts", count: counts.draft },
  ];

  return (
    <div className="admin-content-page mc-page">
      {header}

      <section className="mc-card">
        {/* status tabs */}
        <div className="mc-tabs" role="tablist" aria-label="Filter by status">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={filters.status === t.key}
              className={"mc-tab" + (filters.status === t.key ? " is-active" : "")}
              onClick={() => updateFilter({ status: t.key })}
            >
              {t.label}
              <span className="mc-tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="mc-empty">
            <div className="mc-empty-icon" aria-hidden="true">🗂️</div>
            <h3>No Content Yet</h3>
            <p>No content has been uploaded yet.</p>
            <Link to="/admin/upload" className="mc-btn mc-btn-primary">
              Go to Upload Page
            </Link>
          </div>
        ) : (
          <>
            {/* bulk bar */}
            {selectedItems.length > 0 && (
              <div className="mc-bulk" role="region" aria-label="Bulk actions">
                <strong>{selectedItems.length} selected</strong>

                <div className="mc-bulk-actions">
                  <button type="button" className="mc-btn mc-btn-small" onClick={() => setPublished(selectedItems, true)}>
                    Publish
                  </button>
                  <button type="button" className="mc-btn mc-btn-small" onClick={() => setPublished(selectedItems, false)}>
                    Unpublish
                  </button>
                  <button type="button" className="mc-btn mc-btn-small mc-btn-danger-outline" onClick={() => requestDelete(selectedItems)}>
                    Delete
                  </button>
                  <button type="button" className="mc-btn mc-btn-small mc-btn-ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* list */}
            {filtered.length === 0 ? (
              <div className="mc-empty">
                <div className="mc-empty-icon" aria-hidden="true">🔎</div>
                <h3>{emptyTitle}</h3>
                <p>{emptyText}</p>
                <button type="button" className="mc-btn" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="mc-table" role="table" aria-label="Content library">
                <div className="mc-row mc-row-head" role="row">
                  <div role="columnheader" className="mc-check">
                    <input
                      ref={headCheckRef}
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectPage}
                      aria-label="Select all items on this page"
                    />
                  </div>
                  <div role="columnheader" className="mc-main">Content</div>
                  <div className="mc-meta">
                    <div role="columnheader" className="mc-cell">Category</div>
                    <div role="columnheader" className="mc-cell">Type</div>
                    <div role="columnheader" className="mc-cell">Status</div>
                    <div role="columnheader" className="mc-cell">Added</div>
                  </div>
                  <div role="columnheader" className="mc-actions">Actions</div>
                </div>

                {pageItems.map((item) => (
                  <ContentRow
                    key={item._id}
                    item={item}
                    isSelected={selected.has(item._id)}
                    isBusy={busy.has(item._id)}
                    onSelect={toggleSelect}
                    onTogglePublish={(i) => setPublished([i], !i.approvedForDisplay)}
                    onDelete={(i) => requestDelete([i])}
                    onFixType={fixType}
                  />
                ))}
              </div>
            )}

            {/* footer / pagination */}
            {filtered.length > 0 && (
              <footer className="mc-footer">
                <span className="mc-count">
                  Showing {pageStart + 1}–{pageStart + pageItems.length} of{" "}
                  {plural(filtered.length, "item")}
                  {filtersActive && ` (filtered from ${counts.all})`}
                </span>

                {totalPages > 1 && (
                  <nav className="mc-pager" aria-label="Pagination">
                    <button
                      type="button"
                      className="mc-btn mc-btn-small"
                      disabled={safePage === 1}
                      onClick={() => goToPage(safePage - 1)}
                    >
                      ← Prev
                    </button>
                    <span>
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="mc-btn mc-btn-small"
                      disabled={safePage === totalPages}
                      onClick={() => goToPage(safePage + 1)}
                    >
                      Next →
                    </button>
                  </nav>
                )}
              </footer>
            )}
          </>
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
