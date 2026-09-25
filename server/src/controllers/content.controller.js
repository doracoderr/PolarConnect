const Content = require("../models/Content");
const { generateSummaryLocal: generateSummary } = require("../services/summary.local.service");
const { sendUploadConfirmation } = require("../services/email.service");
const { signMediaToken } = require("../utils/mediaToken");

// Attaches a short-lived viewUrl (our own /api/media/:id proxy) to a
// content item, and strips out the real Cloudinary mediaUrl/publicId
// before it's ever sent to a public-facing client.
function toPublicJSON(content, { preview = false } = {}) {
  const obj = content.toObject ? content.toObject() : { ...content };
  const base = process.env.PUBLIC_API_URL || "/api";
  obj.viewUrl = `${base}/media/${obj._id}?token=${signMediaToken(obj._id, { preview })}`;
  delete obj.mediaUrl;
  delete obj.cloudinaryPublicId;
  return obj;
}

// POST /api/content  (admin only) — called after the file is already on Cloudinary
async function createContent(req, res) {
  try {
    const {
      title, category, expeditionName, tags, notes,
      mediaUrl, mediaType, cloudinaryPublicId,
      description: providedDescription,
      socialCaption: providedCaption,
      publish,
    } = req.body;

    if (!title || !mediaUrl || !mediaType || !cloudinaryPublicId) {
      return res.status(400).json({
        message: "title, mediaUrl, mediaType and cloudinaryPublicId are required",
      });
    }

    const tagList = Array.isArray(tags)
      ? tags
      : (tags || "").split(",").map((t) => t.trim()).filter(Boolean);

    // The admin may already have generated (and edited) the summary in the
    // upload flow — only call the generator if it wasn't supplied.
    let description = (providedDescription || "").trim();
    let socialCaption = (providedCaption || "").trim();
    if (!description || !socialCaption) {
      const generated = await generateSummary({
        title, category, expeditionName, tags: tagList, notes,
        mediaUrl, mediaType,
      });
      description = description || generated.description;
      socialCaption = socialCaption || generated.socialCaption;
    }

    const shouldPublish = publish === true;

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
      approvedForDisplay: shouldPublish, // draft unless the admin chose "Publish"
      publishedAt: new Date(),
    });

    if (shouldPublish) sendUploadConfirmation(content); // fire-and-forget

    return res.status(201).json({ content: toPublicJSON(content) });
  } catch (err) {
    console.error("[content] create error:", err.message);
    return res.status(500).json({ message: "Server error while saving content" });
  }
}

// POST /api/content/summary  (admin only) — generate a summary + social
// caption for the upload preview step, without saving anything.
async function previewSummary(req, res) {
  try {
    const { title, category, expeditionName, tags, notes, mediaUrl, mediaType } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    const tagList = Array.isArray(tags)
      ? tags
      : (tags || "").split(",").map((t) => t.trim()).filter(Boolean);

    const { description, socialCaption } = await generateSummary({
      title, category: category || "General", expeditionName, tags: tagList, notes,
      mediaUrl, mediaType,
    });

    return res.json({ description, socialCaption });
  } catch (err) {
    console.error("[content] summary preview error:", err.message);
    return res.status(500).json({ message: "Could not generate summary" });
  }
}

// GET /api/content  (public) — list, search, filter
//
// Pagination is opt-in: if the caller doesn't send a `limit`, we return
// EVERY approved item (sorted, newest first) instead of silently capping
// at some default page size. That way the public portal shows everything
// by default, and only paginates if/when it explicitly asks to.
async function listContent(req, res) {
  try {
    const { search, category, expedition, page = 1, limit } = req.query;

    const query = { approvedForDisplay: true };
    if (category) query.category = category;
    if (expedition) query.expeditionName = expedition;
    if (search) query.$text = { $search: search };

    let itemsQuery = Content.find(query).sort({ publishedAt: -1 });

    const hasLimit = limit !== undefined && limit !== null && limit !== "";
    if (hasLimit) {
      const skip = (Number(page) - 1) * Number(limit);
      itemsQuery = itemsQuery.skip(skip).limit(Number(limit));
    }

    const [items, total] = await Promise.all([
      itemsQuery,
      Content.countDocuments(query),
    ]);

    return res.json({
      items: items.map((item) => toPublicJSON(item)),
      total,
      page: Number(page),
      limit: hasLimit ? Number(limit) : total,
    });
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
    return res.json({ content: toPublicJSON(content) });
  } catch (err) {
    return res.status(404).json({ message: "Content not found" });
  }
}

// GET /api/content/admin/all (admin only) — every item, published or draft,
// so the admin dashboard can show what's live vs. what's waiting to be published.
async function listAllForAdmin(req, res) {
  try {
    const items = await Content.find().sort({ createdAt: -1 });
    return res.json({ items: items.map((item) => toPublicJSON(item, { preview: true })) });
  } catch (err) {
    console.error("[content] admin list error:", err.message);
    return res.status(500).json({ message: "Server error while fetching content" });
  }
}

// PUT /api/content/:id (admin only)
async function updateContent(req, res) {
  try {
    const updates = { ...req.body };
    delete updates.uploadedBy; // uploader can't be changed via this route

    const before = await Content.findById(req.params.id);
    if (!before) return res.status(404).json({ message: "Content not found" });

    const isNowPublishing = updates.approvedForDisplay === true && !before.approvedForDisplay;

    const content = await Content.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (isNowPublishing) sendUploadConfirmation(content); // fire-and-forget, on actual publish

    return res.json({ content: toPublicJSON(content, { preview: true }) });
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

// PATCH /api/content/:id/fix-type (admin only) — Fix mediaType if incorrectly marked as "image"
async function fixMediaType(req, res) {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { mediaType: "document" },
      { new: true }
    );
    if (!content) return res.status(404).json({ message: "Content not found" });
    return res.json({ content: toPublicJSON(content, { preview: true }), message: "Media type fixed to 'document'" });
  } catch (err) {
    console.error("[content] fix-type error:", err.message);
    return res.status(500).json({ message: "Server error while fixing media type" });
  }
}

module.exports = {
  createContent, previewSummary, listContent, getContentById, updateContent, deleteContent, listAllForAdmin, fixMediaType,
};