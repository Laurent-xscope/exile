import { describe, expect, it } from "bun:test";
import {
  applyDocumentPaperFilter,
  assembleMultiPageDocument,
  calculateTargetDimensions,
  compressAndResizeImage,
  DEFAULT_JPEG_QUALITY,
  MAX_DOCUMENT_PAGES,
  MAX_SCAN_DIMENSION,
  MAX_TOTAL_PAYLOAD_BYTES,
  type MultiPageInput,
} from "../scanner-preprocessor";

describe("scanner-preprocessor dimension calculations", () => {
  it("keeps image dimensions when smaller than maximum limits", () => {
    const result = calculateTargetDimensions(800, 600);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("scales down landscape images while preserving aspect ratio", () => {
    // 3200x1600 has a 2:1 aspect ratio
    const result = calculateTargetDimensions(3200, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(800);
  });

  it("scales down portrait images while preserving aspect ratio", () => {
    // 1200x2400 has a 1:2 aspect ratio
    const result = calculateTargetDimensions(1200, 2400);
    expect(result.width).toBe(800);
    expect(result.height).toBe(1600);
  });

  it("clamps maximum dimensions to 1600px even if caller requests larger size", () => {
    const result = calculateTargetDimensions(4000, 3000, 3000, 3000);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
  });

  it("honours custom lower maximum dimensions", () => {
    const result = calculateTargetDimensions(1000, 800, 500, 500);
    expect(result.width).toBe(500);
    expect(result.height).toBe(400);
  });

  it("handles square dimensions accurately", () => {
    const result = calculateTargetDimensions(2400, 2400);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1600);
  });

  it("guards against zero or negative source dimensions", () => {
    const zeroResult = calculateTargetDimensions(0, 0);
    expect(zeroResult.width).toBe(MAX_SCAN_DIMENSION);
    expect(zeroResult.height).toBe(MAX_SCAN_DIMENSION);

    const negativeResult = calculateTargetDimensions(-100, -200);
    expect(negativeResult.width).toBe(MAX_SCAN_DIMENSION);
    expect(negativeResult.height).toBe(MAX_SCAN_DIMENSION);
  });

  it("exports valid constant defaults", () => {
    expect(MAX_SCAN_DIMENSION).toBe(1600);
    expect(DEFAULT_JPEG_QUALITY).toBe(0.85);
    expect(MAX_DOCUMENT_PAGES).toBe(30);
    expect(MAX_TOTAL_PAYLOAD_BYTES).toBe(20 * 1024 * 1024);
  });
});

describe("applyDocumentPaperFilter", () => {
  it("does not throw in SSR environments when window is undefined", () => {
    // In Bun test runner, window is undefined by default
    expect(() => {
      // @ts-expect-error testing SSR canvas argument
      applyDocumentPaperFilter(null);
    }).not.toThrow();
  });

  it("handles canvas with zero dimensions safely", () => {
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;

    expect(() => applyDocumentPaperFilter(mockCanvas)).not.toThrow();
  });

  it("stretches paper to white and darkens ink without inverting colors", () => {
    // Construct synthetic 4x4 image with paper background and ink mark
    const width = 4;
    const height = 4;
    const totalPixels = width * height;
    const rawData = new Uint8ClampedArray(totalPixels * 4);

    // Fill background with off-white paper (gray level 210)
    for (let i = 0; i < totalPixels; i++) {
      rawData[i * 4] = 210;
      rawData[i * 4 + 1] = 210;
      rawData[i * 4 + 2] = 210;
      rawData[i * 4 + 3] = 255;
    }

    // Add dark ink mark on pixel 0 (gray level 30)
    rawData[0] = 30;
    rawData[1] = 30;
    rawData[2] = 30;
    rawData[3] = 255;

    // Add mid-gray pencil mark on pixel 1 (gray level 100)
    rawData[4] = 100;
    rawData[5] = 100;
    rawData[6] = 100;
    rawData[7] = 255;

    let putDataCalled = false;
    const mockImageData = {
      data: rawData,
      width,
      height,
      colorSpace: "srgb" as PredefinedColorSpace,
    };

    const mockCanvas = {
      width,
      height,
      getContext: (contextType: string) => {
        if (contextType === "2d") {
          return {
            getImageData: () => mockImageData,
            putImageData: () => {
              putDataCalled = true;
            },
          };
        }
        return null;
      },
    } as unknown as HTMLCanvasElement;

    const globalEnv = globalThis as unknown as { window?: unknown };
    const originalWindow = globalEnv.window;
    globalEnv.window = {} as unknown as Window & typeof globalThis;

    try {
      applyDocumentPaperFilter(mockCanvas);

      expect(putDataCalled).toBe(true);

      // Dark ink should be darkened to crisp 0
      expect(rawData[0]).toBe(0);
      expect(rawData[1]).toBe(0);
      expect(rawData[2]).toBe(0);

      // Paper background should be brightened to clean white 255
      expect(rawData[8]).toBe(255);
      expect(rawData[9]).toBe(255);
      expect(rawData[10]).toBe(255);

      // Mid pencil mark should be darker than paper and brighter than ink
      expect(rawData[4]).toBeGreaterThan(0);
      expect(rawData[4]).toBeLessThan(255);

      // Alpha channel must remain intact
      expect(rawData[3]).toBe(255);
      expect(rawData[7]).toBe(255);
      expect(rawData[11]).toBe(255);
    } finally {
      globalEnv.window = originalWindow;
    }
  });

  it("preserves pixels when image has low dynamic range", () => {
    const width = 2;
    const height = 2;
    const rawData = new Uint8ClampedArray(width * height * 4);

    // Uniform gray block
    for (let i = 0; i < rawData.length; i += 4) {
      rawData[i] = 120;
      rawData[i + 1] = 120;
      rawData[i + 2] = 120;
      rawData[i + 3] = 255;
    }

    const mockImageData = {
      data: rawData,
      width,
      height,
      colorSpace: "srgb" as PredefinedColorSpace,
    };

    let putDataCalled = false;
    const mockCanvas = {
      width,
      height,
      getContext: () => ({
        getImageData: () => mockImageData,
        putImageData: () => {
          putDataCalled = true;
        },
      }),
    } as unknown as HTMLCanvasElement;

    const globalEnv = globalThis as unknown as { window?: unknown };
    const originalWindow = globalEnv.window;
    globalEnv.window = {} as unknown as Window & typeof globalThis;

    try {
      applyDocumentPaperFilter(mockCanvas);
      // Low dynamic range must exit without altering image
      expect(putDataCalled).toBe(false);
      expect(rawData[0]).toBe(120);
    } finally {
      globalEnv.window = originalWindow;
    }
  });
});

describe("compressAndResizeImage", () => {
  it("throws error in SSR environment when browser APIs are missing", async () => {
    const dummyBlob = new Blob(["test-data"], { type: "image/jpeg" });

    // Expect promise rejection because window/document are absent in Bun SSR
    await expect(compressAndResizeImage(dummyBlob)).rejects.toThrow(
      "Browser canvas environment is not available."
    );
  });

  it("renders, optionally filters, and exports JPEG in mocked browser environment", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalCreateImageBitmap = globalThis.createImageBitmap;

    let filterCalled = false;
    const dummyJpegBase64 = "/9j/4AAQSkZJRg==";
    const dummyDataUrl = `data:image/jpeg;base64,${dummyJpegBase64}`;

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: () => {},
        getImageData: () => ({
          data: new Uint8ClampedArray([210, 210, 210, 255, 30, 30, 30, 255]),
          width: 2,
          height: 1,
        }),
        putImageData: () => {
          filterCalled = true;
        },
      }),
      toDataURL: (type: string) => {
        expect(type).toBe("image/jpeg");
        return dummyDataUrl;
      },
      toBlob: (callback: (blob: Blob | null) => void, type: string) => {
        expect(type).toBe("image/jpeg");
        callback(new Blob(["test-bytes"], { type }));
      },
    };

    const globalEnv = globalThis as unknown as {
      window?: unknown;
      document?: unknown;
      createImageBitmap?: unknown;
    };

    globalEnv.window = {} as unknown as Window & typeof globalThis;
    globalEnv.document = {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          return mockCanvas;
        }
        return {};
      },
    } as unknown as Document;

    globalEnv.createImageBitmap = async () => ({
      width: 3200,
      height: 2400,
      close: () => {},
    });

    try {
      const dummyBlob = new Blob(["image-content"], { type: "image/jpeg" });
      const result = await compressAndResizeImage(dummyBlob, {
        applyFilter: true,
        quality: 0.85,
      });

      expect(result.mimeType).toBe("image/jpeg");
      expect(result.width).toBe(1600);
      expect(result.height).toBe(1200);
      expect(result.base64).toBe(dummyDataUrl);
      expect(result.rawBase64).toBe(dummyJpegBase64);
      expect(result.blob).toBeDefined();
      expect(filterCalled).toBe(true);
    } finally {
      globalEnv.window = originalWindow;
      globalEnv.document = originalDocument;
      globalEnv.createImageBitmap = originalCreateImageBitmap;
    }
  });

  it("falls back to fetch(dataUrl) when canvas.toBlob returns null", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalFetch = globalThis.fetch;

    const dummyJpegBase64 = "/9j/4AAQSkZJRg==";
    const dummyDataUrl = `data:image/jpeg;base64,${dummyJpegBase64}`;

    let fetchCalled = false;
    globalThis.fetch = (async (url: string | URL | Request) => {
      fetchCalled = true;
      expect(String(url)).toBe(dummyDataUrl);
      return new Response(new Blob(["fetched-bytes"], { type: "image/jpeg" }));
    }) as typeof fetch;

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: () => {},
      }),
      toDataURL: () => dummyDataUrl,
      toBlob: (callback: (blob: Blob | null) => void) => {
        // Simulate WebKit/Safari returning null blob
        callback(null);
      },
    };

    const globalEnv = globalThis as unknown as {
      window?: unknown;
      document?: unknown;
      createImageBitmap?: unknown;
    };

    globalEnv.window = {} as unknown as Window & typeof globalThis;
    globalEnv.document = {
      createElement: (tag: string) => (tag === "canvas" ? mockCanvas : {}),
    } as unknown as Document;

    globalEnv.createImageBitmap = async () => ({
      width: 800,
      height: 600,
      close: () => {},
    });

    try {
      const dummyBlob = new Blob(["test"], { type: "image/jpeg" });
      const result = await compressAndResizeImage(dummyBlob);

      expect(fetchCalled).toBe(true);
      expect(result.blob).toBeDefined();
      expect(result.mimeType).toBe("image/jpeg");
    } finally {
      globalEnv.window = originalWindow;
      globalEnv.document = originalDocument;
      globalEnv.createImageBitmap = originalCreateImageBitmap;
      globalThis.fetch = originalFetch;
    }
  });

  it("sanitizes base64 and avoids atob pattern error when toBlob and fetch fail", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalFetch = globalThis.fetch;

    // Simulate unsanitized base64 string with invalid characters / newlines / spaces that WebKit atob rejects
    const dirtyBase64 = " /9j/\n4AAQ\r\nSkZJRg== \t#$*";
    const dirtyDataUrl = `data:image/jpeg;base64,${dirtyBase64}`;

    // Simulate fetch throwing error
    globalThis.fetch = (async () => {
      throw new Error("fetch not supported for data URL");
    }) as unknown as typeof fetch;

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: () => {},
      }),
      toDataURL: () => dirtyDataUrl,
      toBlob: (callback: (blob: Blob | null) => void) => {
        callback(null);
      },
    };

    const globalEnv = globalThis as unknown as {
      window?: unknown;
      document?: unknown;
      createImageBitmap?: unknown;
    };

    globalEnv.window = {} as unknown as Window & typeof globalThis;
    globalEnv.document = {
      createElement: (tag: string) => (tag === "canvas" ? mockCanvas : {}),
    } as unknown as Document;

    globalEnv.createImageBitmap = async () => ({
      width: 400,
      height: 300,
      close: () => {},
    });

    try {
      const dummyBlob = new Blob(["test"], { type: "image/jpeg" });
      // Must not throw "Failed to execute 'atob' on 'Window': The string did not match the expected pattern."
      const result = await compressAndResizeImage(dummyBlob);

      expect(result.blob).toBeDefined();
      expect(result.blob.type).toBe("image/jpeg");
      expect(result.mimeType).toBe("image/jpeg");
    } finally {
      globalEnv.window = originalWindow;
      globalEnv.document = originalDocument;
      globalEnv.createImageBitmap = originalCreateImageBitmap;
      globalThis.fetch = originalFetch;
    }
  });
});

describe("assembleMultiPageDocument", () => {
  it("rejects empty page array", async () => {
    await expect(assembleMultiPageDocument([])).rejects.toThrow(
      "Page list is empty."
    );
  });

  it("rejects page count above maximum limit of 30", async () => {
    const tooManyPages: MultiPageInput[] = Array.from(
      { length: 31 },
      (_, i) => ({
        base64: "dGVzdA==",
        mimeType: "image/jpeg",
        text: `Page ${i + 1}`,
      })
    );

    await expect(assembleMultiPageDocument(tooManyPages)).rejects.toThrow(
      "Page count 31 exceeds maximum limit of 30."
    );
  });

  it("rejects page with missing or empty base64 string", async () => {
    const invalidPages: MultiPageInput[] = [
      { base64: "", mimeType: "image/jpeg" },
    ];

    await expect(assembleMultiPageDocument(invalidPages)).rejects.toThrow(
      "Page 1 has empty image data."
    );
  });

  it("rejects payload exceeding total size limit of 20 MB", async () => {
    // Create base64 string that decodes to > 20 MB
    // 28 * 1024 * 1024 chars decodes to ~21 MB
    const largeChunk = "A".repeat(1024 * 1024); // 1 MB string
    const largePages: MultiPageInput[] = Array.from({ length: 28 }, () => ({
      base64: largeChunk,
      mimeType: "image/jpeg",
    }));

    await expect(assembleMultiPageDocument(largePages)).rejects.toThrow(
      "Total payload size exceeds 20 MB limit."
    );
  });

  it("normalizes data URI format and builds combined text summary", async () => {
    const samplePages: MultiPageInput[] = [
      {
        base64: "aGVsbG8=",
        mimeType: "image/jpeg",
      },
      {
        base64: "data:image/jpeg;base64,d29ybGQ=",
        mimeType: "image/jpeg",
      },
    ];

    const result = await assembleMultiPageDocument(samplePages);

    expect(result.images).toHaveLength(2);
    expect(result.images[0].base64).toBe("data:image/jpeg;base64,aGVsbG8=");
    expect(result.images[0].mimeType).toBe("image/jpeg");
    expect(result.images[1].base64).toBe("data:image/jpeg;base64,d29ybGQ=");
    expect(result.images[1].mimeType).toBe("image/jpeg");

    // Default snippet without page text
    expect(result.combinedTextSnippet).toBe("[Scanned document: 2 pages]");
  });

  it("formats single page summary with correct singular grammar", async () => {
    const singlePage: MultiPageInput[] = [
      {
        base64: "aGVsbG8=",
        mimeType: "image/jpeg",
      },
    ];

    const result = await assembleMultiPageDocument(singlePage);
    expect(result.combinedTextSnippet).toBe("[Scanned document: 1 page]");
  });

  it("combines OCR or user page text snippets when provided", async () => {
    const pagesWithText: MultiPageInput[] = [
      {
        base64: "aGVsbG8=",
        mimeType: "image/jpeg",
        text: "Kuis Bab 1: Fotosintesis",
      },
      {
        base64: "d29ybGQ=",
        mimeType: "image/jpeg",
        text: "Soal 1: Apa fungsi klorofil?",
      },
    ];

    const result = await assembleMultiPageDocument(pagesWithText);

    expect(result.combinedTextSnippet).toContain(
      "Page 1:\nKuis Bab 1: Fotosintesis"
    );
    expect(result.combinedTextSnippet).toContain(
      "Page 2:\nSoal 1: Apa fungsi klorofil?"
    );
  });
});
