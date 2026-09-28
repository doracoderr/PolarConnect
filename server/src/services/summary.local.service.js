/**
 * Local, offline Auto-Summary Generator — no Gemini/OpenAI/Ollama, no API key.
 * Runs entirely inside Node.js via @huggingface/transformers (ONNX models,
 * downloaded/cached on first use).
 *
 * Pipeline per media type:
 *   image    -> caption model (BLIP) + optional OCR    -> summarizer
 *   document -> pdf-parse / mammoth text extraction    -> summarizer
 *   video    -> ffmpeg (frame + audio) -> caption + whisper -> summarizer
 *
 * Same input/output shape as summary.service.js, so it's a drop-in swap:
 *   generateSummaryLocal({ title, category, expeditionName, tags, notes, mediaUrl, mediaType })
 *     -> { description, socialCaption }
 *
 * Requirements:
 *   npm install @huggingface/transformers pdf-parse mammoth wavefile
 *   system: ffmpeg on PATH
 *
 * Optional (recommended for diagrams/infographics/text-overlay images —
 * e.g. labeled composite photos):
 *   npm install tesseract.js
 * Without it, images with on-image text just get a caption, no OCR text.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const T = require("./summaryText");

let _pipelinePromise = null;
function transformers() {
  // Transformers.js is ESM-only; dynamic import from CommonJS.
  if (!_pipelinePromise) {
    _pipelinePromise = import("@huggingface/transformers").then((mod) => {
      // Persist downloaded model weights across restarts, same idea as node_modules.
      mod.env.cacheDir = require("path").join(__dirname, "../../.model-cache/");
      return mod;
    });
  }
  return _pipelinePromise;
}

const MODELS = {
  // Kept as vit-gpt2 by default: it's already downloaded in .model-cache/
  // (see the zip you shared), so it works fully offline with zero network
  // dependency. BLIP gives better captions for diagrams/composites but
  // requires a first-time download from huggingface.co — if that's blocked
  // on your network (proxy/firewall/ISP), it fails with "Unauthorized
  // access to file". Once you confirm you can reach huggingface.co, switch
  // via CAPTION_MODEL=Xenova/blip-image-captioning-base in .env.
  caption: process.env.CAPTION_MODEL || "Xenova/vit-gpt2-image-captioning",
  summarizer: "Xenova/distilbart-cnn-6-6",
  asr: "Xenova/whisper-tiny.en",
  // English -> Hindi MT model. Same offline/no-API-key story as the rest of
  // this file; downloads once (~300MB) and is cached in .model-cache/.
  // Default is small and light but weak on technical text. For clearly better
  // Hindi set TRANSLATION_MODEL=Xenova/nllb-200-distilled-600M in .env
  // (one-time ~600MB download, cached in .model-cache/).
  translatorEnHi: process.env.TRANSLATION_MODEL || "Xenova/opus-mt-en-hi",
};
const IS_NLLB = /nllb/i.test(MODELS.translatorEnHi);

// Generic phrases vit-gpt2/BLIP fall back to when they don't know what
// they're looking at. A caption that is ONLY this (nothing else useful)
// is worse than no caption.
const GENERIC_CAPTION_PATTERNS = [
  /^an? (picture|photo|image) of an? (clock|screen|television|tv|sign)$/i,
  /^an? (close(-| )up of )?an? (black and white|blurry) (photo|image)/i,
  /^an? group of people/i,
];

/**
 * vit-gpt2/BLIP occasionally degenerate into runaway repetition on
 * out-of-distribution images ("a a a a a" or "eclipse eclipse eclipse
 * eclipse ..."). Collapse any word or short phrase repeated 3+ times in a
 * row down to a single occurrence.
 */
function collapseRepeats(text) {
  if (!text) return text;
  // Collapse repeated single words: "black black black" -> "black"
  let out = text.replace(/\b(\w+)(\s+\1\b){2,}/gi, "$1");
  // Collapse repeated 2-3 word phrases: "a photo of a photo of" -> "a photo of"
  out = out.replace(/\b((?:\w+\s+){1,3}?\w+)(\s+\1\b){2,}/gi, "$1");
  return out.trim();
}

/**
 * Heuristic filter for captions that are technically well-formed but
 * useless: too short, purely generic, mostly-literal repetition, or —
 * vit-gpt2's most common failure on out-of-distribution images — a
 * self-referential loop that REPHRASES the same few words instead of
 * repeating them verbatim (e.g. "a close up of a close up picture of a
 * person is a close-up of a picture of the person"). Exact-repeat
 * collapsing alone misses that pattern, so we also check vocabulary
 * diversity: a real caption uses mostly distinct words; a degenerate one
 * keeps reusing the same small word set.
 */
function isLowQualityCaption(caption) {
  if (!caption) return true;
  const words = caption.trim().split(/\s+/);
  if (words.length < 3) return true;
  if (GENERIC_CAPTION_PATTERNS.some((re) => re.test(caption.trim()))) return true;

  // If collapsing exact repeats shrank the caption by more than a third,
  // the raw output was dominated by literal repetition -> unreliable.
  const collapsed = collapseRepeats(caption);
  if (collapsed.length < caption.length * 0.66) return true;

  // Vocabulary-diversity check: catches rephrased/reordered self-repetition
  // that collapseRepeats can't, since the words aren't literally adjacent
  // duplicates. Normal captions score high (most words distinct); looping
  // captions score low (same handful of words reused).
  const normalized = words.map((w) => w.toLowerCase().replace(/[^\w'-]/g, "")).filter(Boolean);
  const uniqueRatio = new Set(normalized).size / normalized.length;
  if (uniqueRatio < 0.6) return true;

  return false;
}

let _captioner, _summarizer, _transcriber, _translatorEnHi;

async function getCaptioner() {
  if (!_captioner) {
    const { pipeline } = await transformers();
    _captioner = await pipeline("image-to-text", MODELS.caption);
  }
  return _captioner;
}

async function getSummarizer() {
  if (!_summarizer) {
    const { pipeline } = await transformers();
    _summarizer = await pipeline("summarization", MODELS.summarizer);
  }
  return _summarizer;
}

async function getTranscriber() {
  if (!_transcriber) {
    const { pipeline } = await transformers();
    _transcriber = await pipeline("automatic-speech-recognition", MODELS.asr);
  }
  return _transcriber;
}

async function getTranslatorEnHi() {
  if (!_translatorEnHi) {
    const { pipeline } = await transformers();
    _translatorEnHi = await pipeline(
      "translation",
      MODELS.translatorEnHi,
      IS_NLLB ? { dtype: "q8" } : undefined // NLLB in fp32 is ~2.4GB; q8 is ~4x smaller
    );
  }
  return _translatorEnHi;
}

// If the model can't be loaded (e.g. Windows "system error number 13" =
// antivirus/OneDrive locking the .onnx file) don't retry on every upload.
let _translatorDisabledUntil = 0;

function noteTranslatorFailure(err) {
  _translatorDisabledUntil = Date.now() + 5 * 60 * 1000;
  const msg = err && err.message ? err.message : String(err);
  console.log(`[localSummary] Hindi model unavailable, skipping for 5 min: ${msg}`);
  if (/error number 13|EACCES|EPERM/i.test(msg)) {
    console.log(
      "[localSummary] hint: the OS is blocking the model file. Stop the server, delete server/.model-cache, " +
        "exclude the project folder from antivirus/OneDrive, then start again."
    );
  }
}

/**
 * Translate ONE English chunk (a few sentences) to Hindi, sentence by
 * sentence, and keep only sentences that pass sanity checks. Returns "" if
 * too little of it is trustworthy — callers then show the English text
 * instead of wrong Hindi.
 */
async function translateCore(text) {
  const sentences = T.splitSentences(text);
  if (!sentences.length) return "";

  let translator;
  try {
    translator = await getTranslatorEnHi();
  } catch (err) {
    noteTranslatorFailure(err);
    return "";
  }

  const kept = [];
  for (const sentence of sentences) {
    try {
      const opts = { max_new_tokens: 200, no_repeat_ngram_size: 3, repetition_penalty: 1.15, num_beams: 3 };
      if (IS_NLLB) Object.assign(opts, { src_lang: "eng_Latn", tgt_lang: "hin_Deva" });
      const out = await translator(sentence, opts);
      const hi = out?.[0]?.translation_text?.trim() || "";
      if (T.isGoodHindi(sentence, hi)) kept.push(hi);
      else console.log(`[localSummary] rejected bad Hindi for: "${sentence.slice(0, 60)}"`);
    } catch (err) {
      console.log(`[localSummary] translate failed for one sentence: ${err.message}`);
    }
  }
  return kept.length / sentences.length >= 0.6 ? kept.join(" ") : "";
}

/**
 * English -> Hindi for a description or a social caption. Offline, best
 * effort, never returns garbage: on any doubt returns "" so the API falls
 * back to the English text.
 *
 * ctx (optional, for captions): { title, category } — the title is kept as
 * the admin typed it (proper noun) and only the hook sentence is translated;
 * if that can't be translated safely a correct template line is used.
 */
async function translateToHindi(text, ctx = {}) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";

  const { lead, core, tags } = T.splitCaption(trimmed);
  const disabled = Date.now() < _translatorDisabledUntil;

  let title = ctx.title ? String(ctx.title).trim() : "";
  let hook = core;
  if (title && core.toLowerCase().startsWith(title.toLowerCase())) {
    hook = core.slice(title.length).replace(/^\s*[—–-]\s*/, "").trim();
  } else {
    title = "";
  }

  const hookHi = !disabled && hook ? await translateCore(hook) : "";

  if (title) {
    const catHi = T.CATEGORY_HI[ctx.category] ? `${T.CATEGORY_HI[ctx.category]} अभियान` : "";
    const tail = hookHi || catHi;
    return [lead, title, tail ? `— ${tail}` : "", tags].filter(Boolean).join(" ");
  }
  if (!hookHi) return "";
  return [lead, hookHi, tags].filter(Boolean).join(" ");
}

function templateFallback({ title, category, expeditionName, tags = [], notes = "" }) {
  const region = category && category !== "General" ? category : "polar research";
  const description =
    `${title} is a record on ${region} from NCPOR` +
    (expeditionName ? ` (${expeditionName})` : "") +
    "." +
    (notes && notes.trim() ? ` ${T.tidySentence(notes.trim())}` : "");
  return { description, socialCaption: buildSocialCaption(description, title, tags, category) };
}

const EXT_BY_CONTENT_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

async function downloadToTemp(url, extHint) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Trust the real content-type over a guessed extension, so a file saved
  // with the wrong extension doesn't confuse downstream tools.
  const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
  const ext = EXT_BY_CONTENT_TYPE[contentType] || extHint;

  const filePath = path.join(os.tmpdir(), `pc_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  fs.writeFileSync(filePath, buf);
  console.log(`[localSummary] downloaded ${url.split("?")[0]} as ${contentType || "unknown type"} -> ${filePath}`);
  return filePath;
}

async function normalizeImageForCaption(imagePath) {
  let sharp;
  try {
    sharp = require("sharp");
  } catch (_) {
    return imagePath; // sharp not installed directly; let the captioner try the raw file
  }

  const normalizedPath = imagePath.replace(path.extname(imagePath), "_norm.png");
  try {
    await sharp(imagePath).rotate().png().toFile(normalizedPath);
    return normalizedPath;
  } catch (err) {
    throw new Error(
      `image decode failed for ${path.basename(imagePath)}: ${err.message} ` +
        `(likely an unsupported format like HEIC/AVIF/SVG)`
    );
  }
}

function safeUnlink(...paths) {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    } catch (_) {
      // ignore cleanup errors
    }
  }
}

async function extractPdfText(filePath) {
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(fs.readFileSync(filePath));
  return data.text || "";
}

async function extractDocxText(filePath) {
  const mammoth = require("mammoth");
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value || "";
}

function extractAudio(videoPath) {
  const audioPath = videoPath.replace(path.extname(videoPath), ".wav");
  execSync(`ffmpeg -y -i "${videoPath}" -ar 16000 -ac 1 -vn "${audioPath}"`, { stdio: "ignore" });
  return audioPath;
}

function extractFrame(videoPath) {
  const framePath = videoPath.replace(path.extname(videoPath), "_frame.jpg");
  execSync(`ffmpeg -y -ss 00:00:02 -i "${videoPath}" -vframes 1 "${framePath}"`, { stdio: "ignore" });
  return framePath;
}

async function readWavSamples(audioPath) {
  const { WaveFile } = require("wavefile");
  const wav = new WaveFile(fs.readFileSync(audioPath));
  wav.toBitDepth("32f");
  wav.toSampleRate(16000);
  let samples = wav.getSamples();
  return Array.isArray(samples) ? samples[0] : samples; // mono channel
}

async function captionImage(imagePath) {
  let normalizedPath = imagePath;
  try {
    normalizedPath = await normalizeImageForCaption(imagePath);
    const captioner = await getCaptioner();
    const out = await captioner(normalizedPath);
    const raw = out?.[0]?.generated_text?.trim() || "";
    const cleaned = collapseRepeats(raw);
    if (isLowQualityCaption(cleaned)) {
      console.log(`[localSummary] discarding low-quality caption: "${raw}"`);
      return "";
    }
    return cleaned;
  } catch (err) {
    // Never let a caption-model failure (network, download, OOM, etc.) take
    // down the whole summary — OCR + metadata can still produce something
    // useful. This also matters for getMediaContentText's Promise.all: if
    // this threw, it used to reject the pair immediately and the outer
    // finally would delete the temp file out from under the still-running
    // OCR call.
    console.log(`[localSummary] caption failed, continuing without it: ${err.message}`);
    return "";
  } finally {
    if (normalizedPath !== imagePath) safeUnlink(normalizedPath);
  }
}

/**
 * Optional OCR pass for text baked into the image itself (labels, captions,
 * slide-style overlays — e.g. "Partial Eclipse / Annular Eclipse / Total
 * Eclipse"). A caption model alone can't read this text; OCR fills that gap
 * and is often more reliable than the caption for diagram/infographic-style
 * uploads. Fully optional: falls back silently if tesseract.js isn't
 * installed (npm install tesseract.js to enable it).
 */
async function ocrImage(imagePath) {
  let Tesseract;
  try {
    Tesseract = require("tesseract.js");
  } catch (_) {
    console.log("[localSummary] tesseract.js not installed — skipping OCR (npm install tesseract.js to enable)");
    return ""; // OCR not installed — not fatal, caption/metadata still work
  }
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imagePath, "eng");
    return (text || "")
      .replace(/\s+/g, " ")
      .trim();
  } catch (err) {
    console.log(`[localSummary] OCR failed, continuing without it: ${err.message}`);
    return "";
  }
}

async function transcribeAudio(audioPath) {
  const transcriber = await getTranscriber();
  const samples = await readWavSamples(audioPath);
  const out = await transcriber(samples);
  return out?.text?.trim() || "";
}

function lowerFirst(t) {
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

function article(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/**
 * Turn raw extracted text into a short, correct description.
 *
 *  1. Clean it (wrapped lines, bullets, footers, page numbers, duplicates).
 *  2. Build an extractive summary = the most informative REAL sentences.
 *  3. For longer text, also ask the abstractive model — but only on a
 *     condensed input, with anti-repetition settings, and only accept the
 *     result if it passes the faithfulness check. Otherwise use (2).
 *
 * `notes` (admin-written context) is treated as a high-priority sentence.
 */
async function summarizeContent(rawText, notes = "") {
  const items = T.cleanToItems(rawText);
  if (notes && notes.trim()) items.unshift({ text: notes.trim(), boost: 2 });

  const plain = items.map((i) => (typeof i === "string" ? i : i.text)).join(" ");
  if (plain.length < 25) return "";

  const extractive = T.extractiveSummary(items, { maxChars: 380, maxSentences: 3 });
  if (plain.length <= 420) return extractive; // already short — nothing to compress

  const condensed = T.extractiveSummary(items, { maxChars: 1400, maxSentences: 12 });
  try {
    const summarizer = await getSummarizer();
    const out = await summarizer(condensed, {
      max_length: 90,
      min_length: 25,
      num_beams: 2,
      no_repeat_ngram_size: 3,
      repetition_penalty: 1.3,
    });
    const abstractive = out?.[0]?.summary_text?.trim() || "";
    if (abstractive && T.isFaithfulSummary(abstractive, plain)) {
      return T.tidySentence(abstractive);
    }
    console.log(`[localSummary] discarding unreliable model summary, using extractive: "${abstractive.slice(0, 120)}"`);
  } catch (err) {
    console.log(`[localSummary] summarizer unavailable, using extractive: ${err.message}`);
  }
  return extractive;
}

function buildSocialCaption(description, title, tags, category) {
  return T.buildEnglishCaption({ description, title, tags, category });
}

async function getMediaContentText({ mediaUrl, mediaType }) {
  if (!mediaUrl) return "";

  if (mediaType === "image") {
    const imgPath = await downloadToTemp(mediaUrl, ".jpg");
    try {
      const [caption, ocrText] = await Promise.all([captionImage(imgPath), ocrImage(imgPath)]);
      // OCR text (real words the model can't guess, e.g. on-image labels)
      // is more trustworthy than a caption guess, so lead with it when
      // present — but OCR on ordinary photos is often junk, so only keep it
      // if it reads like real words.
      const ocr = T.looksLikeRealText(ocrText) ? ocrText.replace(/\s+/g, " ").trim() : "";
      const seen = caption ? `Photograph showing ${lowerFirst(caption.replace(/[.\s]+$/, ""))}.` : "";
      return [ocr && T.tidySentence(ocr), seen].filter(Boolean).join(" ");
    } finally {
      safeUnlink(imgPath);
    }
  }

  if (mediaType === "document") {
    const isDocx = mediaUrl.toLowerCase().split("?")[0].endsWith(".docx");
    const filePath = await downloadToTemp(mediaUrl, isDocx ? ".docx" : ".pdf");
    try {
      return isDocx ? await extractDocxText(filePath) : await extractPdfText(filePath);
    } finally {
      safeUnlink(filePath);
    }
  }

  if (mediaType === "video") {
    const videoPath = await downloadToTemp(mediaUrl, ".mp4");
    let audioPath, framePath;
    try {
      audioPath = extractAudio(videoPath);
      framePath = extractFrame(videoPath);
      const [transcript, frameCaption] = await Promise.all([
        transcribeAudio(audioPath),
        captionImage(framePath),
      ]);
      const seen = frameCaption ? `Video showing ${lowerFirst(frameCaption.replace(/[.\s]+$/, ""))}.` : "";
      const spoken = T.isUsableTranscript(transcript) ? transcript : "";
      return [seen, spoken].filter(Boolean).join(" ");
    } finally {
      safeUnlink(videoPath, audioPath, framePath);
    }
  }

  return "";
}

async function generateSummaryLocal({ title, category, contentType, expeditionName, tags = [], notes = "", mediaUrl, mediaType }) {
  try {
    const contentText = await getMediaContentText({ mediaUrl, mediaType });
    let description = contentText ? await summarizeContent(contentText, notes) : "";

    // Nothing usable in the file itself (scanned PDF, silent video, blurry
    // photo...): describe it from the metadata the admin typed instead.
    if (!description || description.length < 25) {
      const kind = (contentType || "record").toLowerCase();
      const region = category && category !== "General" ? category : "polar research";
      description =
        `${title} is ${article(kind)} ${kind} on ${region}` +
        (expeditionName ? ` (${expeditionName})` : "") +
        " from NCPOR." +
        (notes && notes.trim() ? ` ${T.tidySentence(notes.trim())}` : "");
    }

    return {
      description,
      socialCaption: buildSocialCaption(description, title, tags, category),
    };
  } catch (err) {
    console.error("[localSummary] pipeline failed, using template fallback:", err.message);
    return templateFallback({ title, category, expeditionName, tags, notes });
  }
}

module.exports = { generateSummaryLocal, translateToHindi };