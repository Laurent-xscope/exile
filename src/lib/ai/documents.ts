import zlib from "node:zlib";
import { transcribeImagesWithVision } from "./vision";

/** Server-side text extraction for uploaded study material. */

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_SOURCE_CHARS = 60_000;

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "yaml",
  "yml",
  "html",
  "htm",
  "tex",
  "srt",
  "vtt",
  "log",
  "rtf",
  // Code files
  "py",
  "js",
  "ts",
  "jsx",
  "tsx",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "cs",
  "go",
  "rs",
  "php",
  "rb",
  "swift",
  "kt",
  "sql",
  "sh",
  "bash",
  "zsh",
  "css",
  "scss",
  "sass",
  "less",
  "toml",
  "ini",
  "cfg",
  "env",
]);

export interface UploadedFile {
  name: string;
  mimeType?: string;
  base64: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * Normalizes text while bounding the input length to avoid multi-megabyte string copies.
 */
function cleanText(input: string): string {
  if (!input) return "";
  const bounded =
    input.length > MAX_SOURCE_CHARS * 2
      ? input.slice(0, MAX_SOURCE_CHARS * 2)
      : input;

  return bounded
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeXmlEntities(str: string): string {
  return str.replace(/&(amp|lt|gt|quot|apos|#\d+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    const mapped = XML_ENTITIES[lower];
    if (mapped) return mapped;
    if (entity.charCodeAt(0) === 35 /* '#' */) {
      const code = parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCharCode(code);
    }
    return match;
  });
}

function stripXmlTags(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<(?:style|script)[\s\S]*?<\/(?:style|script)>/gi, " ")
      .replace(/<\/(?:p|div|h[1-6]|tr|li|slide|a:p|text:p|text:h)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractRtfText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\u([0-9]{2,5})\??/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\\([a-zA-Z]+)(-?[0-9]+)? ?/g, "")
    .replace(/[{}]/g, "")
    .trim();
}

function extractDocFallbackText(bytes: Buffer): string {
  // Bound string scanning to avoid huge string allocations for large binaries
  const scanLimit = Math.min(bytes.length, 512 * 1024);
  const latin1 = bytes.toString("latin1", 0, scanLimit);
  const asciiMatches =
    latin1.match(/[a-zA-Z0-9\s.,!?:;'"()\/\-_–—]{4,}/g) || [];

  const utf16 = bytes.toString("utf16le", 0, scanLimit);
  const utf16Matches =
    utf16.match(/[a-zA-Z0-9\s.,!?:;'"()\/\-_–—]{4,}/g) || [];

  const allRuns = [...asciiMatches, ...utf16Matches]
    .map((s) => s.trim())
    .filter((s) => s.length >= 4 && !/^[0-9a-fA-F]{8,}$/.test(s));

  return allRuns.join(" ");
}

/**
 * In-memory ZIP archive reader using Node.js built-in zlib for decompression.
 * Supports Office Open XML (.pptx, .xlsx), OpenDocument (.odt, .odp, .ods),
 * and EPUB archives.
 *
 * Accepts optional entryFilter to skip decompressing non-text/media files.
 */
function parseZipEntries(
  buf: Buffer,
  entryFilter?: (name: string) => boolean
): Map<string, Buffer> {
  const result = new Map<string, Buffer>();

  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const cdOffset = buf.readUInt32LE(eocdOffset + 16);
    let p = cdOffset;
    while (p < eocdOffset && buf.readUInt32LE(p) === 0x02014b50) {
      const method = buf.readUInt16LE(p + 10);
      const compSize = buf.readUInt32LE(p + 20);
      const nameLen = buf.readUInt16LE(p + 28);
      const extraLen = buf.readUInt16LE(p + 30);
      const commentLen = buf.readUInt16LE(p + 32);
      const localHdrOffset = buf.readUInt32LE(p + 42);
      const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

      // Skip entries not matching filter to avoid redundant decompression and buffer copying
      if (!entryFilter || entryFilter(name)) {
        const localNameLen = buf.readUInt16LE(localHdrOffset + 26);
        const localExtraLen = buf.readUInt16LE(localHdrOffset + 28);
        const dataStart = localHdrOffset + 30 + localNameLen + localExtraLen;
        const compData = buf.subarray(dataStart, dataStart + compSize);

        try {
          if (method === 0) {
            result.set(name, compData);
          } else if (method === 8) {
            result.set(name, zlib.inflateRawSync(compData));
          }
        } catch {
          // Skip corrupt entry
        }
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
  } else {
    // Fallback: iterate local file headers
    let offset = 0;
    while (offset < buf.length - 30) {
      if (buf.readUInt32LE(offset) !== 0x04034b50) {
        offset++;
        continue;
      }
      const method = buf.readUInt16LE(offset + 8);
      const compSize = buf.readUInt32LE(offset + 18);
      const nameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const name = buf.toString("utf8", offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      if (dataStart + compSize <= buf.length) {
        if (!entryFilter || entryFilter(name)) {
          const compData = buf.subarray(dataStart, dataStart + compSize);
          try {
            if (method === 0) {
              result.set(name, compData);
            } else if (method === 8) {
              result.set(name, zlib.inflateRawSync(compData));
            }
          } catch {}
        }
      }
      offset = dataStart + compSize;
    }
  }

  return result;
}

export class UnsupportedFileError extends Error {}

export async function extractText(file: UploadedFile): Promise<string> {
  const commaIdx = file.base64.indexOf(",");
  const base64Data =
    commaIdx !== -1 ? file.base64.slice(commaIdx + 1) : file.base64;

  if (!base64Data || base64Data.length === 0) {
    throw new UnsupportedFileError("Berkas kosong.");
  }

  // Fast pre-check: base64 payload length of >20MB decodes to >28MB string
  if (base64Data.length > (MAX_UPLOAD_BYTES * 4) / 3 + 1024) {
    throw new UnsupportedFileError("Berkas terlalu besar (maksimal 20 MB).");
  }

  const bytes = Buffer.from(base64Data, "base64");
  if (bytes.byteLength === 0) throw new UnsupportedFileError("Berkas kosong.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new UnsupportedFileError("Berkas terlalu besar (maksimal 20 MB).");
  }

  const ext = extensionOf(file.name);
  const mime = (file.mimeType || "").toLowerCase();
  let text = "";

  const isImage =
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(ext);

  if (isImage) {
    const effectiveMime =
      mime && mime.startsWith("image/")
        ? mime
        : ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

    try {
      text = await transcribeImagesWithVision([
        {
          base64: base64Data,
          mimeType: effectiveMime,
        },
      ]);
    } catch (err) {
      if (err instanceof UnsupportedFileError) throw err;
      throw new UnsupportedFileError(
        err instanceof Error
          ? `Gagal membaca gambar materi: ${err.message}`
          : "Gagal membaca teks dari gambar."
      );
    }
  } else if (ext === "pdf" || mime === "application/pdf") {
    try {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const result = await pdfText(pdf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("password") || msg.includes("encrypted")) {
        throw new UnsupportedFileError(
          "Berkas pdf dilindungi kata sandi. Harap buka kunci terlebih dahulu."
        );
      }
      throw new UnsupportedFileError(
        "Berkas pdf rusak atau strukturnya tidak valid. Pastikan berkas dapat dibuka secara normal."
      );
    }
  } else if (ext === "docx" || mime.includes("wordprocessingml")) {
    try {
      const { default: mammoth } = await import("mammoth");
      const out = await mammoth.extractRawText({ buffer: bytes });
      text = out.value;
    } catch {
      // Try fallback extractor
      text = extractDocFallbackText(bytes);
      if (!text) {
        throw new UnsupportedFileError(
          "Berkas docx rusak atau berformat lama (.doc). Simpan ulang ke format .docx standar atau .txt."
        );
      }
    }
  } else if (ext === "pptx" || mime.includes("presentationml")) {
    try {
      const entries = parseZipEntries(bytes, (name) =>
        (name.startsWith("ppt/slides/slide") || name.startsWith("ppt/notesSlides/notesSlide")) &&
        name.endsWith(".xml")
      );
      const textParts: string[] = [];
      let accumulatedLen = 0;
      for (const [, entryBuf] of entries.entries()) {
        const slideText = stripXmlTags(entryBuf.toString("utf8"));
        textParts.push(slideText);
        accumulatedLen += slideText.length;
        if (accumulatedLen >= MAX_SOURCE_CHARS * 2) break;
      }
      text = textParts.join("\n\n");
    } catch {
      throw new UnsupportedFileError("Berkas pptx tidak dapat diekstrak.");
    }
  } else if (ext === "xlsx" || mime.includes("spreadsheetml")) {
    try {
      const entries = parseZipEntries(bytes, (name) =>
        name === "xl/sharedStrings.xml" ||
        (name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml"))
      );
      const textParts: string[] = [];
      let accumulatedLen = 0;
      // Shared strings in xlsx
      const sharedStringsBuf = entries.get("xl/sharedStrings.xml");
      if (sharedStringsBuf) {
        const sharedText = stripXmlTags(sharedStringsBuf.toString("utf8"));
        textParts.push(sharedText);
        accumulatedLen += sharedText.length;
      }
      for (const [entryName, entryBuf] of entries.entries()) {
        if (accumulatedLen >= MAX_SOURCE_CHARS * 2) break;
        if (
          entryName.startsWith("xl/worksheets/sheet") &&
          entryName.endsWith(".xml")
        ) {
          const sheetText = stripXmlTags(entryBuf.toString("utf8"));
          textParts.push(sheetText);
          accumulatedLen += sheetText.length;
        }
      }
      text = textParts.join("\n\n");
    } catch {
      throw new UnsupportedFileError("Berkas xlsx tidak dapat diekstrak.");
    }
  } else if (
    ext === "odt" ||
    ext === "odp" ||
    ext === "ods" ||
    mime.includes("opendocument")
  ) {
    try {
      const entries = parseZipEntries(bytes, (name) => name === "content.xml");
      const contentBuf = entries.get("content.xml");
      if (contentBuf) {
        text = stripXmlTags(contentBuf.toString("utf8"));
      } else {
        throw new Error("content.xml not found");
      }
    } catch {
      throw new UnsupportedFileError("Berkas OpenDocument tidak dapat dibaca.");
    }
  } else if (ext === "epub" || mime.includes("epub")) {
    try {
      const entries = parseZipEntries(bytes, (name) =>
        name.endsWith(".xhtml") ||
        name.endsWith(".html") ||
        name.endsWith(".xml") ||
        name.endsWith(".opf")
      );
      const textParts: string[] = [];
      let accumulatedLen = 0;
      for (const [, entryBuf] of entries.entries()) {
        const itemText = stripXmlTags(entryBuf.toString("utf8"));
        textParts.push(itemText);
        accumulatedLen += itemText.length;
        if (accumulatedLen >= MAX_SOURCE_CHARS * 2) break;
      }
      text = textParts.join("\n\n");
    } catch {
      throw new UnsupportedFileError("Berkas epub tidak dapat dibaca.");
    }
  } else if (ext === "rtf" || mime.includes("rtf")) {
    text = extractRtfText(bytes.toString("utf8"));
  } else if (ext === "doc" || mime === "application/msword") {
    text = extractDocFallbackText(bytes);
    if (!text) {
      throw new UnsupportedFileError(
        "Berkas .doc versi lama tidak memiliki teks yang dapat dibaca. Simpan ulang sebagai .docx atau .txt."
      );
    }
  } else if (
    TEXT_EXTENSIONS.has(ext) ||
    mime.startsWith("text/") ||
    mime === "application/json"
  ) {
    // Avoid decoding massive buffers when only the first 60k chars are retained
    const rawLen = Math.min(bytes.length, MAX_SOURCE_CHARS * 3);
    text = bytes.toString("utf8", 0, rawLen);
    if (ext === "html" || ext === "htm") {
      text = text
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ");
    } else if (ext === "xml") {
      text = stripXmlTags(text);
    } else if (ext === "srt" || ext === "vtt") {
      text = text
        .replace(/^\d+$/gm, "")
        .replace(
          /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}.*$/gm,
          ""
        );
    }
  } else {
    throw new UnsupportedFileError(
      "Format belum didukung. Gunakan PDF, DOCX, PPTX, XLSX, ODT, EPUB, TXT, gambar (JPEG, PNG, WebP), atau dokumen teks lainnya."
    );
  }

  const cleaned = cleanText(text);
  if (isImage) {
    if (cleaned.length === 0) {
      throw new UnsupportedFileError(
        "Tidak ada teks yang dapat dibaca dari gambar materi ini."
      );
    }
  } else if (cleaned.length < 40) {
    throw new UnsupportedFileError(
      "Tidak ada teks yang bisa dibaca di berkas ini (mungkin PDF hasil scan atau berkas kosong)."
    );
  }
  return cleaned.slice(0, MAX_SOURCE_CHARS);
}
