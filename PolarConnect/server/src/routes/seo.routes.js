const express = require("express");
const { getSitemap, getRobotsTxt, getSitemapJson } = require("../controllers/seo.controller");

const router = express.Router();

// Mounted at root level in server.js (not under /api) — search engines
// expect /sitemap.xml and /robots.txt at the domain root.
router.get("/sitemap.xml", getSitemap);
router.get("/robots.txt", getRobotsTxt);

// Mounted under /api — feeds the human-readable /sitemap page in the frontend.
router.get("/api/sitemap", getSitemapJson);

module.exports = router;
