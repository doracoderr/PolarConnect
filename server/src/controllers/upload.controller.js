const crypto = require("crypto");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const Content = require("../models/Content");

const RESOURCE_TYPE_BY_MEDIA_TYPE = {
  image: "image",
  video: "video",
  document: "raw",
};

/**
 * POST /api/upload  (admin only, multipart/form-data, field name "file")
 *
 * File comes to OUR server first (not straight to Cloudinary). We hash it,
 * reject exact duplicates before spending any Cloudinary storage/bandwidth,
 * then stream it up ourselves. This also means the duplicate check can't be
 * skipped by a client that talks to Cloudinary directly with a signature.
 */
async function uploadAndCheck(req, res) {
  try {
    const file = req.file;
    const { mediaType } = req.body;

    if (!file) return res.status(400).json({ message: "No file uploaded" });
    if (!mediaType || !RESOURCE_TYPE_BY_MEDIA_TYPE[mediaType]) {
      return res.status(400).json({ message: "mediaType must be image, video or document" });
    }

    const fileHash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    const existing = await Content.findOne({ fileHash });
    if (existing) {
      return res.status(409).json({
        message: "This file has already been uploaded.",
        existingContentId: existing._id,
        existingTitle: existing.title,
      });
    }

    const folder = process.env.CLOUDINARY_FOLDER || "polarconnect";
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: RESOURCE_TYPE_BY_MEDIA_TYPE[mediaType] },
        (err, uploaded) => (err ? reject(err) : resolve(uploaded))
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    });

    return res.json({
      mediaUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      mediaType,
      fileHash,
    });
  } catch (err) {
    console.error("[upload] error:", err.message);
    return res.status(500).json({ message: "Upload failed" });
  }
}

module.exports = { uploadAndCheck };
