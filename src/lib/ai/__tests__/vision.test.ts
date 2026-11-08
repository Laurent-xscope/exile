import { describe, expect, test } from "bun:test";
import {
  cleanBase64Payload,
  normalizeImageDataUrl,
  DirectAnswerResponseSchema,
  DirectAnswerItemSchema,
} from "../vision";
import { BodySchema, RequestSchema } from "@/app/api/ai/process-document/route";

describe("Vision and Multimodal OCR Utilities", () => {
  test("cleanBase64Payload splits data URL and extracts mimeType", () => {
    const rawData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";
    const dataUrl = `data:image/png;base64,${rawData}`;

    const parsed = cleanBase64Payload(dataUrl, "image/jpeg");
    expect(parsed.data).toBe(rawData);
    expect(parsed.mimeType).toBe("image/png");
  });

  test("cleanBase64Payload falls back to default mimeType for raw base64", () => {
    const rawData = "aGVsbG8gd29ybGQ=";
    const parsed = cleanBase64Payload(rawData, "image/webp");
    expect(parsed.data).toBe(rawData);
    expect(parsed.mimeType).toBe("image/webp");
  });

  test("normalizeImageDataUrl adds data URL scheme when missing", () => {
    const rawData = "iVBORw0KGgoAAAANSUhEUgAAAAE=";
    const dataUrl = normalizeImageDataUrl({
      base64: rawData,
      mimeType: "image/png",
    });
    expect(dataUrl).toBe(`data:image/png;base64,${rawData}`);
  });

  test("normalizeImageDataUrl keeps existing data URL prefix", () => {
    const full = "data:image/jpeg;base64,9j4AAQSkZJRgABAQEA";
    const dataUrl = normalizeImageDataUrl({
      base64: full,
    });
    expect(dataUrl).toBe(full);
  });

  test("DirectAnswerResponseSchema validates correct shape", () => {
    const payload = {
      transcription: "1. Selesaikan $2x + 6 = 14$.\n2. Hitung luas lingkaran r = 7 cm.",
      directAnswers: [
        {
          number: 1,
          questionSnippet: "Selesaikan $2x + 6 = 14$",
          answer: "x = 4",
          keyExplanation: "Kurangkan 6 dari kedua sisi: $2x = 8$, kemudian bagi dengan 2 sehingga $x = 4$.",
        },
        {
          number: 2,
          questionSnippet: "Hitung luas lingkaran r = 7 cm",
          answer: "154 cm²",
          keyExplanation: "Gunakan rumus $L = \\pi r^2 = \\frac{22}{7} \\times 7 \\times 7 = 154$.",
        },
      ],
    };

    const parsed = DirectAnswerResponseSchema.parse(payload);
    expect(parsed.directAnswers.length).toBe(2);
    expect(parsed.directAnswers[0].number).toBe(1);
    expect(parsed.directAnswers[0].answer).toBe("x = 4");
  });

  test("DirectAnswerItemSchema rejects invalid item missing answer", () => {
    const invalid = {
      number: 1,
      questionSnippet: "Pertanyaan",
      // missing answer and keyExplanation
    };
    expect(() => DirectAnswerItemSchema.parse(invalid)).toThrow();
  });

  test("BodySchema accepts scanMode direct_answer and images array", () => {
    const body = {
      scanMode: "direct_answer",
      images: [
        {
          base64: "iVBORw0KGgoAAAANSUhEUgAAAAE=",
          mimeType: "image/png",
        },
      ],
    };
    const parsed = BodySchema.parse(body);
    expect(parsed.scanMode).toBe("direct_answer");
    expect(parsed.images).toBeDefined();
    expect(parsed.images?.length).toBe(1);
  });

  test("BodySchema accepts scanMode learning and aliases RequestSchema", () => {
    expect(RequestSchema).toBe(BodySchema);
    const body = {
      scanMode: "learning",
      fileType: "image" as const,
      fileBase64: "dGVzdGltYWdl",
      mimeType: "image/jpeg",
    };
    const parsed = BodySchema.parse(body);
    expect(parsed.scanMode).toBe("learning");
    expect(parsed.fileType).toBe("image");
  });
});
