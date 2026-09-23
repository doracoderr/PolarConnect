const Content = require("../models/Content");
const { generateSummary } = require("../services/summary.service");
const { sendUploadConfirmation } = require("../services/email.service");

// POST /api/content  (admin only) — called after the file is already on Cloudinary
async function createContent(req, res) {
  try {
    const {
      title, category, expeditionName, tags, notes,
      mediaUrl, mediaType, cloudinaryPublicId,
    } = req.body;

    if (!title || !mediaUrl || !mediaType || !cloudinaryPublicId) {
      return res.status(400).json({
        message: "title, mediaUrl, mediaType and cloudinaryPublicId are required",
      });
    }

    const tagList = Array.isArray(tags)
      ? tags
      : (tags || "").split(",").map((t) => t.trim()).filter(Boolean);

    const { description, socialCaption } = await generateSummary({
      title, category, expeditionName, tags: tagList, notes,
      mediaUrl, mediaType,
    });

    const content = await Content.create({
      title,
      category,
      expeditionName,
      tags: tagList,
      description,
      socialCaption,
      mediaUrl,
      mediaType,
      cloudinaryPublicId,
      uploadedBy: req.admin._id,
      approvedForDisplay: true, // set to false here if you want a manual review step
      publishedAt: new Date(),
    });

    sendUploadConfirmation(content); // fire-and-forget

    return res.status(201).json({ content });
  } catch (err) {
    console.error("[content] create error:", err.message);
    return res.status(500).json({ message: "Server error while saving content" });
  }
}

// GET /api/content  (public) — list, search, filter
async function listContent(req, res) {
  try {
    const { search, category, expedition, page = 1, limit = 12 } = req.query;

    const query = { approvedForDisplay: true };
    if (category) query.category = category;
    if (expedition) query.expeditionName = expedition;
    if (search) query.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Content.find(query).sort({ publishedAt: -1 }).skip(skip).limit(Number(limit)),
      Content.countDocuments(query),
    ]);

    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("[content] list error:", err.message);
    return res.status(500).json({ message: "Server error while fetching content" });
  }
}

// GET /api/content/:id (public)
async function getContentById(req, res) {
  try {
    const content = await Content.findById(req.params.id);
    if (!content || !content.approvedForDisplay) {
      return res.status(404).json({ message: "Content not found" });
    }
    return res.json({ content });
  } catch (err) {
    return res.status(404).json({ message: "Content not found" });
  }
}

// PUT /api/content/:id (admin only)
async function updateContent(req, res) {
  try {
    const updates = { ...req.body };
    delete updates.uploadedBy; // uploader can't be changed via this route

    const content = await Content.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!content) return res.status(404).json({ message: "Content not found" });
    return res.json({ content });
  } catch (err) {
    console.error("[content] update error:", err.message);
    return res.status(500).json({ message: "Server error while updating content" });
  }
}

// DELETE /api/content/:id (admin only)
async function deleteContent(req, res) {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ message: "Content not found" });
    return res.json({ message: "Content deleted" });
  } catch (err) {
    console.error("[content] delete error:", err.message);
    return res.status(500).json({ message: "Server error while deleting content" });
  }
}

module.exports = { createContent, listContent, getContentById, updateContent, deleteContent };
