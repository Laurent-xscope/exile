import { z } from "zod";
import type { Question } from "@/lib/ai/prompts";
import { chatJSON } from "./llm";

const GeneratedSchema = z.object({
  title: z.string().min(2),
  questions: z
    .array(
      z.object({
        question: z.string().min(8),
        options: z.array(z.string().min(1)).length(4),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(5),
        topic: z.string().min(2),
      })
    )
    .min(1),
});

const SYSTEM = `Kamu membuat soal pilihan ganda yang jelas dan akurat untuk pembelajaran.

Aturan:
- Jika diberikan bahan ajar lengkap, soal harus bisa dijawab dari isi bahan tersebut. Jika hanya diberikan topik singkat, susun soal dari fakta keilmuan yang akurat tentang topik itu.
- Satu pertanyaan menguji satu konsep penting. Tulis kalimat biasa, jelas, dan lugas.
- Empat pilihan, satu benar. Pilihan salah harus masuk akal tetapi jelas salah, dan panjangnya mirip dengan pilihan yang benar.
- Letak jawaban benar harus bervariasi (jangan selalu pilihan pertama).
- "explanation": satu atau dua kalimat yang menjelaskan mengapa jawaban itu benar.
- "topic": 2-4 kata subtopik konsep yang diuji.
- Jangan memakai kata "miskonsepsi", "pengecoh", atau label semacamnya. Jangan menulis "A." atau "B." di dalam teks pilihan.
- Pakai bahasa yang sama dengan masukan pengguna.
- Balas hanya JSON: {"title": string, "questions": [{"question": string, "options": [4 string], "answerIndex": 0-3, "explanation": string, "topic": string}]}`;

export interface GeneratedQuiz {
  title: string;
  questions: Question[];
}

const LABELS = ["A", "B", "C", "D"] as const;

export async function generateQuizFromText(params: {
  text: string;
  questionCount: number;
  instructions?: string;
  sourceName?: string;
}): Promise<GeneratedQuiz> {
  const count = Math.min(Math.max(params.questionCount, 1), 20);
  const user = [
    params.sourceName ? `Nama berkas: ${params.sourceName}` : "",
    `Jumlah soal: ${count}`,
    params.instructions?.trim() ? `Permintaan guru: ${params.instructions.trim()}` : "",
    "",
    "=== BAHAN AJAR ===",
    params.text,
    "=== AKHIR BAHAN ===",
  ]
    .filter((line, i) => line !== "" || i > 2)
    .join("\n");

  const result = await chatJSON(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    GeneratedSchema,
    { temperature: 0.5 }
  );

  const questions: Question[] = result.questions.slice(0, count).map((q, i) => ({
    questionOrder: i + 1,
    question: q.question.trim(),
    options: q.options.map((text, idx) => ({
      label: LABELS[idx],
      text: text.replace(/^[A-Da-d][.)]\s+/, "").trim(),
      isCorrect: idx === q.answerIndex,
    })),
    correctAnswer: LABELS[q.answerIndex],
    explanation: q.explanation.trim(),
    conceptTag: q.topic.trim(),
  }));

  return { title: result.title.trim(), questions };
}
