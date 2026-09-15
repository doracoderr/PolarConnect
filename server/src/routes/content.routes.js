const express = require("express");
const {
  createContent, listContent, getContentById, updateContent, deleteContent,
} = require("../controllers/content.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", listContent);
router.get("/:id", getContentById);
router.post("/", requireAuth, createContent);
router.put("/:id", requireAuth, updateContent);
router.delete("/:id", requireAuth, deleteContent);

module.exports = router;
