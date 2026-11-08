import { describe, expect, it } from "bun:test";
import { formatAnswersForClipboard } from "@/components/studio/direct-answer-card";
import { PRE_SCAN_TEXTS } from "@/components/studio/pre-scan-modal";

describe("Studio Scanner Flow Integration Contracts", () => {
  it("uses strict sentence case for pre-scan modal copy", () => {
    expect(PRE_SCAN_TEXTS.id.title).toBe("Pindai lembar tugas");
    expect(PRE_SCAN_TEXTS.id.description).toBe("Pilih mode pemrosesan");
    expect(PRE_SCAN_TEXTS.en.title).toBe("Scan assignment sheet");
    expect(PRE_SCAN_TEXTS.en.description).toBe("Select processing mode");
  });

  it("formats answer keys for clipboard correctly", () => {
    const text = formatAnswersForClipboard(
      [
        {
          number: 1,
          questionSnippet: "Hitung luas segitiga",
          answer: "24 cm2",
          keyExplanation: "Rumus 1/2 x alas x tinggi",
        },
      ],
      "Soal no 1: alas 6 cm, tinggi 8 cm",
      false
    );
    expect(text).toContain("# Kunci jawaban tugas");
    expect(text).toContain("## Nomor 1");
    expect(text).toContain("Soal: Hitung luas segitiga");
    expect(text).toContain("Jawaban: 24 cm2");
    expect(text).toContain("Penjelasan: Rumus 1/2 x alas x tinggi");
  });

  it("formats English answer keys for clipboard correctly", () => {
    const text = formatAnswersForClipboard(
      [
        {
          number: 2,
          questionSnippet: "Solve x + 3 = 7",
          answer: "x = 4",
        },
      ],
      undefined,
      true
    );
    expect(text).toContain("# Homework answer keys");
    expect(text).toContain("## Number 2");
    expect(text).toContain("Question: Solve x + 3 = 7");
    expect(text).toContain("Answer: x = 4");
  });
});
