import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { uploadToCloudinary } from "../api/cloudinaryUpload";
import { compressImageIfNeeded } from "../utils/compressImage";

const CATEGORIES = [
  "Antarctica",
  "Arctic",
  "Himalaya",
  "General",
];

// Cloudinary free-plan limits:
// 10MB for images/raw documents, 100MB for videos.
const MAX_RAW_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const mb = (bytes) =>
  (bytes / (1024 * 1024)).toFixed(1);

export default function AdminUpload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Antarctica");
  const [expeditionName, setExpeditionName] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      setStatus("error");
      setMessage("Please choose a file to upload.");
      return;
    }

    setLastResult(null);

    try {
      setStatus("uploading");
      setMessage("Preparing your file...");

      let uploadFile = file;

      if (file.type.startsWith("image/")) {
        if (file.size > MAX_RAW_BYTES) {
          setMessage(
            `Compressing image (${mb(file.size)}MB)...`
          );

          uploadFile = await compressImageIfNeeded(
            file,
            9 * 1024 * 1024
          );

          if (uploadFile.size > MAX_RAW_BYTES) {
            throw new Error(
              `This image is still ${mb(
                uploadFile.size
              )}MB after compression — please use a smaller photo (max 10MB).`
            );
          }
        }
      } else if (file.type.startsWith("video/")) {
        if (file.size > MAX_VIDEO_BYTES) {
          throw new Error(
            `This video is ${mb(
              file.size
            )}MB — videos are limited to 100MB on our current Cloudinary plan. Please compress it and try again.`
          );
        }
      } else {
        if (file.size > MAX_RAW_BYTES) {
          throw new Error(
            `This file is ${mb(
              file.size
            )}MB — documents are limited to 10MB on our current Cloudinary plan. Please compress the PDF and try again.`
          );
        }
      }

      setMessage("Uploading media to Cloudinary...");

      const uploadResult =
        await uploadToCloudinary(uploadFile);

      const mediaType =
        uploadResult.resource_type === "video"
          ? "video"
          : uploadResult.resource_type === "image"
            ? "image"
            : uploadResult.resource_type === "raw"
              ? "document"
              : "document";

      setStatus("saving");
      setMessage("Saving content record...");

      const { data } = await api.post("/content", {
        title,
        category,
        expeditionName,
        tags,
        notes,
        mediaUrl: uploadResult.secure_url,
        mediaType,
        cloudinaryPublicId:
          uploadResult.public_id,
      });

      setLastResult(data.content);

      setStatus("done");
      setMessage(
        "Saved as a draft. It won't appear on the public portal until you publish it."
      );

      setFile(null);
      setTitle("");
      setExpeditionName("");
      setTags("");
      setNotes("");

      e.target.reset();
    } catch (err) {
      setStatus("error");

      setMessage(
        err.response?.data?.message ||
          err.message ||
          "Upload failed"
      );
    }
  }

  const isSubmitting =
    status === "uploading" ||
    status === "saving";

  const fileIsImage =
    file?.type?.startsWith("image/");

  const fileIsVideo =
    file?.type?.startsWith("video/");

  const fileIsPdf =
    file?.type === "application/pdf";

  return (
    <div className="admin-upload-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="admin-upload-top">
        <Link
          to="/admin/dashboard"
          className="admin-upload-back"
        >
          <span>←</span>
          Back to Dashboard
        </Link>

        <div className="admin-upload-heading">
          <div>
            <div className="admin-upload-eyebrow">
              POLARCONNECT ADMIN
            </div>

            <h1>Upload Expedition Content</h1>

            <p>
              Add research reports, photographs, videos,
              or documents to PolarConnect.
            </p>
          </div>

          <div className="admin-upload-header-icon">
            ↑
          </div>
        </div>
      </div>


      {/* =====================================================
          MAIN FORM
          ===================================================== */}

      <form
        className="admin-upload-form"
        onSubmit={handleSubmit}
      >

        {/* ===================================================
            FILE UPLOAD SECTION
            =================================================== */}

        <section className="admin-upload-card">

          <div className="admin-upload-card-header">
            <div className="admin-upload-section-icon">
              ↑
            </div>

            <div>
              <h2>Content File</h2>

              <p>
                Upload an image, video, or PDF document.
              </p>
            </div>
          </div>


          <label
            className={`admin-file-dropzone ${
              file ? "has-file" : ""
            }`}
          >

            <input
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={(e) => {
                const selectedFile =
                  e.target.files?.[0] || null;

                setFile(selectedFile);
                setStatus("");
                setMessage("");
                setLastResult(null);
              }}
              required
            />

            {!file ? (
              <div className="admin-file-empty">

                <div className="admin-file-upload-icon">
                  ↑
                </div>

                <strong>
                  Click to choose a file
                </strong>

                <span>
                  or select an image, video or PDF
                </span>

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

                  {!fileIsImage &&
                    !fileIsVideo &&
                    !fileIsPdf &&
                    "📎"}

                </div>

                <div className="admin-selected-file-info">

                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {mb(file.size)} MB
                    {file.type
                      ? ` · ${file.type}`
                      : ""}
                  </span>

                </div>

                <span className="admin-selected-file-change">
                  Change
                </span>

              </div>
            )}

          </label>

          <div className="admin-upload-file-note">

            <span>ⓘ</span>

            <p>
              Images and documents have a 10MB limit.
              Videos can be up to 100MB. Large images
              are automatically compressed before upload.
            </p>

          </div>

        </section>


        {/* ===================================================
            CONTENT DETAILS
            =================================================== */}

        <section className="admin-upload-card">

          <div className="admin-upload-card-header">

            <div className="admin-upload-section-icon">
              ✦
            </div>

            <div>
              <h2>Content Details</h2>

              <p>
                Provide information to help organize
                and discover this content.
              </p>
            </div>

          </div>


          <div className="admin-upload-fields">

            {/* TITLE */}

            <label className="admin-upload-field admin-field-full">

              <span>
                Title
                <b>*</b>
              </span>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="Enter content title"
                required
              />

            </label>


            {/* CATEGORY */}

            <label className="admin-upload-field">

              <span>
                Category
                <b>*</b>
              </span>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
              >
                {CATEGORIES.map((c) => (
                  <option
                    key={c}
                    value={c}
                  >
                    {c}
                  </option>
                ))}
              </select>

            </label>


            {/* EXPEDITION NAME */}

            <label className="admin-upload-field">

              <span>
                Expedition Name
              </span>

              <input
                type="text"
                value={expeditionName}
                onChange={(e) =>
                  setExpeditionName(
                    e.target.value
                  )
                }
                placeholder="e.g. 43rd Indian Antarctic Expedition"
              />

            </label>


            {/* TAGS */}

            <label className="admin-upload-field admin-field-full">

              <span>
                Tags
              </span>

              <input
                type="text"
                value={tags}
                onChange={(e) =>
                  setTags(e.target.value)
                }
                placeholder="ice-core, glaciology, Maitri"
              />

              <small>
                Separate multiple tags with commas.
              </small>

            </label>


            {/* NOTES */}

            <label className="admin-upload-field admin-field-full">

              <span>
                Notes
              </span>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                rows={5}
                placeholder="Optional notes to improve the auto-generated summary"
              />

              <small>
                These notes can help generate a better
                content summary.
              </small>

            </label>

          </div>

        </section>


        {/* ===================================================
            STATUS MESSAGE
            =================================================== */}

        {message && (
          <div
            className={`admin-upload-message ${
              status === "error"
                ? "is-error"
                : status === "done"
                  ? "is-success"
                  : "is-progress"
            }`}
            role="status"
          >

            <span className="admin-upload-message-icon">

              {status === "error" && "!"}

              {status === "done" && "✓"}

              {status !== "error" &&
                status !== "done" &&
                "↻"}

            </span>

            <div>
              <strong>
                {status === "error"
                  ? "Upload failed"
                  : status === "done"
                    ? "Upload complete"
                    : status === "uploading"
                      ? "Uploading content"
                      : "Saving content"}
              </strong>

              <p>
                {message}
              </p>
            </div>

          </div>
        )}


        {/* ===================================================
            ACTIONS
            =================================================== */}

        <div className="admin-upload-actions">

          <Link
            to="/admin/dashboard"
            className="admin-upload-cancel"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="admin-upload-submit"
            disabled={isSubmitting}
          >

            {status === "uploading"
              ? "Uploading..."
              : status === "saving"
                ? "Saving..."
                : "Upload as Draft"}

            {!isSubmitting && (
              <span>→</span>
            )}

          </button>

        </div>

      </form>


      {/* =====================================================
          GENERATED CONTENT RESULT
          ===================================================== */}

      {lastResult && (
        <section className="admin-result-preview">

          <div className="admin-result-header">

            <div className="admin-result-icon">
              ✓
            </div>

            <div>
              <div className="admin-upload-eyebrow">
                GENERATED CONTENT
              </div>

              <h2>
                Content generated successfully
              </h2>

              <p>
                Your content has been saved as a draft.
              </p>
            </div>

          </div>


          <div className="admin-result-grid">

            <div className="admin-result-box">

              <h3>
                Auto-generated Summary
              </h3>

              <p>
                {lastResult.description ||
                  "No summary was generated."}
              </p>

            </div>


            <div className="admin-result-box">

              <h3>
                Auto-generated Social Caption
              </h3>

              <p>
                {lastResult.socialCaption ||
                  "No social caption was generated."}
              </p>

            </div>

          </div>


          <div className="admin-result-footer">

            <span>
              Ready for review and publishing.
            </span>

            <Link to="/admin/content">
              Go to Content →
            </Link>

          </div>

        </section>
      )}

    </div>
  );
}