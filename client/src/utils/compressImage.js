/**
 * Auto-compresses an image in the browser before it's uploaded, so large
 * phone-camera photos (often 8-20MB) don't get rejected by Cloudinary's
 * 10MB free-plan limit. Non-image files (PDFs, videos) are returned
 * untouched — real image re-compression for those needs a server-side
 * tool, not something safe to do in the browser.
 *
 * Strategy: re-encode as JPEG, progressively lowering quality and
 * dimensions until the result fits under maxBytes (or we've tried
 * enough times — we return the smallest attempt either way, so even a
 * huge original ends up dramatically smaller).
 */
export async function compressImageIfNeeded(file, maxBytes = 9 * 1024 * 1024) {
  if (!file.type.startsWith("image/") || file.size <= maxBytes) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const baseName = file.name.replace(/\.[^.]+$/, "");

  let quality = 0.9;
  let scale = 1;
  let bestBlob = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // eslint-disable-next-line no-await-in-loop
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob) {
      bestBlob = blob; // keep the latest (smallest so far) attempt as a fallback
      if (blob.size <= maxBytes) break;
    }

    quality = Math.max(0.5, quality - 0.15);
    scale = Math.max(0.35, scale - 0.15);
  }

  if (!bestBlob) return file; // compression failed for some reason — fall back to original

  return new File([bestBlob], `${baseName}.jpg`, { type: "image/jpeg" });
}
