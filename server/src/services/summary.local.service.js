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
};

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

let _captioner, _summarizer, _transcriber;

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

function templateFallback({ title, category, expeditionName, tags = [], notes = "" }) {
  const place = expeditionName || category;
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

function chunkText(text, size = 3000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks.length ? chunks : [""];
}

async function summarizeText(text, maxLength = 100) {
  const trimmed = (text || "").trim();
  if (trimmed.length < 40) return trimmed;

  const summarizer = await getSummarizer();
  const chunks = chunkText(trimmed);
  const partials = [];

  for (const chunk of chunks) {
    if (chunk.trim().length < 20) continue;
    const out = await summarizer(chunk, { max_length: maxLength, min_length: 20 });
    partials.push(out?.[0]?.summary_text?.trim() || "");
  }

  return partials.join(" ").trim() || trimmed.slice(0, 300);
}

function buildSocialCaption(description, title, tags) {
  const firstSentence = description.split(/(?<=[.!?])\s/)[0] || title;
  const hashtag = tags?.[0] ? `#${tags[0].replace(/\s+/g, "")}` : "#NCPOR";
  const caption = `🧊 ${firstSentence}`;
  return (caption.length > 180 ? caption.slice(0, 177) + "..." : caption) + ` ${hashtag}`;
}

async function getMediaContentText({ mediaUrl, mediaType }) {
  if (!mediaUrl) return "";

  if (mediaType === "image") {
    const imgPath = await downloadToTemp(mediaUrl, ".jpg");
    try {
      const [caption, ocrText] = await Promise.all([captionImage(imgPath), ocrImage(imgPath)]);
      // OCR text (real words the model can't guess, e.g. on-image labels)
      // is more trustworthy than a caption guess, so lead with it when present.
      return [ocrText, caption].filter(Boolean).join(". ");
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
      return `Visual: ${frameCaption}. Spoken content: ${transcript}`;
    } finally {
      safeUnlink(videoPath, audioPath, framePath);
    }
  }

  return "";
}

async function generateSummaryLocal({ title, category, expeditionName, tags = [], notes = "", mediaUrl, mediaType }) {
  try {
    const contentText = await getMediaContentText({ mediaUrl, mediaType });

    const metaText = `${title} is a ${category} expedition record` +
      (expeditionName ? ` from ${expeditionName}` : "") +
      (notes ? `. ${notes.trim()}` : "") + ".";

    const fullText = `${metaText} ${contentText}`.trim();
    const description = await summarizeText(fullText, 110);
    const finalDescription = description || metaText;

    return {
      description: finalDescription,
      socialCaption: buildSocialCaption(finalDescription, title, tags),
    };
  } catch (err) {
    console.error("[localSummary] pipeline failed, using template fallback:", err.message);
    return templateFallback({ title, category, expeditionName, tags, notes });
  }
}

module.exports = { generateSummaryLocal };