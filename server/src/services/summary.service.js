/**
 * Auto-Summary Generator (template-based).
 *
 * Given the metadata an admin submits for a piece of content, this
 * produces:
 *   - a short website description
 *   - a shorter, social-media-ready caption
 *
 * This is intentionally simple (string templates, no external calls)
 * so it works out of the box in a hackathon build. To upgrade to an
 * AI-generated summary later, replace the body of `generateSummary`
 * with a call to an LLM API and keep the same return shape.
 */
function generateSummary({ title, category, expeditionName, tags = [], notes = "" }) {
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

module.exports = { generateSummary };
