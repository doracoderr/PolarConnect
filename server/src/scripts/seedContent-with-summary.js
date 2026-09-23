/**
 * Enhanced Seed Script — NCPOR Demo Content (~107 items)
 * 
 * Features:
 * - Auto-generates descriptions + social captions via Gemini
 * - Proper mediaType detection (image/video/document)
 * - Saves as DRAFT (approvedForDisplay: false) — admin publishes manually
 * - Creates proper viewUrl with signed tokens (just like manual upload)
 * 
 * Run with: node src/scripts/seedContent-with-summary.js
 */

require("dotenv").config();
const connectDB = require("../config/db");
const Content = require("../models/Content");
const Admin = require("../models/Admin");
const { generateSummary } = require("../services/summary.service");
const seedData = require("../data/contentSeedData.json");

/**
 * Category-based placeholder image pools (all free-to-use, Unsplash License).
 * Each item cycles through its category's pool by index, instead of every
 * item in the whole seed getting the exact same picture.
 */
const IMAGE_POOLS = {
  Antarctica: [
    "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800", // Antarctic ice landscape
    "https://images.unsplash.com/photo-1556918936-216daf8e7c4c?w=800",    // Gentoo penguins, Antarctic Peninsula
  ],
  Arctic: [
    "https://images.unsplash.com/photo-1593946460607-d1570da6268f?w=800", // polar bear, Arctic
    "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800", // polar ice landscape
  ],
  Himalaya: [
    "https://images.unsplash.com/photo-1517231880309-963a7334a96d?w=800", // Everest / Himalaya snow peaks
    "https://images.unsplash.com/photo-1592731057019-57ed336948ed?w=800", // Himalaya, Mustang, Nepal
  ],
  General: [
    "https://images.unsplash.com/photo-1581057400571-61a9d92d091c?w=800", // research vessel at sea
    "https://images.unsplash.com/photo-1564698010692-0fe284aae806?w=800", // aerial ocean wave
  ],
};

function pickMediaUrl(category, index) {
  const pool = IMAGE_POOLS[category] || IMAGE_POOLS.General;
  return pool[index % pool.length];
}

async function run() {
  await connectDB();

  const admin = await Admin.findOne();
  if (!admin) {
    console.error("[seed] No admin found — run `npm run seed:admin` first.");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`[seed] Starting... processing ${seedData.length} items`);

  for (let i = 0; i < seedData.length; i++) {
    const item = seedData[i];

    try {
      // Check if already exists
      // (bug fix: seed rows use "Title" with a capital T — the old check
      // compared against item.title, which is always undefined, so re-runs
      // never detected existing content and could create duplicates)
      const exists = await Content.findOne({ title: item.Title });
      if (exists) {
        skipped++;
        continue;
      }

      // Parse tags from CSV comma-separated string to array
      const tags = Array.isArray(item.Tags)
        ? item.Tags
        : (item.Tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

      // Determine media type
      let mediaType = "image"; // default
      // Bug fix: this used to be ONE hardcoded Unsplash URL for every single
      // item, so every card in the portal showed the same picture. Now it
      // picks a category-appropriate image and cycles through a small pool
      // per category so consecutive items don't repeat the same photo.
      let mediaUrl = item.MediaUrl || pickMediaUrl(item.Category || "General", i);
      let cloudinaryPublicId = `seed/placeholder_${i + 1}`;

      // If title contains "Report" or "Document" or specific expedition reports, mark as document
      if (
        item.Title.toLowerCase().includes("report") ||
        item.Title.toLowerCase().includes("document") ||
        item.Title.toLowerCase().includes("pdf")
      ) {
        mediaType = "document";
        // Link to actual NCPOR PDF if available
        if (item.Title.includes("14th Arctic") && item.Title.includes("2023-24")) {
          mediaUrl = "https://ncpor.res.in/files/14-Arctic_Expedition-2023-24_Report-Low_Resolution.pdf";
        } else if (item.Title.includes("15th Arctic") && item.Title.includes("2024-25")) {
          mediaUrl = "https://ncpor.res.in/files/15-Arctic_Expedition-2024-25_Report.pdf";
        } else {
          // Generic placeholder PDF
          mediaUrl = "https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table.pdf";
        }
        cloudinaryPublicId = `seed/document_${i + 1}`;
      }

      // Generate description + social caption via Gemini (with fallback)
      console.log(`  [${i + 1}/${seedData.length}] Generating summary for "${item.Title}"...`);
      const { description, socialCaption } = await generateSummary({
        title: item.Title,
        category: item.Category || "General",
        expeditionName: item.Expedition || "",
        tags,
        notes: "",
        mediaUrl,
        mediaType,
      });

      // Create the content document
      const newContent = await Content.create({
        title: item.Title,
        category: item.Category || "General",
        expeditionName: item.Expedition || "",
        tags,
        description,
        socialCaption,
        mediaUrl,
        mediaType,
        cloudinaryPublicId,
        uploadedBy: admin._id,
        approvedForDisplay: false, // DRAFT — admin publishes manually
        publishedAt: new Date(),
      });

      created++;
      console.log(
        `    ✓ Created (${mediaType}): ${newContent._id}`
      );
    } catch (err) {
      failed++;
      console.error(`  ✗ Failed on "${item.Title}":`, err.message);
    }
  }

  console.log(
    `\n[seed] Done!\n  Created: ${created}\n  Skipped (already existed): ${skipped}\n  Failed: ${failed}\n`
  );
  console.log(
    "[seed] All items saved as DRAFT. Go to Admin → Content to review and publish."
  );

  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] Fatal error:", err.message);
  process.exit(1);
});
