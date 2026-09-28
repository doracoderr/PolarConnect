import api from "./client";

// Determine mediaType from MIME type, not Cloudinary's auto-detection —
// matches RESOURCE_TYPE_BY_MEDIA_TYPE on the server.
function mediaTypeFromMime(mime) {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "document"; // PDFs, docx, etc.
}

/**
 * Uploads the file to OUR server (not straight to Cloudinary). The server
 * hashes the file, rejects it up front if it's an exact duplicate of
 * something already uploaded, and only then forwards it to Cloudinary.
 * Returns { secure_url, public_id, resource_type, fileHash }, or throws
 * with err.isDuplicate = true / err.existingContentId set on a 409.
 */
export async function uploadToCloudinary(file) {
  const mediaType = mediaTypeFromMime(file.type);

  const form = new FormData();
  form.append("file", file);
  form.append("mediaType", mediaType);

  try {
    const { data } = await api.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return {
      secure_url: data.mediaUrl,
      public_id: data.cloudinaryPublicId,
      resource_type: data.mediaType,
      fileHash: data.fileHash,
    };
  } catch (err) {
    if (err.response?.status === 409) {
      const dupErr = new Error(err.response.data?.message || "This file has already been uploaded.");
      dupErr.isDuplicate = true;
      dupErr.existingContentId = err.response.data?.existingContentId;
      throw dupErr;
    }
    throw err;
  }
}
