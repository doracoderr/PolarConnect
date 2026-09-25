import api from "./client";

/**
 * 1. Ask our backend for a signature (proves the request came from a
 *    logged-in admin, without exposing the Cloudinary API secret).
 * 2. Upload the file directly to Cloudinary using that signature.
 * Returns { secure_url, public_id, resource_type }.
 */
export async function uploadToCloudinary(file, onProgress) {
  const { data: sig } = await api.get("/upload/signature");

  // Determine resource type based on MIME type, not Cloudinary's auto-detection
  let resourceType = "auto";
  if (file.type.startsWith("video/")) {
    resourceType = "video";
  } else if (file.type.startsWith("image/")) {
    resourceType = "image";
  } else {
    // PDFs, documents, etc. → "raw" type (Cloudinary won't try to interpret as image/video)
    resourceType = "raw";
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  form.append("resource_type", resourceType); // ← EXPLICITLY SET

  // IMPORTANT: Cloudinary decides how to treat the file based on the
  // resource_type segment in the URL path, not the resource_type form
  // field. Posting to /auto/upload made Cloudinary auto-detect the type
  // itself — and it classifies PDFs as "image" (since it can generate
  // image thumbnails from them), which silently overrode the resourceType
  // computed above and broke downstream processing for PDFs. Use the
  // computed resourceType in the URL so it's actually honored.
  const uploadUrl =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_URL ||
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;

  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || "Cloudinary upload failed");
  }
  return res.json();
}