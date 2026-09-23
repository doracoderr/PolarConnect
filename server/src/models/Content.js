const mongoose = require("mongoose");

const CATEGORIES = ["Antarctica", "Arctic", "Himalaya", "General"];
const MEDIA_TYPES = ["image", "video", "document"];

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },       // auto-generated summary
    socialCaption: { type: String, default: "" },      // auto-generated caption
    category: { type: String, enum: CATEGORIES, default: "General" },
    expeditionName: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },

    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: MEDIA_TYPES, required: true },
    cloudinaryPublicId: { type: String, required: true },

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
