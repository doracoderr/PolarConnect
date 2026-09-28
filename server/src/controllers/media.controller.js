const Content = require("../models/Content");
const { decodeMediaToken } = require("../utils/mediaToken");

/**
 * GET /api/media/:id?token=...
 *
 * Proxies the actual media file from Cloudinary through our own server,
 * so the browser (Network tab, view-source, right-click "copy image
 * address", everything) only ever sees a temporary, short-lived
 * /api/media/:id?token=... URL — never the real Cloudinary URL or
 * cloud name.
 *
 * Supports HTTP Range requests (needed for video seeking / PDF partial
 * loads) by forwarding the Range header to Cloudinary and passing its
 * 206/200 response straight through.
 */

// Cloudinary serves "raw" uploads (PDF/DOCX/etc.) as application/octet-stream
// with no extension in the URL, so we work out the real type ourselves:
// first from the bytes (works for files uploaded before this fix too),
// then from the upstream header if it is something more specific.
const TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};
const EXT_BY_MIME = Object.fromEntries(
  Object.entries(TYPES).map(([ext, mime]) => [mime.split(";")[0], ext])
);

function sniffExt(buf) {
  if (buf.length < 12) return null;
  const head = buf.subarray(0, 12);
  const ascii = head.toString("latin1");
  if (ascii.startsWith("%PDF")) return "pdf";
  if (head[0] === 0x89 && ascii.slice(1, 4) === "PNG") return "png";
  if (head[0] === 0xff && head[1] === 0xd8) return "jpg";
  if (ascii.startsWith("GIF8")) return "gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "webp";
  if (ascii.slice(4, 8) === "ftyp") return ascii.slice(8, 10) === "qt" ? "mov" : "mp4";
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "webm";
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) return "doc";
  if (ascii.startsWith("PK\x03\x04")) {
    // DOCX/XLSX/PPTX are zips; the folder names inside tell them apart.
    const inner = buf.subarray(0, Math.min(buf.length, 8192)).toString("latin1");
    if (inner.includes("word/")) return "docx";
    if (inner.includes("xl/")) return "xlsx";
    if (inner.includes("ppt/")) return "pptx";
    return "zip";
  }
  return null;
}

function detectFile(buf, upstreamType) {
  let ext = sniffExt(buf);
  const clean = (upstreamType || "").split(";")[0].trim().toLowerCase();
  if (!ext && EXT_BY_MIME[clean]) ext = EXT_BY_MIME[clean];
  if (!ext) return { ext: "", type: clean || "application/octet-stream" };
  return { ext, type: TYPES[ext] };
}

async function streamMedia(req, res) {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) return res.status(401).json({ message: "Missing view token" });

    let payload;
    try {
      payload = decodeMediaToken(token);
    } catch {
      return res.status(401).json({ message: "This view link has expired. Reload the page for a fresh one." });
    }

    if (payload.cid !== id) {
      return res.status(403).json({ message: "Token does not match this content" });
    }

    const content = await Content.findById(id);
    // Drafts are only viewable with an admin-issued preview token.
    if (!content || (!content.approvedForDisplay && !payload.preview)) {
      return res.status(404).json({ message: "Content not found" });
    }

    const upstream = await fetch(content.mediaUrl, {
      headers: req.headers.range ? { Range: req.headers.range } : {},
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ message: "Could not load media" });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const isRange = upstream.status === 206;

    res.status(upstream.status);

    // A partial (Range) response can't be sniffed reliably, so only trust
    // the bytes on full responses; ranges keep the upstream type.
    const upstreamType = upstream.headers.get("content-type") || "";
    const detected = isRange
      ? { ext: EXT_BY_MIME[upstreamType.split(";")[0].trim()] || "", type: upstreamType }
      : detectFile(buffer, upstreamType);

    for (const h of ["content-range", "accept-ranges", "cache-control"]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!upstream.headers.get("accept-ranges")) res.setHeader("Accept-Ranges", "bytes");

    res.setHeader("Content-Type", detected.type || "application/octet-stream");
    res.setHeader("Content-Length", buffer.length);

    // Filename = title + real extension, so "Save As" keeps the original
    // format (PDF stays .pdf, DOCX stays .docx, ...).
    const base = (content.title || "file").replace(/[^\w\-. ]+/g, "").trim().slice(0, 80) || "file";
    const filename = detected.ext ? `${base}.${detected.ext}` : base;
    const asciiName = filename.replace(/"/g, "");
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.send(buffer);
  } catch (err) {
    console.error("[media] proxy error:", err.message);
    return res.status(500).json({ message: "Server error while loading media" });
  }
}

module.exports = { streamMedia };
