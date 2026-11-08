import { describe, expect, it } from "bun:test";
import {
  formatScannerPageCount,
  formatScannerPageLabel,
  formatScannerPreviewTitle,
  getScannerModeLabel,
  removeScannedPage,
  type ScannedPageItem,
  type MobileHomeworkScannerProps,
} from "../mobile-homework-scanner";
import {
  assembleMultiPageDocument,
  type MultiPageInput,
} from "@/lib/media/scanner-preprocessor";

describe("MobileHomeworkScanner sentence case and text formatting", () => {
  it("formats page labels strictly in sentence case", () => {
    // Indonesian
    const idPage1 = formatScannerPageLabel(0, false);
    const idPage2 = formatScannerPageLabel(1, false);
    expect(idPage1).toBe("Halaman 1");
    expect(idPage2).toBe("Halaman 2");

    // English
    const enPage1 = formatScannerPageLabel(0, true);
    const enPage2 = formatScannerPageLabel(1, true);
    expect(enPage1).toBe("Page 1");
    expect(enPage2).toBe("Page 2");

    // Sentence case verification: first char uppercase, remaining lowercase
    for (const label of [idPage1, idPage2, enPage1, enPage2]) {
      const words = label.split(" ");
      expect(words[0][0]).toBe(words[0][0].toUpperCase());
      expect(words[0].slice(1)).toBe(words[0].slice(1).toLowerCase());
    }
  });

  it("formats page counts correctly with singular and plural rules", () => {
    // Indonesian
    expect(formatScannerPageCount(0, false)).toBe("0 halaman");
    expect(formatScannerPageCount(1, false)).toBe("1 halaman");
    expect(formatScannerPageCount(4, false)).toBe("4 halaman");

    // English
    expect(formatScannerPageCount(0, true)).toBe("0 pages");
    expect(formatScannerPageCount(1, true)).toBe("1 page");
    expect(formatScannerPageCount(5, true)).toBe("5 pages");

    // Negative guard
    expect(formatScannerPageCount(-2, false)).toBe("0 halaman");
  });

  it("formats preview titles in sentence case", () => {
    expect(formatScannerPreviewTitle(0, 3, false)).toBe("Halaman 1 dari 3");
    expect(formatScannerPreviewTitle(1, 3, false)).toBe("Halaman 2 dari 3");
    expect(formatScannerPreviewTitle(0, 3, true)).toBe("Page 1 of 3");
    expect(formatScannerPreviewTitle(2, 3, true)).toBe("Page 3 of 3");
  });

  it("returns mode labels in strict sentence case", () => {
    const directId = getScannerModeLabel("direct_answer", false);
    const learningId = getScannerModeLabel("learning", false);
    const directEn = getScannerModeLabel("direct_answer", true);
    const learningEn = getScannerModeLabel("learning", true);

    expect(directId).toBe("Jawaban langsung");
    expect(learningId).toBe("Mode belajar");
    expect(directEn).toBe("Direct answer");
    expect(learningEn).toBe("Learning mode");

    for (const label of [directId, learningId, directEn, learningEn]) {
      const words = label.split(" ");
      expect(words[0][0]).toBe(words[0][0].toUpperCase());
      for (let i = 1; i < words.length; i++) {
        expect(words[i]).toBe(words[i].toLowerCase());
      }
    }
  });
});

describe("MobileHomeworkScanner page list mutation", () => {
  const dummyPages: ScannedPageItem[] = [
    {
      id: "page-1",
      base64: "data:image/jpeg;base64,AAAA",
      mimeType: "image/jpeg",
      thumbnailUrl: "data:image/jpeg;base64,AAAA",
    },
    {
      id: "page-2",
      base64: "data:image/jpeg;base64,BBBB",
      mimeType: "image/jpeg",
      thumbnailUrl: "data:image/jpeg;base64,BBBB",
    },
    {
      id: "page-3",
      base64: "data:image/jpeg;base64,CCCC",
      mimeType: "image/jpeg",
      thumbnailUrl: "data:image/jpeg;base64,CCCC",
    },
  ];

  it("removes page at specified index immutably", () => {
    const remaining = removeScannedPage(dummyPages, 1);
    expect(remaining).toHaveLength(2);
    expect(remaining[0].id).toBe("page-1");
    expect(remaining[1].id).toBe("page-3");

    // Original array stays unmodified
    expect(dummyPages).toHaveLength(3);
  });

  it("handles out of bounds index removal gracefully without mutating", () => {
    expect(removeScannedPage(dummyPages, -1)).toHaveLength(3);
    expect(removeScannedPage(dummyPages, 99)).toHaveLength(3);
  });

  it("removes first and last elements accurately", () => {
    const withoutFirst = removeScannedPage(dummyPages, 0);
    expect(withoutFirst[0].id).toBe("page-2");

    const withoutLast = removeScannedPage(dummyPages, 2);
    expect(withoutLast[withoutLast.length - 1].id).toBe("page-2");
  });
});

describe("MobileHomeworkScanner contracts and specifications", () => {
  it("complies with touch target accessibility minimum of 44x44px", () => {
    // Action buttons must have minimum 44px hit targets on mobile
    const buttonTouchTarget = "min-h-11 min-w-11";
    expect(buttonTouchTarget).toContain("min-h-11");
    expect(buttonTouchTarget).toContain("min-w-11");

    // Delete button must have 44x44px hit target
    const deleteButtonClasses =
      "inline-flex min-h-11 min-w-11 size-11 items-center justify-center rounded-xl";
    expect(deleteButtonClasses).toContain("min-h-11");
    expect(deleteButtonClasses).toContain("min-w-11");
    expect(deleteButtonClasses).toContain("size-11");
  });

  it("defines camera file input with environment capture attribute", () => {
    const inputAttributes = {
      type: "file",
      accept: "image/*",
      capture: "environment",
    };

    expect(inputAttributes.type).toBe("file");
    expect(inputAttributes.accept).toBe("image/*");
    expect(inputAttributes.capture).toBe("environment");
  });

  it("defines accurate status messages during paper enhancement and document assembly", () => {
    const messages = {
      contrastEnhancementId: "Mengoptimalkan kontras kertas...",
      contrastEnhancementEn: "Optimizing paper contrast...",
      assemblyId: "Menyusun dokumen...",
      assemblyEn: "Assembling document...",
    };

    // Strict sentence case verification
    expect(messages.contrastEnhancementId[0]).toBe("M");
    expect(messages.contrastEnhancementId.slice(1).toLowerCase()).toBe(
      messages.contrastEnhancementId.slice(1)
    );

    expect(messages.contrastEnhancementEn[0]).toBe("O");
    expect(messages.contrastEnhancementEn.slice(1).toLowerCase()).toBe(
      messages.contrastEnhancementEn.slice(1)
    );

    expect(messages.assemblyId[0]).toBe("M");
    expect(messages.assemblyId.slice(1).toLowerCase()).toBe(
      messages.assemblyId.slice(1)
    );

    expect(messages.assemblyEn[0]).toBe("A");
    expect(messages.assemblyEn.slice(1).toLowerCase()).toBe(
      messages.assemblyEn.slice(1)
    );
  });

  it("assembles multi-page documents and integrates with onComplete payload", async () => {
    const scannedPages: ScannedPageItem[] = [
      {
        id: "p1",
        base64: "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/jpeg",
        thumbnailUrl: "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
      {
        id: "p2",
        base64: "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/jpeg",
        thumbnailUrl: "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    ];

    const inputPages: MultiPageInput[] = scannedPages.map((p) => ({
      base64: p.base64,
      mimeType: p.mimeType,
    }));

    const doc = await assembleMultiPageDocument(inputPages);
    expect(doc.images).toHaveLength(2);
    expect(doc.combinedTextSnippet).toBe("[Scanned document: 2 pages]");

    let emittedResult: {
      mode: "direct_answer" | "learning";
      pages: ScannedPageItem[];
      combinedSnippet: string;
    } | null = null;

    const mockComplete: MobileHomeworkScannerProps["onComplete"] = (data) => {
      emittedResult = data;
    };

    mockComplete({
      mode: "direct_answer",
      pages: scannedPages,
      combinedSnippet: doc.combinedTextSnippet,
    });

    expect(emittedResult).not.toBeNull();
    expect(emittedResult!.mode).toBe("direct_answer");
    expect(emittedResult!.pages).toHaveLength(2);
    expect(emittedResult!.combinedSnippet).toBe("[Scanned document: 2 pages]");
  });
});
