import { useState } from "react";
import api from "../api/client";
import { uploadToCloudinary } from "../api/cloudinaryUpload";

const CATEGORIES = ["Antarctica", "Arctic", "Himalaya", "General"];

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
      setMessage("Uploading media to Cloudinary...");
      const uploadResult = await uploadToCloudinary(file);

      const mediaType = uploadResult.resource_type === "video" ? "video"
        : uploadResult.resource_type === "image" ? "image"
        : "document";

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
      setMessage("Uploaded and published successfully.");

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
        </div>
      )}
    </div>
  );
}
