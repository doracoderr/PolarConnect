const express = require("express");
const multer = require("multer");
const { uploadAndCheck } = require("../controllers/upload.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Memory storage: file is hashed + duplicate-checked before it ever touches
// disk or Cloudinary. 50MB cap covers expedition photos/short clips/docs.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post("/", requireAuth, upload.single("file"), uploadAndCheck);

module.exports = router;
