import { describe, expect, it } from "bun:test";
import { formatAnswersForClipboard } from "@/components/studio/direct-answer-card";
import { PRE_SCAN_TEXTS } from "@/components/studio/pre-scan-modal";
import {
  enforce128kCap,
  COPILOT_MAX_STORAGE_BYTES,
  type CopilotChatMessageItem,
} from "@/lib/studio/copilot-chat-store";

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

  it("verifies mindmap active collapse and expand state calculations", () => {
    const branches = [
      { id: "branch-1", label: "Cabang 1" },
      { id: "branch-2", label: "Cabang 2" },
      { id: "branch-3", label: "Cabang 3" },
    ];
    const totalBranches = branches.length;

    // Initially nothing collapsed
    const collapsedNone: Record<string, boolean> = {};
    const countNone = Object.values(collapsedNone).filter(Boolean).length;
    const isAllExpandedNone = countNone === 0;
    const isAllCollapsedNone = totalBranches > 0 && countNone >= totalBranches;
    expect(isAllExpandedNone).toBe(true);
    expect(isAllCollapsedNone).toBe(false);

    // All branches collapsed
    const collapsedAll: Record<string, boolean> = {
      "branch-1": true,
      "branch-2": true,
      "branch-3": true,
    };
    const countAll = Object.values(collapsedAll).filter(Boolean).length;
    const isAllExpandedAll = countAll === 0;
    const isAllCollapsedAll = totalBranches > 0 && countAll >= totalBranches;
    expect(isAllExpandedAll).toBe(false);
    expect(isAllCollapsedAll).toBe(true);

    // Partially collapsed
    const collapsedPartial: Record<string, boolean> = {
      "branch-1": true,
    };
    const countPartial = Object.values(collapsedPartial).filter(Boolean).length;
    const isAllExpandedPartial = countPartial === 0;
    const isAllCollapsedPartial = totalBranches > 0 && countPartial >= totalBranches;
    expect(isAllExpandedPartial).toBe(false);
    expect(isAllCollapsedPartial).toBe(false);
  });

  it("strictly enforces 128k cap on long Copilot conversation while preserving context", () => {
    const firstMsg: CopilotChatMessageItem = {
      role: "assistant",
      content: "Initial teacher greeting and instructions.",
    };
    const largeMiddle: CopilotChatMessageItem[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Question and detailed response turn #${i}: ` + "A".repeat(12000),
    }));
    const latestUser: CopilotChatMessageItem = {
      role: "user",
      content: "Tolong periksa dan berikan jawaban langsung untuk lembar tugas terpindai ini.",
    };
    const latestAssistant: CopilotChatMessageItem = {
      role: "assistant",
      content: "Berikut adalah jawaban langsung dan pembahasan untuk lembar tugas terpindai Anda.",
    };

    const messages = [firstMsg, ...largeMiddle, latestUser, latestAssistant];
    expect(JSON.stringify(messages).length).toBeGreaterThan(COPILOT_MAX_STORAGE_BYTES);

    const capped = enforce128kCap(messages);
    expect(JSON.stringify(capped).length).toBeLessThanOrEqual(COPILOT_MAX_STORAGE_BYTES);
    expect(capped[0]).toEqual(firstMsg);
    expect(capped[capped.length - 2]).toEqual(latestUser);
    expect(capped[capped.length - 1]).toEqual(latestAssistant);
  });
});
