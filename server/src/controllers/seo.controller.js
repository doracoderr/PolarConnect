const Content = require("../models/Content");

/**
 * GET /sitemap.xml
 * Machine-readable sitemap for search engines (Google, Bing).
 * Lists the homepage, category pages, and every published content item
 * with its canonical public URL.
 */
async function getSitemap(req, res) {
  try {
    const siteUrl = (process.env.PUBLIC_SITE_URL || "http://localhost:5173").replace(/\/$/, "");

    const items = await Content.find({ approvedForDisplay: true })
      .select("_id updatedAt category")
      .sort({ publishedAt: -1 });

    const categories = [...new Set(items.map((i) => i.category))];

    const staticUrls = [
      { loc: `${siteUrl}/`, changefreq: "daily", priority: "1.0" },
      { loc: `${siteUrl}/sitemap`, changefreq: "monthly", priority: "0.3" },
      ...categories.map((c) => ({
        loc: `${siteUrl}/?category=${encodeURIComponent(c)}`,
        changefreq: "weekly",
        priority: "0.6",
      })),
    ];

    const itemUrls = items.map((i) => ({
      loc: `${siteUrl}/content/${i._id}`,
      lastmod: (i.updatedAt || new Date()).toISOString().split("T")[0],
      changefreq: "monthly",
      priority: "0.8",
    }));

    const allUrls = [...staticUrls, ...itemUrls];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      allUrls
        .map(
          (u) =>
            `  <url>\n` +
            `    <loc>${u.loc}</loc>\n` +
            (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
            `    <changefreq>${u.changefreq}</changefreq>\n` +
            `    <priority>${u.priority}</priority>\n` +
            `  </url>\n`
        )
        .join("") +
      `</urlset>`;

    res.set("Content-Type", "application/xml");
    return res.send(xml);
  } catch (err) {
    console.error("[seo] sitemap error:", err.message);
    return res.status(500).send("");
  }
}

/**
 * GET /robots.txt
 * Tells crawlers what they can index and points them at the sitemap.
 * Admin routes are disallowed since they have nothing for the public.
 */
function getRobotsTxt(req, res) {
  const siteUrl = (process.env.PUBLIC_SITE_URL || "http://localhost:5173").replace(/\/$/, "");

  const body =
    `User-agent: *\n` +
    `Allow: /\n` +
    `Disallow: /admin/\n` +
    `Sitemap: ${siteUrl}/sitemap.xml\n`;

  res.set("Content-Type", "text/plain");
  return res.send(body);
}

/**
 * GET /api/sitemap
 * JSON, grouped by category — used by the human-readable /sitemap page
 * in the frontend (a categorized site index, the way UIDAI/many gov
 * sites expose one) so visitors and screen-reader users can navigate
 * the whole site from one page, not just search engines.
 */
async function getSitemapJson(req, res) {
  try {
    const items = await Content.find({ approvedForDisplay: true })
      .select("_id title category")
      .sort({ category: 1, title: 1 });

    const grouped = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push({ id: item._id, title: item.title });
    }

    return res.json({ categories: grouped });
  } catch (err) {
    console.error("[seo] sitemap json error:", err.message);
    return res.status(500).json({ message: "Server error while building sitemap" });
  }
}

module.exports = { getSitemap, getRobotsTxt, getSitemapJson };
