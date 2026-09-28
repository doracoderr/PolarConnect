const mongoose = require("mongoose");

const CATEGORIES = ["Antarctica", "Arctic", "Himalaya", "General"];
const MEDIA_TYPES = ["image", "video", "document"];
const CONTENT_TYPES = [
  "Expedition Report",
  "Scientific Dataset",
  "Publication",
  "Photograph",
  "Video",
  "Institutional Activity",
];

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },       // auto-generated summary (English)
    socialCaption: { type: String, default: "" },      // auto-generated caption (English)
    descriptionHi: { type: String, default: "" },      // auto-translated summary (Hindi)
    socialCaptionHi: { type: String, default: "" },    // auto-translated caption (Hindi)
    category: { type: String, enum: CATEGORIES, default: "General" },
    contentType: { type: String, enum: CONTENT_TYPES, default: "Expedition Report" },
    expeditionName: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },

    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: MEDIA_TYPES, required: true },
    cloudinaryPublicId: { type: String, required: true },
    // SHA-256 of the raw file bytes, computed server-side on upload —
    // lets us reject an exact-duplicate file before it ever reaches
    // Cloudinary. sparse+unique so older/legacy docs without a hash
    // don't collide on "".
    fileHash: { type: String, index: true, unique: true, sparse: true },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    approvedForDisplay: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

// Basic text index so /api/content?search= can do a simple search
contentSchema.index({ title: "text", description: "text", tags: "text", expeditionName: "text" });

module.exports = mongoose.model("Content", contentSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.MEDIA_TYPES = MEDIA_TYPES;
module.exports.CONTENT_TYPES = CONTENT_TYPES;
