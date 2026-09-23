/**
 * Auto-Summary Generator — powered by Google Gemini, content-aware.
 *
 * Given the metadata AND the actual uploaded file (mediaUrl/mediaType),
 * this produces:
 *   - a short website description
 *   - a shorter, social-media-ready caption
 *
 * For images and PDF documents, the file itself is downloaded from
 * Cloudinary and sent to Gemini (multimodal input), so the summary is
 * based on what's actually in the photo / report — not just the title
 * and tags the admin typed in. Videos and oversized files fall back to
 * a metadata-only prompt (no inline video analysis, to keep this fast
 * and within Gemini's inline-request size limits).
 *
 * Uses plain `fetch` (Node 18+ built-in) — no extra dependency needed.
 * If GEMINI_API_KEY is missing or anything fails, it falls back to a
 * simple offline template so uploads never break because of an API or
 * network hiccup.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Gemini inline (non-File-API) requests should stay well under ~20MB base64.
// We cap the raw download at 15MB to leave headroom after base64 encoding.
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

function templateFallback({ title, category, expeditionName, tags = [], notes = "" }) {
  const place = expeditionName ? expeditionName : category;
  const tagText = tags.length ? ` Tags: ${tags.join(", ")}.` : "";
  const noteText = notes ? ` ${notes.trim()}` : "";

  const description =
    `${title} — a ${category} expedition record from NCPOR` +
    (expeditionName ? ` (${expeditionName})` : "") +
    `.${noteText}${tagText}`.trim();

  const socialCaption =
    `🧊 ${title} | ${place} expedition — NCPOR Polar Science Portal` +
    (tags.length ? ` #${tags[0].replace(/\s+/g, "")}` : "");

  return { description, socialCaption };
}

/** Downloads the media file and returns { base64, mimeType } or null if it can't/shouldn't be inlined. */
async function fetchAsInlineData(mediaUrl, mediaType) {
  if (mediaType !== "image" && mediaType !== "document") return null; // skip video/other

  try {
    const res = await fetch(mediaUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);

    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_INLINE_BYTES) {
      console.warn(`[summary] media too large to inline (${contentLength} bytes) — skipping content analysis`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_INLINE_BYTES) {
      console.warn(`[summary] media too large to inline (${arrayBuffer.byteLength} bytes) — skipping content analysis`);
      return null;
    }

    let mimeType = res.headers.get("content-type") || "";
    if (!mimeType || mimeType === "application/octet-stream") {
      // Cloudinary URLs usually carry the right content-type, but fall back
      // to a guess from the extension if the header is missing/generic.
      mimeType = mediaType === "document" ? "application/pdf" : "image/jpeg";
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return { base64, mimeType };
  } catch (err) {
    console.error("[summary] could not download media for content analysis:", err.message);
    return null;
  }
}

async function generateSummary({ title, category, expeditionName, tags = [], notes = "", mediaUrl, mediaType }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[summary] GEMINI_API_KEY not set — using template fallback.");
    return templateFallback({ title, category, expeditionName, tags, notes });
  }

  const metaBlock = `- Title: ${title}
- Category: ${category}
- Expedition: ${expeditionName || "N/A"}
- Tags: ${tags.join(", ") || "none"}
- Admin notes: ${notes || "none"}
- Media type: ${mediaType || "unknown"}`;

  const inline = mediaUrl ? await fetchAsInlineData(mediaUrl, mediaType) : null;

  const basePrompt = `You are writing metadata for a public science-outreach portal run by NCPOR (India's National Centre for Polar and Ocean Research).`;

  const promptWithMedia = `${basePrompt}

Here is the uploaded ${mediaType === "document" ? "expedition report / document" : "photo"}, along with the metadata the admin entered:

${metaBlock}

Look at the actual content of the attached file (${mediaType === "document" ? "read the report — its findings, location, expedition, key data" : "what's visible in the photo — subject, setting, activity"}) and use it, together with the metadata above, to write:
1. "description": a factual, engaging 2-3 sentence description for the public content page (plain text, no markdown), grounded in what the file actually shows/says — not just the title.
2. "socialCaption": a short, catchy caption (under 200 characters) suitable for social media, including 1-2 relevant hashtags.

Respond with ONLY valid JSON in this exact shape, no extra text, no markdown fences:
{"description": "...", "socialCaption": "..."}`;

  const promptMetaOnly = `${basePrompt}

Given this expedition content upload (no file content available to analyze — base this only on the metadata):

${metaBlock}

Write:
1. "description": a factual, engaging 2-3 sentence description for the public content page (plain text, no markdown).
2. "socialCaption": a short, catchy caption (under 200 characters) suitable for social media, including 1-2 relevant hashtags.

Respond with ONLY valid JSON in this exact shape, no extra text, no markdown fences:
{"description": "...", "socialCaption": "..."}`;

  const parts = inline
    ? [{ text: promptWithMedia }, { inline_data: { mime_type: inline.mimeType, data: inline.base64 } }]
    : [{ text: promptMetaOnly }];

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Gemini API ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Gemini API returned no text");

    let cleaned = rawText.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Gemini sometimes wraps the JSON in a sentence despite instructions —
      // pull out just the { ... } block and try again before giving up.
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("[summary] raw Gemini text that failed to parse:", cleaned.slice(0, 300));
        throw parseErr;
      }
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.description || !parsed.socialCaption) {
      throw new Error("Gemini API response missing expected fields");
    }

    return { description: parsed.description, socialCaption: parsed.socialCaption };
  } catch (err) {
    console.error("[summary] Gemini generation failed, using template fallback:", err.message);
    return templateFallback({ title, category, expeditionName, tags, notes });
  }
}

module.exports = { generateSummary };
