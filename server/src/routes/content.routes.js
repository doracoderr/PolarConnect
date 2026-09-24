const express = require("express");
const {
  createContent, previewSummary, listContent, getContentById, updateContent, deleteContent, listAllForAdmin, fixMediaType,
} = require("../controllers/content.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/admin/all", requireAuth, listAllForAdmin); // must come before "/:id"
router.get("/", listContent);
router.get("/:id", getContentById);
router.post("/summary", requireAuth, previewSummary);
router.post("/", requireAuth, createContent);
router.put("/:id", requireAuth, updateContent);
router.patch("/:id/fix-type", requireAuth, fixMediaType); // Fix mediaType for PDFs marked as images
router.delete("/:id", requireAuth, deleteContent);

module.exports = router;