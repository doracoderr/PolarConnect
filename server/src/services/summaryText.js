/**
 * Model-free text helpers used by summary.local.service.js.
 *
 * Why this file exists: the small on-device models (distilbart for English
 * summaries, opus-mt for Hindi) produce fluent-looking nonsense when they get
 * messy input such as text pulled out of a slide deck. Everything here is
 * plain JavaScript so we can
 *   1. clean the extracted text before any model sees it,
 *   2. build a reliable EXTRACTIVE summary (real sentences from the document),
 *   3. check a model's output and throw it away if it is garbage,
 *   4. do the same sanity checks on Hindi translations,
 * and fall back to something correct instead of publishing junk.
 */

const STOPWORDS = new Set(
  ("a an the and or but if then else of to in on at by for with from as is are was were be been being " +
    "this that these those it its into over under about across per via not no yes we our you your they their " +
    "he she his her them us can will would should could may might must do does did done have has had having " +
    "also more most such than too very just only each every any all some other another").split(/\s+/)
);

const CATEGORY_HI = {
  Antarctica: "अंटार्कटिका",
  Arctic: "आर्कटिक",
  Himalaya: "हिमालय",
  General: "ध्रुवीय अनुसंधान",
};

// ------------------------------------------------------------------ cleaning

const BULLET_ONLY = /^[\s\u2022\u25CF\u25AA\u25A0\u25E6\u2023\u2043\u2219\-*–—>»▪•●◦]+$/;
const BULLET_START = /^[\u2022\u25CF\u25AA\u25A0\u25E6\u2023\u2043\u2219*▪•●◦]\s*/;
const BOILERPLATE = [
  /^\d*\s*@?\s*SIH Idea submission/i,
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^\d{1,3}$/,
  /^(https?:\/\/|www\.)\S+$/i,
  /^slide\s+\d+$/i,
];

function normalizeRaw(raw) {
  return String(raw || "")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[\uFB00-\uFB06]/g, (c) => ({ "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl", "\uFB03": "ffi", "\uFB04": "ffl", "\uFB05": "st", "\uFB06": "st" }[c]))
    .replace(/[ \t]+/g, " ");
}

function isHeading(text) {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  const words = text.split(/\s+/).length;
  return upper / letters.length > 0.8 && words <= 8;
}

/**
 * Turn raw extracted text (PDF/DOCX/OCR) into a list of clean "items"
 * (one bullet / sentence-ish unit each). Handles hard-wrapped lines, bullet
 * glyphs sitting on their own line, repeated headers/footers and page numbers.
 */
function cleanToItems(raw) {
  const lines = normalizeRaw(raw).split("\n").map((l) => l.trim());
  const items = [];
  let buf = "";
  let forceNew = true;

  const flush = () => {
    const t = buf.replace(/\s+/g, " ").trim();
    if (t) items.push(t);
    buf = "";
  };

  for (let line of lines) {
    if (!line) {
      flush();
      forceNew = true;
      continue;
    }
    if (BULLET_ONLY.test(line)) {
      flush();
      forceNew = true;
      continue;
    }
    if (BOILERPLATE.some((re) => re.test(line))) continue;

    // A page number glued to a footer: "2@SIH Idea submission- Template"
    line = line.replace(/\d*\s*@SIH Idea submission-?\s*Template/gi, "").trim();
    if (!line) continue;

    const startsBullet = BULLET_START.test(line);
    line = line.replace(BULLET_START, "");

    const prevEnded = /[.!?:;]$/.test(buf);
    if (startsBullet || forceNew || prevEnded || isHeading(line) || (buf && isHeading(buf))) {
      flush();
    }
    buf = buf ? `${buf} ${line}` : line;
    forceNew = false;
  }
  flush();

  // De-duplicate (headers repeat on every slide/page).
  const seen = new Set();
  return items.filter((t) => {
    const key = t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (key.length < 3 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitSentences(item) {
  return item
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------- extractive

function contentWords(text) {
  return (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).filter((w) => !STOPWORDS.has(w));
}

function tidySentence(s) {
  let t = s.replace(/\s+/g, " ").trim().replace(/[;:,\-–—\s]+$/, "");
  if (!t) return "";
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

function cutAtWord(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:\-–—\s]+$/, "") + "…";
}

/**
 * Pick the most informative real sentences from the document, keep them in
 * their original order. Output is always grammatical because it is the
 * author's own wording.
 *
 * items: array of strings or { text, boost } (boost > 1 favours that item,
 *        used for admin-supplied notes).
 */
function extractiveSummary(items, { maxChars = 380, maxSentences = 3 } = {}) {
  const sentences = [];
  items.forEach((it, itemIdx) => {
    const text = typeof it === "string" ? it : it.text;
    const boost = typeof it === "string" ? 1 : it.boost || 1;
    if (isHeading(text)) return; // headings are titles, not summary material
    splitSentences(text).forEach((s) => sentences.push({ s, itemIdx, boost, order: sentences.length }));
  });
  if (!sentences.length) return "";

  const tf = new Map();
  sentences.forEach(({ s }) => contentWords(s).forEach((w) => tf.set(w, (tf.get(w) || 0) + 1)));

  const n = sentences.length;
  const scored = sentences.map((o) => {
    const words = o.s.split(/\s+/);
    const cw = contentWords(o.s);
    if (!cw.length) return { ...o, score: 0 };
    let score = cw.reduce((a, w) => a + (tf.get(w) || 0), 0) / cw.length; // avg word importance
    score *= 1 + 0.3 * (1 - o.order / n); // mild lead bias
    if (words.length < 6) score *= 0.3;
    else if (words.length > 45) score *= 0.6;
    if (/https?:\/\/|www\./i.test(o.s)) score *= 0.2;
    if (/@/.test(o.s)) score *= 0.3;
    const digits = (o.s.match(/\d/g) || []).length;
    if (digits / o.s.length > 0.25) score *= 0.4;
    if (/^(team|problem statement|theme|ps category)\b/i.test(o.s)) score *= 0.2;
    return { ...o, score: score * o.boost };
  });

  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const chosen = [];
  let total = 0;
  for (const c of ranked) {
    if (c.score <= 0) break;
    const len = c.s.length + 1;
    if (chosen.length && total + len > maxChars) continue;
    chosen.push(c);
    total += len;
    if (chosen.length >= maxSentences) break;
  }
  chosen.sort((a, b) => a.order - b.order);
  return cutAtWord(chosen.map((c) => tidySentence(c.s)).join(" "), maxChars);
}

// -------------------------------------------------------- English quality gate

function tokens(text) {
  return (String(text || "").toLowerCase().match(/[a-z][a-z'-]*/g) || []);
}

function hasRepeatedNgram(words, n) {
  const seen = new Set();
  for (let i = 0; i + n <= words.length; i++) {
    const g = words.slice(i, i + n).join(" ");
    if (seen.has(g)) return true;
    seen.add(g);
  }
  return false;
}

function inSource(word, sourceSet, sourceStems) {
  if (sourceSet.has(word)) return true;
  return word.length >= 5 && sourceStems.has(word.slice(0, 5));
}

/**
 * Is a model-written summary trustworthy? Rejects looping/repetitive text,
 * glued nonsense words ("expeditionrecord") and anything that talks about
 * things that are not in the source document.
 */
function isFaithfulSummary(summary, source) {
  const words = tokens(summary);
  if (words.length < 6) return false;
  if (new Set(words).size / words.length < 0.55) return false;
  if (hasRepeatedNgram(words, 3)) return false;

  const src = tokens(source);
  const srcSet = new Set(src);
  const srcStems = new Set(src.filter((w) => w.length >= 5).map((w) => w.slice(0, 5)));
  const content = words.filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  if (!content.length) return false;
  const novel = content.filter((w) => !inSource(w, srcSet, srcStems));
  return novel.length / content.length <= 0.25;
}

// ------------------------------------------------------------- image / video

/** OCR on photos often returns junk. Keep it only if it reads like real words. */
function looksLikeRealText(text) {
  const toks = String(text || "").split(/\s+/).filter(Boolean);
  if (toks.length < 4) return false;
  const wordish = toks.filter((t) => /^[A-Za-z][A-Za-z'-]{2,}[.,;:!?]?$/.test(t)).length;
  return wordish / toks.length >= 0.6;
}

/** Whisper hallucinates short filler on silent clips. */
function isUsableTranscript(text) {
  const t = String(text || "").trim();
  if (t.length < 25) return false;
  if (/^\W*(\[.*?\]|\(.*?\)|you|thank you\.?|thanks for watching\.?)\W*$/i.test(t)) return false;
  return true;
}

// ------------------------------------------------------------ social caption

function hashtag(s) {
  return "#" + String(s).replace(/[^\p{L}\p{N}]+/gu, "");
}

function buildEnglishCaption({ description, title, tags = [], category }) {
  const first = (description || "").split(/(?<=[.!?])\s/)[0] || "";
  const hook = cutAtWord(first.replace(/[.!?…]+$/, ""), 120);
  const similar = hook.toLowerCase().includes(String(title).toLowerCase());
  const line = `🧊 ${title}` + (hook && !similar ? ` — ${hook}` : "");

  const tagSet = [];
  const add = (t) => {
    if (!t) return;
    const h = hashtag(t);
    if (h.length > 1 && !tagSet.some((x) => x.toLowerCase() === h.toLowerCase())) tagSet.push(h);
  };
  if (category && category !== "General") add(category);
  add(tags[0]);
  add("NCPOR");
  return `${line} ${tagSet.join(" ")}`.trim();
}

// ------------------------------------------------------------ Hindi checks

const DEVANAGARI = /[\u0900-\u097F]/g;

/**
 * Sanity-check one machine-translated Hindi sentence against its English
 * source. Catches the failure modes we have seen from the small MT model:
 * mangled names (Latin gibberish), loops, wrong length, not Hindi at all.
 */
function isGoodHindi(src, out) {
  const s = String(src || "").trim();
  const o = String(out || "").trim();
  if (!s || !o) return false;

  const dev = (o.match(DEVANAGARI) || []).length;
  const letters = (o.match(/[\p{L}]/gu) || []).length;
  if (!letters || dev / letters < 0.6) return false;

  // Latin words in the output must be copied from the source (names,
  // acronyms). Anything else is the model inventing "words".
  const srcLatin = new Set((s.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) || []));
  const outLatin = o.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) || [];
  if (outLatin.some((w) => !srcLatin.has(w))) return false;

  const ratio = o.length / s.length;
  if (ratio < 0.35 || ratio > 3.5) return false;

  const words = o.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    if (new Set(words).size / words.length < 0.5) return false;
    if (hasRepeatedNgram(words, 3)) return false;
    for (let i = 2; i < words.length; i++) {
      if (words[i] === words[i - 1] && words[i] === words[i - 2]) return false;
    }
  }
  return true;
}

/** "🧊 Core text #Tag1 #Tag2" -> { lead, core, tags } */
function splitCaption(text) {
  let t = String(text || "").trim();
  const tagMatch = t.match(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u);
  const tags = tagMatch ? tagMatch[0].trim() : "";
  if (tagMatch) t = t.slice(0, tagMatch.index).trim();
  const leadMatch = t.match(/^[^\p{L}\p{N}#]+/u);
  const lead = leadMatch ? leadMatch[0].trim() : "";
  const core = leadMatch ? t.slice(leadMatch[0].length).trim() : t;
  return { lead, core, tags };
}

module.exports = {
  CATEGORY_HI,
  cleanToItems,
  splitSentences,
  extractiveSummary,
  isFaithfulSummary,
  looksLikeRealText,
  isUsableTranscript,
  buildEnglishCaption,
  isGoodHindi,
  splitCaption,
  tidySentence,
  cutAtWord,
};
