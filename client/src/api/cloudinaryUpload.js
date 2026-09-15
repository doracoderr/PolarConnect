import api from "./client";

/**
 * 1. Ask our backend for a signature (proves the request came from a
 *    logged-in admin, without exposing the Cloudinary API secret).
 * 2. Upload the file directly to Cloudinary using that signature.
 * Returns { secure_url, public_id, resource_type }.
 */
export async function uploadToCloudinary(file, onProgress) {
  const { data: sig } = await api.get("/upload/signature");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const uploadUrl =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_URL ||
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;

  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || "Cloudinary upload failed");
  }
  return res.json();
}
