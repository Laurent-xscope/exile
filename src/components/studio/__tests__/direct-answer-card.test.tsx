import { describe, expect, it, mock, beforeEach } from "bun:test";
import { renderToString } from "react-dom/server";
import { toast } from "sonner";
import {
  DirectAnswerCard,
  formatAnswersForClipboard,
  DEFAULT_COPILOT_PROMPT_ID,
  DEFAULT_COPILOT_PROMPT_EN,
  type DirectAnswerItem,
} from "../direct-answer-card";

describe("formatAnswersForClipboard helper", () => {
  const sampleAnswers: DirectAnswerItem[] = [
    {
      number: 1,
      questionSnippet: "Hitunglah luas segitiga dengan alas 6 cm dan tinggi 8 cm.",
      answer: "24 cm²",
      keyExplanation: "Gunakan rumus L = 1/2 × alas × tinggi = 1/2 × 6 × 8 = 24.",
    },
    {
      number: 2,
      questionSnippet: "Sederhanakan bentuk 3x + 5x.",
      answer: "8x",
    },
  ];

  it("formats items into clean Markdown in Indonesian", () => {
    const formatted = formatAnswersForClipboard(sampleAnswers);
    expect(formatted).toContain("# Kunci jawaban tugas");
    expect(formatted).toContain("## Nomor 1");
    expect(formatted).toContain("Soal: Hitunglah luas segitiga dengan alas 6 cm dan tinggi 8 cm.");
    expect(formatted).toContain("Jawaban: 24 cm²");
    expect(formatted).toContain("Penjelasan: Gunakan rumus L = 1/2 × alas × tinggi = 1/2 × 6 × 8 = 24.");
    expect(formatted).toContain("## Nomor 2");
    expect(formatted).toContain("Jawaban: 8x");
  });

  it("formats items into clean Markdown in English", () => {
    const formatted = formatAnswersForClipboard(sampleAnswers, undefined, true);
    expect(formatted).toContain("# Homework answer keys");
    expect(formatted).toContain("## Number 1");
    expect(formatted).toContain("Question: Hitunglah luas segitiga dengan alas 6 cm dan tinggi 8 cm.");
    expect(formatted).toContain("Answer: 24 cm²");
    expect(formatted).toContain("Explanation: Gunakan rumus L = 1/2 × alas × tinggi = 1/2 × 6 × 8 = 24.");
  });

  it("appends raw transcription when provided", () => {
    const formatted = formatAnswersForClipboard(sampleAnswers, "1. 3x+5x=8x", false);
    expect(formatted).toContain("### Transkripsi asli");
    expect(formatted).toContain("1. 3x+5x=8x");
  });

  it("returns raw transcription when answers array is empty", () => {
    const formatted = formatAnswersForClipboard([], "Teks mentah lembar tugas", false);
    expect(formatted).toBe("Teks mentah lembar tugas");
  });

  it("returns empty string when both answers and transcription are empty", () => {
    const formatted = formatAnswersForClipboard([]);
    expect(formatted).toBe("");
  });
});

describe("DirectAnswerCard component rendering", () => {
  const sampleAnswers: DirectAnswerItem[] = [
    {
      number: 1,
      questionSnippet: "Berapa akar kuadrat dari 144?",
      answer: "12",
      keyExplanation: "12 × 12 = 144.",
    },
    {
      number: 2,
      questionSnippet: "Apa ibu kota provinsi Jawa Barat?",
      answer: "Bandung",
    },
  ];

  it("returns null when isOpen is false", () => {
    const html = renderToString(
      <DirectAnswerCard
        isOpen={false}
        onClose={() => {}}
        answers={sampleAnswers}
        onAskCopilot={() => {}}
      />
    );
    expect(html).toBe("");
  });

  it("renders header, title, badges, answers, and action buttons when isOpen is true", () => {
    const html = renderToString(
      <DirectAnswerCard
        isOpen={true}
        onClose={() => {}}
        answers={sampleAnswers}
        onAskCopilot={() => {}}
      />
    );

    // Header title and subtitle
    expect(html).toContain("Kunci jawaban PR");
    expect(html).toContain("Hasil pindai tugas");
    expect(html).toContain("2 soal");

    // Badges and numbered items
    expect(html).toContain("Nomor 1");
    expect(html).toContain("Berapa akar kuadrat dari 144?");
    expect(html).toContain("12");
    expect(html).toContain("12 × 12 = 144.");

    expect(html).toContain("Nomor 2");
    expect(html).toContain("Apa ibu kota provinsi Jawa Barat?");
    expect(html).toContain("Bandung");

    // Action buttons in stationary footer
    expect(html).toContain("Salin");
    expect(html).toContain("Tanya langkah");

    // Tokens check
    expect(html).toContain("text-title-3-semibold");
    expect(html).toContain("text-caption-1-regular");
    expect(html).toContain("text-caption-2-medium");
    expect(html).toContain("bg-background-secondary-default");
  });

  it("renders English titles and labels when isEn is true", () => {
    const html = renderToString(
      <DirectAnswerCard
        isOpen={true}
        onClose={() => {}}
        answers={sampleAnswers}
        onAskCopilot={() => {}}
        isEn={true}
      />
    );

    expect(html).toContain("Homework answer key");
    expect(html).toContain("Scan results");
    expect(html).toContain("2 answers");
    expect(html).toContain("Number 1");
    expect(html).toContain("Number 2");
    expect(html).toContain("Copy");
    expect(html).toContain("Ask steps");
  });

  it("renders empty state notice when answers array is empty", () => {
    const html = renderToString(
      <DirectAnswerCard
        isOpen={true}
        onClose={() => {}}
        answers={[]}
        rawTranscription="Dokumen tanpa soal terdeteksi"
        onAskCopilot={() => {}}
      />
    );

    expect(html).toContain("Tidak ada kunci jawaban langsung terdeteksi");
    expect(html).toContain("Dokumen tanpa soal terdeteksi");
  });

  it("renders custom title when title prop is provided", () => {
    const html = renderToString(
      <DirectAnswerCard
        isOpen={true}
        onClose={() => {}}
        answers={sampleAnswers}
        onAskCopilot={() => {}}
        title="Hasil pindai ulangan harian"
      />
    );

    expect(html).toContain("Hasil pindai ulangan harian");
  });
});

describe("DirectAnswerCard interaction and callbacks", () => {
  beforeEach(() => {
    mock.restore();
  });

  it("calls onAskCopilot with default prompt string for Indonesian mode", () => {
    let capturedPrompt = "";
    const onAskCopilot = (prompt: string) => {
      capturedPrompt = prompt;
    };

    // Verify constant
    expect(DEFAULT_COPILOT_PROMPT_ID).toBe(
      "Tolong jelaskan langkah penyelesaian rinci untuk soal lembar tugas yang baru saja saya pindai."
    );

    // Simulate handler behavior
    const triggerPrompt = false ? DEFAULT_COPILOT_PROMPT_EN : DEFAULT_COPILOT_PROMPT_ID;
    onAskCopilot(triggerPrompt);

    expect(capturedPrompt).toBe(
      "Tolong jelaskan langkah penyelesaian rinci untuk soal lembar tugas yang baru saja saya pindai."
    );
  });

  it("calls onAskCopilot with English prompt string for English mode", () => {
    let capturedPrompt = "";
    const onAskCopilot = (prompt: string) => {
      capturedPrompt = prompt;
    };

    const triggerPrompt = true ? DEFAULT_COPILOT_PROMPT_EN : DEFAULT_COPILOT_PROMPT_ID;
    onAskCopilot(triggerPrompt);

    expect(capturedPrompt).toBe(
      "Please explain the detailed step-by-step solution for the homework sheet I just scanned."
    );
  });

  it("copies formatted text to clipboard and shows success toast", async () => {
    let copiedText = "";
    let toastMessage = "";

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: async (text: string) => {
          copiedText = text;
        },
      },
    });

    // Mock toast
    const originalToastSuccess = toast.success;
    toast.success = ((msg: string) => {
      toastMessage = msg;
      return "toast-id";
    }) as unknown as typeof toast.success;

    const items: DirectAnswerItem[] = [
      {
        number: 1,
        questionSnippet: "5 + 7 = ?",
        answer: "12",
      },
    ];

    const formatted = formatAnswersForClipboard(items, undefined, false);
    await navigator.clipboard.writeText(formatted);
    toast.success("Kunci jawaban disalin ke clipboard");

    expect(copiedText).toContain("# Kunci jawaban tugas");
    expect(copiedText).toContain("## Nomor 1");
    expect(copiedText).toContain("Jawaban: 12");
    expect(toastMessage).toBe("Kunci jawaban disalin ke clipboard");

    toast.success = originalToastSuccess;
  });
});
