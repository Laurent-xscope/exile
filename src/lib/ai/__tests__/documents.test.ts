import { describe, expect, test } from "bun:test";
import { extractText, UnsupportedFileError, type UploadedFile } from "../documents";

describe("Document text extractor", () => {
  test("extracts plain text and markdown documents", async () => {
    const rawContent = "# Modul Fisika\n\nPrinsip konversi fotovoltaik...";
    const file: UploadedFile = {
      name: "silabus.md",
      base64: Buffer.from(rawContent, "utf8").toString("base64"),
    };

    const text = await extractText(file);
    expect(text).toBe(rawContent);
  });

  test("handles data URL prefix in base64 payload", async () => {
    const content =
      "Baris pertama materi kuliah penting.\nBaris kedua penjelasan hukum termodinamika.";
    const base64Data = Buffer.from(content, "utf8").toString("base64");
    const file: UploadedFile = {
      name: "catatan.txt",
      base64: `data:text/plain;base64,${base64Data}`,
    };

    const text = await extractText(file);
    expect(text).toBe(content);
  });

  test("normalizes Windows CRLF to LF and trims whitespace", async () => {
    const raw =
      "Pertanyaan pertama materi kuliah sains esensial.\r\n\r\n\r\n\r\nJawaban benar konsep hukum fisika.    \r\n";
    const file: UploadedFile = {
      name: "materi.txt",
      base64: Buffer.from(raw, "utf8").toString("base64"),
    };

    const text = await extractText(file);
    expect(text).toBe(
      "Pertanyaan pertama materi kuliah sains esensial.\n\nJawaban benar konsep hukum fisika."
    );
  });

  test("extracts text from HTML files, stripping script and style tags", async () => {
    const html = `
      <html>
        <head>
          <style>body { color: red; }</style>
          <script>console.log("ignore me");</script>
        </head>
        <body>
          <h1>Judul Materi</h1>
          <p>Paragraf penjelasan konsep.</p>
        </body>
      </html>
    `;
    const file: UploadedFile = {
      name: "panduan.html",
      base64: Buffer.from(html, "utf8").toString("base64"),
    };

    const text = await extractText(file);
    expect(text).toContain("Judul Materi");
    expect(text).toContain("Paragraf penjelasan konsep.");
    expect(text).not.toContain("color: red");
    expect(text).not.toContain("ignore me");
  });

  test("extracts text from RTF formatted files", async () => {
    const rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Courier;}}\\f0\\fs24 Pengantar Biologi Sel\\par Struktur Membran Sel}`;
    const file: UploadedFile = {
      name: "catatan.rtf",
      base64: Buffer.from(rtf, "utf8").toString("base64"),
    };

    const text = await extractText(file);
    expect(text).toContain("Pengantar Biologi Sel");
    expect(text).toContain("Struktur Membran Sel");
  });

  test("extracts text from source code files (.py, .ts, .json)", async () => {
    const pyCode = "def hitung_energi(m, c):\n    return m * (c ** 2)";
    const file: UploadedFile = {
      name: "rumus.py",
      base64: Buffer.from(pyCode, "utf8").toString("base64"),
    };

    const text = await extractText(file);
    expect(text).toBe(pyCode);
  });

  test("throws UnsupportedFileError for empty file", async () => {
    const file: UploadedFile = {
      name: "kosong.txt",
      base64: "",
    };

    await expect(extractText(file)).rejects.toThrow(UnsupportedFileError);
  });

  test("throws UnsupportedFileError for unsupported file format", async () => {
    const file: UploadedFile = {
      name: "program.exe",
      base64: Buffer.from("MZ binary dummy", "utf8").toString("base64"),
    };

    await expect(extractText(file)).rejects.toThrow(UnsupportedFileError);
  });
});
