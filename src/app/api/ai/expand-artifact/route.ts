import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { chatJSON, AIUnavailableError } from "@/lib/ai/llm";
import {
  FlashcardItemSchema,
  QuestionSchema,
  MindMapNodeSchema,
  ReportSectionSchema,
} from "@/lib/ai/prompts";
import { shuffleQuestionOptions } from "@/lib/rooms/store";

export const maxDuration = 90;

const ExpandRequestSchema = z.object({
  artifact: z.enum([
    "summary",
    "flashcards",
    "quiz",
    "mindmap",
    "infographic",
    "table",
    "report",
  ]),
  question: z.string().min(2).max(500),
  sourceText: z.string().min(20),
  columns: z.array(z.string()).optional(),
  existingItems: z.array(z.string()).optional(),
});

const SummaryExpansionSchema = z.object({
  answer: z.string().min(5),
  newTakeaways: z.array(z.string()).optional().default([]),
  newGlossary: z
    .array(
      z.object({
        term: z.string(),
        meaning: z.string(),
        category: z.string().optional().default("Istilah"),
      })
    )
    .optional()
    .default([]),
});

const FlashcardExpansionSchema = z.object({
  flashcards: z.array(FlashcardItemSchema).min(1),
});

const QuizExpansionSchema = z.object({
  questions: z.array(QuestionSchema).min(1),
});

const MindMapExpansionSchema = z.object({
  newBranches: z.array(MindMapNodeSchema).min(1),
});

const InfographicExpansionSchema = z.object({
  newPillars: z
    .array(
      z.object({
        title: z.string(),
        keyPoints: z.array(z.string()).min(1),
        quoteOrMnemonic: z.string().optional().default(""),
      })
    )
    .min(1),
});

const TableExpansionSchema = z.object({
  newRows: z
    .array(
      z.record(
        z.string(),
        z
          .union([z.string(), z.number(), z.boolean(), z.null()])
          .transform((v) => (v === null ? "" : typeof v === "boolean" ? String(v) : v))
      )
    )
    .min(1),
});

const ReportExpansionSchema = z.object({
  newSection: ReportSectionSchema,
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 25, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = ExpandRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const { artifact, question, sourceText, columns, existingItems } = parsed.data;
  const material = sourceText.slice(0, 32_000);
  const existingNote =
    existingItems && existingItems.length > 0
      ? `\nJangan mengulang poin/judul yang sudah ada berikut:\n- ${existingItems.slice(0, 25).join("\n- ")}`
      : "";

  try {
    if (artifact === "summary") {
      const data = await chatJSON(
        [
          {
            role: "system",
            content: `Kamu memperdalam intisari bahan ajar secara akurat setara Google NotebookLM berdasarkan pertanyaan pengguna.
Balas HANYA objek JSON valid:
{
  "answer": "penjelasan mendalam 1-2 paragraf yang langsung menjawab pertanyaan berdasarkan bahan ajar beserta contoh konkretnya",
  "newTakeaways": ["2-3 poin kunci baru dari bahan terkait pertanyaan"],
  "newGlossary": [{"term": "istilah penting", "meaning": "arti singkat", "category": "kategori"}]
}`,
          },
          {
            role: "user",
            content: `Pertanyaan pendalaman: ${question}${existingNote}\n\n=== BAHAN AJAR ===\n${material}\n=== AKHIR BAHAN AJAR ===`,
          },
        ],
        SummaryExpansionSchema,
        { temperature: 0.35, timeoutMs: 75_000 }
      );
      return NextResponse.json({
        success: true,
        artifact,
        question,
        ...data,
      });
    }

    if (artifact === "flashcards") {
      const data = await chatJSON(
        [
          {
            role: "system",
            content: `Kamu membuat 4 kartu belajar (flashcards) baru setara Google NotebookLM yang menjawab atau memperdalam pertanyaan pengguna berdasarkan bahan ajar.
Balas HANYA objek JSON valid:
{
  "flashcards": [
    {"id": "exp-1", "front": "pertanyaan spesifik", "back": "jawaban langsung + penjelasan ringkas dari bahan", "tag": "sub-topik 2-3 kata", "hint": "petunjuk 1 kalimat"}
  ]
}`,
          },
          {
            role: "user",
            content: `Fokus / pertanyaan: ${question}${existingNote}\n\n=== BAHAN AJAR ===\n${material}\n=== AKHIR BAHAN AJAR ===`,
          },
        ],
        FlashcardExpansionSchema,
        { temperature: 0.4, timeoutMs: 75_000 }
      );
      const flashcards = data.flashcards.map((c, idx) => ({
        ...c,
        id: `exp-${Date.now()}-${idx + 1}`,
        tag: c.tag?.trim() || "Pendalaman",
      }));
      return NextResponse.json({ success: true, artifact, flashcards });
    }

    if (artifact === "quiz") {
      const data = await chatJSON(
        [
          {
            role: "system",
            content: `Kamu membuat 3 soal pilihan ganda baru (4 opsi A, B, C, D; tepat satu isCorrect: true) yang menguji pemahaman atas pertanyaan/fokus pengguna berdasarkan bahan ajar.
Balas HANYA objek JSON valid:
{
  "questions": [
    {
      "question": "pertanyaan spesifik",
      "options": [
        {"label": "A", "text": "...", "isCorrect": false},
        {"label": "B", "text": "...", "isCorrect": true},
        {"label": "C", "text": "...", "isCorrect": false},
        {"label": "D", "text": "...", "isCorrect": false}
      ],
      "correctAnswer": "B",
      "explanation": "penjelasan 1-2 kalimat mengapa jawaban benar menurut bahan",
      "conceptTag": "topik 2-4 kata"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Fokus / pertanyaan: ${question}${existingNote}\n\n=== BAHAN AJAR ===\n${material}\n=== AKHIR BAHAN AJAR ===`,
          },
        ],
        QuizExpansionSchema,
        { temperature: 0.4, timeoutMs: 75_000 }
      );
      const questions = data.questions.map((q, idx) => ({
        ...shuffleQuestionOptions(q),
        id: crypto.randomUUID(),
        questionOrder: idx + 1,
      }));
      return NextResponse.json({ success: true, artifact, questions });
    }

    if (artifact === "mindmap") {
      const data = await chatJSON(
        [
          {
            role: "system",
            content: `Kamu memperluas peta konsep (MindMap) setara Google NotebookLM dengan 1-2 cabang utama baru beserta 2-4 sub-cabang (children) yang menjawab pertanyaan pengguna berdasarkan bahan ajar.
Balas HANYA objek JSON valid:
{
  "newBranches": [
    {
      "id": "branch-exp-1",
      "label": "Judul cabang 2-5 kata",
      "category": "Kategori",
      "description": "1 kalimat penjelasan konsep/fakta dari bahan",
      "children": [
        {"id": "leaf-exp-1", "label": "Sub-konsep", "description": "Penjelasan konkret + contoh dari bahan"}
      ]
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Pertanyaan / cabang yang ingin diperluas: ${question}${existingNote}\n\n=== BAHAN AJAR ===\n${material}\n=== AKHIR BAHAN AJAR ===`,
          },
        ],
        MindMapExpansionSchema,
        { temperature: 0.35, timeoutMs: 75_000 }
      );
      const stamp = Date.now();
      const newBranches = data.newBranches.map((b, bIdx) => ({
        ...b,
        id: `branch-${stamp}-${bIdx}`,
        children: b.children?.map((c, cIdx) => ({
          ...c,
          id: `leaf-${stamp}-${bIdx}-${cIdx}`,
        })),
      }));
      return NextResponse.json({ success: true, artifact, newBranches });
    }

    if (artifact === "infographic") {
      const data = await chatJSON(
        [
          {
            role: "system",
            content: `Kamu menambahkan 1-2 pilar visual baru pada infografik setara Google NotebookLM untuk menjawab pertanyaan pengguna berdasarkan bahan ajar.
Balas HANYA objek JSON valid:
{
  "newPillars": [
    {
      "title": "Judul pilar baru",
      "keyPoints": ["poin konkret 1 dari bahan", "poin konkret 2 dari bahan", "poin konkret 3 dari bahan"],
      "quoteOrMnemonic": "rumus singkat / pola kalimat / jembatan keledai"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Pertanyaan / aspek visual yang ingin ditambahkan: ${question}${existingNote}\n\n=== BAHAN AJAR ===\n${material}\n=== AKHIR BAHAN AJAR ===`,
          },
        ],
        InfographicExpansionSchema,
        { temperature: 0.4, timeoutMs: 75_000 }
      );
      return NextResponse.json({ success: true, artifact, newPillars: data.newPillars });
    }

    if (artifact === "table") {
      const cols = columns && columns.length > 0 ? columns : ["Konsep", "Kategori", "Penjelasan", "Contoh"];
      const data = await chatJSON(
        [
          {
            role: "system",
            content: `Kamu menambahkan 4-6 baris data baru ke dalam tabel terstruktur setara Google NotebookLM untuk menjawab permintaan/pertanyaan pengguna berdasarkan bahan ajar.
Setiap objek baris WAJIB menggunakan nama kolom persis berikut: ${JSON.stringify(cols)}.
Balas HANYA objek JSON valid:
{
  "newRows": [
    {${cols.map((c) => `${JSON.stringify(c)}: "isi berdasarkan bahan"`).join(", ")}}
  ]
}`,
          },
          {
            role: "user",
            content: `Pertanyaan / baris data yang ingin ditambahkan: ${question}${existingNote}\n\n=== BAHAN AJAR ===\n${material}\n=== AKHIR BAHAN AJAR ===`,
          },
        ],
        TableExpansionSchema,
        { temperature: 0.35, timeoutMs: 75_000 }
      );
      const normalizedRows = data.newRows.map((row) => {
        const normalized: Record<string, string | number> = {};
        const entries = Object.entries(row);
        cols.forEach((col, colIdx) => {
          if (col in row) {
            normalized[col] = row[col];
          } else {
            const ciMatch = entries.find(
              ([k]) => k.toLowerCase().trim() === col.toLowerCase().trim()
            );
            normalized[col] = ciMatch ? ciMatch[1] : (entries[colIdx]?.[1] ?? "");
          }
        });
        return normalized;
      });
      return NextResponse.json({ success: true, artifact, newRows: normalizedRows });
    }

    // artifact === "report"
    const data = await chatJSON(
      [
        {
          role: "system",
          content: `Kamu menambahkan satu bagian analisis mendalam baru pada Laporan Briefing (Briefing Doc setara Google NotebookLM) untuk menjawab pertanyaan pengguna berdasarkan bahan ajar.
Balas HANYA objek JSON valid:
{
  "newSection": {
    "heading": "Judul bagian analisis yang spesifik",
    "content": "1-2 paragraf penjelasan analisis mendalam yang langsung menjawab pertanyaan pengguna berdasarkan bahan ajar",
    "keyPoints": ["poin bukti/contoh konkret 1 dari bahan", "poin bukti/contoh konkret 2 dari bahan", "poin bukti/contoh konkret 3 dari bahan"]
  }
}`,
        },
        {
          role: "user",
          content: `Pertanyaan pendalaman laporan: ${question}${existingNote}\n\n=== BAHAN AJAR ===\n${material}\n=== AKHIR BAHAN AJAR ===`,
        },
      ],
      ReportExpansionSchema,
      { temperature: 0.35, timeoutMs: 75_000 }
    );
    return NextResponse.json({ success: true, artifact, newSection: data.newSection });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[expand-artifact]", error);
    return NextResponse.json(
      { error: "Gagal memperluas artifak. Coba lagi." },
      { status: 500 }
    );
  }
}
