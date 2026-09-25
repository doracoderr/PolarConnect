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

    res.status(upstream.status);

    const passthroughHeaders = [
      "content-type", "content-length", "content-range", "accept-ranges", "cache-control",
    ];
    for (const h of passthroughHeaders) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!upstream.headers.get("accept-ranges")) res.setHeader("Accept-Ranges", "bytes");

    // Open PDFs/images/videos inline in the browser instead of forcing a
    // "Save As" download dialog.
    const safeName = (content.title || "file").replace(/[^\w\-. ]+/g, "").slice(0, 80);
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err) {
    console.error("[media] proxy error:", err.message);
    return res.status(500).json({ message: "Server error while loading media" });
  }
}

module.exports = { streamMedia };
