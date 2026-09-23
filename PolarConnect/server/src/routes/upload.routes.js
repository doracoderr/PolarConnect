const express = require("express");
const { getUploadSignature } = require("../controllers/upload.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/signature", requireAuth, getUploadSignature);

module.exports = router;
