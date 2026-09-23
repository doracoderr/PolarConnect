import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { uploadToCloudinary } from "../api/cloudinaryUpload";
import { compressImageIfNeeded } from "../utils/compressImage";

const CATEGORIES = ["Antarctica", "Arctic", "Himalaya", "General"];

// Cloudinary free-plan limits: 10MB for images/raw (PDFs etc.), 100MB for video.
const MAX_RAW_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

export default function AdminUpload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Antarctica");
  const [expeditionName, setExpeditionName] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState(""); // "", "uploading", "saving", "done", "error"
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setMessage("Please choose a file to upload.");
      return;
    }

    try {
      setStatus("uploading");

      let uploadFile = file;
      if (file.type.startsWith("image/")) {
        if (file.size > MAX_RAW_BYTES) {
          setMessage(`Compressing image (${mb(file.size)}MB)...`);
          uploadFile = await compressImageIfNeeded(file, 9 * 1024 * 1024);
          if (uploadFile.size > MAX_RAW_BYTES) {
            throw new Error(
              `This image is still ${mb(uploadFile.size)}MB after compression — please use a smaller photo (max 10MB).`
            );
          }
        }
      } else if (file.type.startsWith("video/")) {
        if (file.size > MAX_VIDEO_BYTES) {
          throw new Error(
            `This video is ${mb(file.size)}MB — videos are limited to 100MB on our current Cloudinary plan. Please compress it (e.g. HandBrake) and try again.`
          );
        }
      } else {
        // PDFs and other documents — we can't safely re-compress these in
        // the browser, so just give a clear message instead of a raw
        // Cloudinary error.
        if (file.size > MAX_RAW_BYTES) {
          throw new Error(
            `This file is ${mb(file.size)}MB — documents are limited to 10MB on our current Cloudinary plan. Please compress the PDF (e.g. ilovepdf.com/compress_pdf) and try again.`
          );
        }
      }

      setMessage("Uploading media to Cloudinary...");
      const uploadResult = await uploadToCloudinary(uploadFile);

      // Convert Cloudinary resource_type to our mediaType
      const mediaType = uploadResult.resource_type === "video" ? "video"
        : uploadResult.resource_type === "image" ? "image"
        : uploadResult.resource_type === "raw" ? "document"
        : "document"; // fallback for anything else

      setStatus("saving");
      setMessage("Saving content record...");
      const { data } = await api.post("/content", {
        title, category, expeditionName, tags, notes,
        mediaUrl: uploadResult.secure_url,
        mediaType,
        cloudinaryPublicId: uploadResult.public_id,
      });

      setLastResult(data.content);
      setStatus("done");
      setMessage("Saved as a draft. It won't appear on the public portal until you publish it.");

      // reset form
      setFile(null); setTitle(""); setExpeditionName(""); setTags(""); setNotes("");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.message || err.message || "Upload failed");
    }
  }

  return (
    <div className="container narrow">
      <h1>Upload Expedition Content</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          File (image / video / PDF)
          <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
        </label>
        <label>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Expedition name
          <input type="text" value={expeditionName} onChange={(e) => setExpeditionName(e.target.value)} placeholder="e.g. 43rd Indian Antarctic Expedition" />
        </label>
        <label>
          Tags (comma separated)
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ice-core, glaciology, Maitri" />
        </label>
        <label>
          Notes (optional — used to improve the auto-generated summary)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        {message && (
          <p className={`status ${status === "error" ? "status-error" : ""}`}>{message}</p>
        )}

        <button type="submit" disabled={status === "uploading" || status === "saving"}>
          {status === "uploading" || status === "saving" ? "Please wait..." : "Upload & Publish"}
        </button>
      </form>

      {lastResult && (
        <div className="result-preview">
          <h3>Auto-generated summary</h3>
          <p>{lastResult.description}</p>
          <h3>Auto-generated social caption</h3>
          <p>{lastResult.socialCaption}</p>
          <Link to="/admin/content">Go to Content &rarr; publish it from there</Link>
        </div>
      )}
    </div>
  );
}
