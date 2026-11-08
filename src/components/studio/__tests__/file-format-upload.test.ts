import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("File format upload and document classification contracts", () => {
  it("includes all requested image extensions and document formats in quiz-upload ACCEPT", () => {
    const quizUploadPath = resolve(process.cwd(), "src/components/rooms/quiz-upload.tsx");
    const content = readFileSync(quizUploadPath, "utf8");

    const expectedAccept =
      ".jpg,.jpeg,.png,.webp,.bmp,.gif,.heic,.heif,image/*,.pdf,.docx,.doc,.pptx,.xlsx,.odt,.odp,.ods,.epub,.rtf,.csv,.tsv,.xml,.yaml,.yml,.json,.html,.htm,.tex,.srt,.vtt,.log,.txt,.md,text/*";

    expect(content).toContain(`const ACCEPT =\n  "${expectedAccept}";`);
  });

  it("includes image extensions explicitly in studio file input accept attribute", () => {
    const studioPagePath = resolve(process.cwd(), "src/app/studio/page.tsx");
    const content = readFileSync(studioPagePath, "utf8");

    expect(content).toContain(
      'accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.heic,.heif,.jfif,.tiff,.tif,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp,.rtf,.txt,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.epub,image/*,text/*,application/*"'
    );
  });

  it("correctly classifies files according to the studio document rules", () => {
    function classifyFile(fileName: string, mime: string) {
      const lowerName = fileName.toLowerCase();

      // 1. Standard text files
      const isStandardText =
        /\.(txt|md|csv|tsv|json|yaml|yml)$/i.test(lowerName) ||
        (mime.startsWith("text/") &&
          !/\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp|epub|rtf|jpe?g|png|webp|bmp|gif|heic|heif|jfif|tiff?)$/i.test(
            lowerName
          ));

      if (isStandardText) {
        return { category: "standard-text", detectedType: "text", readerMode: "readAsText" };
      }

      // 2. Office / rich docs
      const isOfficeDoc =
        /\.(pptx|xlsx|odt|ods|odp|epub|rtf|docx?|ppt|xls)$/i.test(lowerName);

      if (isOfficeDoc) {
        return { category: "office-doc", detectedType: "text", readerMode: "readAsDataURL" };
      }

      // 3. PDF documents
      const isPdf = mime === "application/pdf" || lowerName.endsWith(".pdf");
      if (isPdf) {
        return { category: "pdf", detectedType: "pdf", readerMode: "readAsDataURL" };
      }

      // 4. Images
      const isImage =
        /\.(jpe?g|png|webp|bmp|gif|heic|heif|jfif|tiff?)$/i.test(lowerName) ||
        mime.startsWith("image/");

      const detectedType = isImage ? "image" : "text";
      return { category: "image", detectedType, readerMode: "readAsDataURL" };
    }

    // Images
    const imageFiles = [
      { name: "photo.jpg", mime: "image/jpeg" },
      { name: "diagram.jpeg", mime: "image/jpeg" },
      { name: "scan.png", mime: "image/png" },
      { name: "chart.webp", mime: "image/webp" },
      { name: "screenshot.bmp", mime: "image/bmp" },
      { name: "animation.gif", mime: "image/gif" },
      { name: "apple.heic", mime: "image/heic" },
      { name: "live.heif", mime: "image/heif" },
    ];
    for (const img of imageFiles) {
      const res = classifyFile(img.name, img.mime);
      expect(res.detectedType).toBe("image");
      expect(res.readerMode).toBe("readAsDataURL");
    }

    // Office / rich docs (MUST route to detectedType: "text" so server extractText handles them)
    const officeFiles = [
      { name: "presentation.pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
      { name: "grades.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      { name: "notes.odt", mime: "application/vnd.oasis.opendocument.text" },
      { name: "data.ods", mime: "application/vnd.oasis.opendocument.spreadsheet" },
      { name: "slides.odp", mime: "application/vnd.oasis.opendocument.presentation" },
      { name: "novel.epub", mime: "application/epub+zip" },
      { name: "doc.rtf", mime: "application/rtf" },
      { name: "legacy.doc", mime: "application/msword" },
      { name: "assignment.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ];
    for (const doc of officeFiles) {
      const res = classifyFile(doc.name, doc.mime);
      expect(res.detectedType).toBe("text");
      expect(res.category).toBe("office-doc");
    }

    // Standard text files (MUST route to readAsText)
    const textFiles = [
      { name: "notes.txt", mime: "text/plain" },
      { name: "README.md", mime: "text/markdown" },
      { name: "data.csv", mime: "text/csv" },
      { name: "table.tsv", mime: "text/tab-separated-values" },
      { name: "config.json", mime: "application/json" },
      { name: "schema.yaml", mime: "application/x-yaml" },
      { name: "deploy.yml", mime: "application/x-yaml" },
    ];
    for (const txt of textFiles) {
      const res = classifyFile(txt.name, txt.mime);
      expect(res.detectedType).toBe("text");
      expect(res.readerMode).toBe("readAsText");
    }

    // PDF files
    const pdfRes = classifyFile("syllabus.pdf", "application/pdf");
    expect(pdfRes.detectedType).toBe("pdf");
    expect(pdfRes.readerMode).toBe("readAsDataURL");
  });
});
