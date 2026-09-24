import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { uploadToCloudinary } from "../api/cloudinaryUpload";
import { compressImageIfNeeded } from "../utils/compressImage";

const CATEGORIES = ["Antarctica", "Arctic", "Himalaya", "General"];

// Cloudinary free-plan limits:
// 10MB for images/raw documents, 100MB for videos.
const MAX_RAW_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// The chosen file starts uploading automatically after this delay.
const AUTO_UPLOAD_DELAY_MS = 2000;

const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

function mediaTypeFromResource(resourceType) {
  if (resourceType === "video") return "video";
  if (resourceType === "image") return "image";
  return "document";
}

function parseTags(text) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Validates size limits and compresses large images. Returns the file to upload.
async function prepareFile(file, onMessage) {
  if (file.type.startsWith("image/")) {
    if (file.size > MAX_RAW_BYTES) {
      onMessage(`Compressing image (${mb(file.size)}MB)...`);
      const compressed = await compressImageIfNeeded(file, 9 * 1024 * 1024);
      if (compressed.size > MAX_RAW_BYTES) {
        throw new Error(
          `This image is still ${mb(compressed.size)}MB after compression — please use a smaller photo (max 10MB).`
        );
      }
      return compressed;
    }
    return file;
  }

  if (file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        `This video is ${mb(file.size)}MB — videos are limited to 100MB on our current Cloudinary plan. Please compress it and try again.`
      );
    }
    return file;
  }

  if (file.size > MAX_RAW_BYTES) {
    throw new Error(
      `This file is ${mb(file.size)}MB — documents are limited to 10MB on our current Cloudinary plan. Please compress the PDF and try again.`
    );
  }
  return file;
}

export default function AdminUpload() {
  // Form fields
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Antarctica");
  const [expeditionName, setExpeditionName] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  // Step 1: automatic upload
  // idle | waiting | uploading | uploaded | error
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploaded, setUploaded] = useState(null); // { url, publicId, mediaType }
  const [retryCount, setRetryCount] = useState(0);

  // Step 2: auto summary
  // idle | generating | ready | error
  const [summaryStatus, setSummaryStatus] = useState("idle");
  const [summaryMessage, setSummaryMessage] = useState("");
  const [description, setDescription] = useState("");
  const [socialCaption, setSocialCaption] = useState("");

  // Step 3: save / publish / preview
  // idle | draft | publish | error | done
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [saved, setSaved] = useState(null); // { content, published }
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState("card");

  /* -------------------------------------------------------
     Auto-upload: 2 seconds after a file is chosen
  ------------------------------------------------------- */

  useEffect(() => {
    if (!file) return undefined;

    let cancelled = false;

    setUploadStatus("waiting");
    setUploadMessage("Your file will upload automatically in 2 seconds...");

    const timer = setTimeout(async () => {
      try {
        setUploadStatus("uploading");
        setUploadMessage("Preparing your file...");

        const prepared = await prepareFile(file, (msg) => {
          if (!cancelled) setUploadMessage(msg);
        });
        if (cancelled) return;

        setUploadMessage("Uploading media to Cloudinary...");
        const result = await uploadToCloudinary(prepared);
        if (cancelled) return;

        setUploaded({
          url: result.secure_url,
          publicId: result.public_id,
          mediaType: mediaTypeFromResource(result.resource_type),
        });
        setUploadStatus("uploaded");
        setUploadMessage("File uploaded. Fill in the details below.");
      } catch (err) {
        if (cancelled) return;
        setUploadStatus("error");
        setUploadMessage(
          err.response?.data?.message || err.message || "Upload failed"
        );
      }
    }, AUTO_UPLOAD_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [file, retryCount]);

  function resetAfterFileChange() {
    setUploaded(null);
    setUploadStatus("idle");
    setUploadMessage("");
    setSummaryStatus("idle");
    setSummaryMessage("");
    setDescription("");
    setSocialCaption("");
    setSaveStatus("idle");
    setSaveMessage("");
    setSaved(null);
    setShowPreview(false);
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    resetAfterFileChange();
    setFile(selected);
  }

  function resetAll() {
    resetAfterFileChange();
    setFile(null);
    setInputKey((k) => k + 1);
    setTitle("");
    setCategory("Antarctica");
    setExpeditionName("");
    setTags("");
    setNotes("");
  }

  /* -------------------------------------------------------
     Auto summary
  ------------------------------------------------------- */

  async function handleGenerateSummary() {
    if (!uploaded) return;

    if (!title.trim()) {
      setSummaryStatus("error");
      setSummaryMessage("Please enter a title first.");
      return;
    }

    setSummaryStatus("generating");
    setSummaryMessage("Reading your content and writing a summary...");
    setShowPreview(false);

    try {
      const { data } = await api.post("/content/summary", {
        title,
        category,
        expeditionName,
        tags,
        notes,
        mediaUrl: uploaded.url,
        mediaType: uploaded.mediaType,
      });

      setDescription(data.description || "");
      setSocialCaption(data.socialCaption || "");
      setSummaryStatus("ready");
      setSummaryMessage("");
    } catch (err) {
      setSummaryStatus("error");
      setSummaryMessage(
        err.response?.data?.message || "Could not generate the summary."
      );
    }
  }

  /* -------------------------------------------------------
     Save as draft / publish
  ------------------------------------------------------- */

  async function handleSave(publish) {
    if (!uploaded) return;

    setSaveStatus(publish ? "publish" : "draft");
    setSaveMessage(publish ? "Publishing..." : "Saving draft...");

    try {
      const { data } = await api.post("/content", {
        title,
        category,
        expeditionName,
        tags,
        notes,
        description,
        socialCaption,
        publish,
        mediaUrl: uploaded.url,
        mediaType: uploaded.mediaType,
        cloudinaryPublicId: uploaded.publicId,
      });

      setSaved({ content: data.content, published: publish });
      setSaveStatus("done");
      setSaveMessage("");
    } catch (err) {
      setSaveStatus("error");
      setSaveMessage(
        err.response?.data?.message || "Could not save this content."
      );
    }
  }

  /* -------------------------------------------------------
     Derived values
  ------------------------------------------------------- */

  const fileIsImage = file?.type?.startsWith("image/");
  const fileIsVideo = file?.type?.startsWith("video/");
  const fileIsPdf = file?.type === "application/pdf";

  const isSaving = saveStatus === "draft" || saveStatus === "publish";
  const summaryReady = summaryStatus === "ready";

  const previewTags = parseTags(tags);
  const previewType = uploaded?.mediaType;

  /* -------------------------------------------------------
     Success screen
  ------------------------------------------------------- */

  if (saveStatus === "done" && saved) {
    const { content, published } = saved;

    return (
      <div className="admin-upload-page">
        <section className="admin-result-preview">
          <div className="admin-result-header">
            <div className="admin-result-icon">✓</div>

            <div>
              <div className="admin-upload-eyebrow">
                {published ? "PUBLISHED" : "SAVED AS DRAFT"}
              </div>

              <h2>
                {published
                  ? "Your content is live on the portal"
                  : "Your content has been saved as a draft"}
              </h2>

              <p>
                {published
                  ? "Visitors can now find it on the public portal."
                  : "It won't appear on the public portal until you publish it."}
              </p>
            </div>
          </div>

          <div className="admin-result-grid">
            <div className="admin-result-box">
              <h3>Title</h3>
              <p>{content.title}</p>
            </div>

            <div className="admin-result-box">
              <h3>Summary</h3>
              <p>{content.description || "No summary."}</p>
            </div>
          </div>

          <div className="admin-result-footer">
            <span>What would you like to do next?</span>

            <div className="admin-upload-next-actions">
              {published && (
                <Link to={`/content/${content._id}`}>View on portal →</Link>
              )}
              <Link to="/admin/content">Manage Content →</Link>
              <button
                type="button"
                className="admin-upload-inline-btn"
                onClick={resetAll}
              >
                Upload another
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* -------------------------------------------------------
     Main page
  ------------------------------------------------------- */

  return (
    <div className="admin-upload-page">
      {/* PAGE HEADER */}

      <div className="admin-upload-top">
        <div className="admin-upload-heading">
          <div>
            <div className="admin-upload-eyebrow">POLARCONNECT ADMIN</div>
            <h1>Upload Expedition Content</h1>
          </div>

          <Link to="/admin/dashboard" className="admin-upload-back">
            <span>←</span>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <form
        className="admin-upload-layout"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* LEFT COLUMN: FILE + DETAILS */}

        <div className="admin-upload-col">
          <section className="admin-upload-card">
            <div className="admin-upload-card-header">
              <div className="admin-upload-section-icon">↑</div>

              <div>
                <h2>Content File</h2>
              </div>
            </div>

            <label
              className={`admin-file-dropzone ${file ? "has-file" : ""}`}
            >
              <input
                key={inputKey}
                type="file"
                accept="image/*,video/*,.pdf"
                onChange={handleFileChange}
                disabled={uploadStatus === "uploading" || isSaving}
              />

              {!file ? (
                <div className="admin-file-empty">
                  <strong>Click to choose a file</strong>

                  <span>Image, video or PDF · uploads automatically</span>

                  <small>
                    Images & documents up to 10MB · Videos up to 100MB
                  </small>
                </div>
              ) : (
                <div className="admin-selected-file">
                  <div className="admin-selected-file-icon">
                    {fileIsImage && "🖼️"}
                    {fileIsVideo && "🎬"}
                    {fileIsPdf && "📄"}
                    {!fileIsImage && !fileIsVideo && !fileIsPdf && "📎"}
                  </div>

                  <div className="admin-selected-file-info">
                    <strong>{file.name}</strong>

                    <span>
                      {mb(file.size)} MB
                      {file.type ? ` · ${file.type}` : ""}
                    </span>
                  </div>

                  <span className="admin-selected-file-change">Change</span>
                </div>
              )}
            </label>

            <div
              className={`admin-upload-statusline ${
                uploadStatus === "error"
                  ? "is-error"
                  : uploadStatus === "uploaded"
                    ? "is-success"
                    : uploadStatus === "idle"
                      ? ""
                      : "is-progress"
              }`}
              role="status"
            >
              {uploadStatus === "idle" && "No file selected yet."}
              {uploadStatus === "waiting" && `↻ ${uploadMessage}`}
              {uploadStatus === "uploading" && `↻ ${uploadMessage}`}
              {uploadStatus === "uploaded" && `✓ ${uploadMessage}`}
              {uploadStatus === "error" && (
                <>
                  ! {uploadMessage}{" "}
                  <button
                    type="button"
                    className="admin-upload-inline-btn"
                    onClick={() => setRetryCount((n) => n + 1)}
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="admin-upload-card admin-details-card">
            <div className="admin-upload-card-header">
              <div className="admin-upload-section-icon">✦</div>

              <div>
                <h2>Content Details</h2>
              </div>
            </div>

            <div className="admin-upload-fields">
              <label className="admin-upload-field admin-field-full">
                <span>
                  Title
                  <b>*</b>
                </span>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter content title"
                />
              </label>

              <label className="admin-upload-field">
                <span>
                  Category
                  <b>*</b>
                </span>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-upload-field">
                <span>Expedition Name</span>

                <input
                  type="text"
                  value={expeditionName}
                  onChange={(e) => setExpeditionName(e.target.value)}
                  placeholder="e.g. 43rd Indian Antarctic Expedition"
                />
              </label>

              <label className="admin-upload-field admin-field-full">
                <span>Tags</span>

                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma separated: ice-core, glaciology, Maitri"
                />
              </label>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: SUMMARY + ACTIONS */}

        <div className="admin-upload-col">
          <section className="admin-upload-card admin-summary-card">
            <div className="admin-upload-card-header">
              <div className="admin-upload-section-icon">✎</div>

              <div>
                <h2>Auto Summary</h2>
              </div>
            </div>

            <label className="admin-upload-field admin-summary-notes">
              <span>Notes (optional, improves the summary)</span>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add any context about this file"
              />
            </label>

            <div className="admin-summary-generate">
              <button
                type="button"
                className="admin-upload-submit"
                onClick={handleGenerateSummary}
                disabled={
                  uploadStatus !== "uploaded" ||
                  !title.trim() ||
                  summaryStatus === "generating" ||
                  isSaving
                }
              >
                {summaryStatus === "generating"
                  ? "Generating..."
                  : summaryReady
                    ? "Regenerate Summary"
                    : "Generate Auto Summary"}

                {summaryStatus !== "generating" && <span>✦</span>}
              </button>

              <small
                className={summaryStatus === "error" ? "is-error" : ""}
              >
                {summaryStatus === "generating"
                  ? "↻ Reading your content and writing a summary..."
                  : summaryStatus === "error"
                    ? summaryMessage
                    : uploadStatus !== "uploaded"
                      ? "Available once your file has uploaded."
                      : !title.trim()
                        ? "Enter a title first."
                        : summaryReady
                          ? "You can edit the text below."
                          : ""}
              </small>
            </div>

            <div className="admin-summary-fields">
              <label className="admin-upload-field admin-summary-grow">
                <span>Summary</span>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!summaryReady}
                  placeholder="Your auto-generated summary will appear here."
                />
              </label>

              <label className="admin-upload-field">
                <span>Social Caption</span>

                <textarea
                  value={socialCaption}
                  onChange={(e) => setSocialCaption(e.target.value)}
                  rows={2}
                  disabled={!summaryReady}
                  placeholder="Your social media caption will appear here."
                />
              </label>
            </div>
          </section>

          {saveStatus === "error" && (
            <div
              className="admin-upload-message is-error"
              role="status"
            >
              <span className="admin-upload-message-icon">!</span>

              <div>
                <strong>Save failed</strong>
                <p>{saveMessage}</p>
              </div>
            </div>
          )}

          <div className="admin-upload-actions">
            <button
              type="button"
              className="admin-upload-cancel"
              onClick={() => setShowPreview(true)}
              disabled={!summaryReady || isSaving}
            >
              Preview
            </button>

            <button
              type="button"
              className="admin-upload-cancel"
              onClick={() => handleSave(false)}
              disabled={!summaryReady || isSaving}
            >
              {saveStatus === "draft" ? "Saving..." : "Save as Draft"}
            </button>

            <Link to="/admin/dashboard" className="admin-upload-cancel">
              Cancel
            </Link>

            <button
              type="button"
              className="admin-upload-submit"
              onClick={() => handleSave(true)}
              disabled={!summaryReady || isSaving}
            >
              {saveStatus === "publish" ? "Publishing..." : "Publish Now"}
              {!isSaving && <span>→</span>}
            </button>
          </div>
        </div>
      </form>

      {/* PORTAL PREVIEW MODAL */}

      {summaryReady && showPreview && (
        <div
          className="admin-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Portal preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div className="admin-preview-dialog">
            <div className="admin-preview-dialog-head">
              <div>
                <h2>Portal Preview</h2>
                <p>How this content will look to visitors.</p>
              </div>

              <button
                type="button"
                className="admin-preview-close"
                aria-label="Close preview"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>

            <div className="admin-preview-tabs">
              <button
                type="button"
                className={`admin-preview-tab ${
                  previewTab === "card" ? "is-active" : ""
                }`}
                onClick={() => setPreviewTab("card")}
              >
                Home page card
              </button>

              <button
                type="button"
                className={`admin-preview-tab ${
                  previewTab === "detail" ? "is-active" : ""
                }`}
                onClick={() => setPreviewTab("detail")}
              >
                Detail page
              </button>
            </div>

            <div className="admin-preview-stage">
              {previewTab === "card" ? (
                <div className="admin-preview-card-wrap">
                  <div className="card">
                    {previewType === "image" ? (
                      <img
                        src={uploaded.url}
                        alt={title}
                        className="card-img"
                      />
                    ) : (
                      <div className="card-img card-img-placeholder">
                        <span className="card-icon">
                          {previewType === "video" ? "🎬" : "📄"}
                        </span>
                        <span>
                          {previewType === "video"
                            ? "View Video →"
                            : "View Document →"}
                        </span>
                      </div>
                    )}

                    <div className="card-body">
                      <span className="badge">{category}</span>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="detail">
                  <span className="badge">{category}</span>
                  <h1>{title}</h1>

                  {expeditionName && (
                    <p className="muted">Expedition: {expeditionName}</p>
                  )}

                  {previewType === "image" ? (
                    <img
                      src={uploaded.url}
                      alt={title}
                      className="detail-media"
                    />
                  ) : previewType === "video" ? (
                    <video
                      src={uploaded.url}
                      controls
                      className="detail-media"
                    />
                  ) : (
                    <div className="document-view">
                      <p className="doc-note">📄 Document / Report</p>
                      <a
                        href={uploaded.url}
                        target="_blank"
                        rel="noreferrer"
                        className="doc-link"
                      >
                        📥 View / Download Document
                      </a>
                    </div>
                  )}

                  <p className="description">{description}</p>

                  {previewTags.length > 0 && (
                    <div className="tags">
                      {previewTags.map((t) => (
                        <span key={t} className="tag">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="social-caption">
                    <strong>Social caption:</strong> {socialCaption}
                  </div>
                </div>
              )}
            </div>

            <p className="admin-preview-note">
              This is a preview only. Nothing is visible to the public until
              you publish.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}