/** Server-side text extraction for uploaded study material. */

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_CHARS = 60_000;

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "csv", "json", "html", "htm", "rtf", "srt", "vtt"]);

export interface UploadedFile {
  name: string;
  mimeType?: string;
  base64: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function cleanText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export class UnsupportedFileError extends Error {}

export async function extractText(file: UploadedFile): Promise<string> {
  const payload = file.base64.includes(",") ? file.base64.split(",")[1] : file.base64;
  const bytes = Buffer.from(payload, "base64");
  if (bytes.byteLength === 0) throw new UnsupportedFileError("Berkas kosong.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new UnsupportedFileError("Berkas terlalu besar (maksimal 8 MB).");
  }

  const ext = extensionOf(file.name);
  const mime = (file.mimeType || "").toLowerCase();
  let text: string;

  if (ext === "pdf" || mime === "application/pdf") {
    try {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const result = await pdfText(pdf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("password") || msg.includes("encrypted")) {
        throw new UnsupportedFileError("Berkas pdf dilindungi kata sandi. Harap buka kunci terlebih dahulu.");
      }
      throw new UnsupportedFileError("Berkas pdf rusak atau strukturnya tidak valid. Pastikan berkas dapat dibuka secara normal.");
    }
  } else if (ext === "docx" || mime.includes("wordprocessingml")) {
    try {
      const { default: mammoth } = await import("mammoth");
      const out = await mammoth.extractRawText({ buffer: bytes });
      text = out.value;
    } catch {
      throw new UnsupportedFileError("Berkas docx rusak atau berformat lama (.doc). Simpan ulang ke format .docx standar atau .txt.");
    }
  } else if (TEXT_EXTENSIONS.has(ext) || mime.startsWith("text/") || mime === "application/json") {
    text = bytes.toString("utf8");
    if (ext === "html" || ext === "htm") {
      text = text.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
    }
  } else {
    throw new UnsupportedFileError("Format belum didukung. Gunakan PDF, DOCX, TXT, atau MD.");
  }

  const cleaned = cleanText(text);
  if (cleaned.length < 40) {
    throw new UnsupportedFileError(
      "Tidak ada teks yang bisa dibaca di berkas ini (mungkin PDF hasil scan)."
    );
  }
  return cleaned.slice(0, MAX_SOURCE_CHARS);
}
