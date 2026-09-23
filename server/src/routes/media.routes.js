const express = require("express");
const { streamMedia } = require("../controllers/media.controller");

const router = express.Router();

router.get("/:id", streamMedia);

module.exports = router;
