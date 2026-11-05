import { z } from "zod";
import type { Question } from "@/lib/ai/prompts";
import { shuffleQuestionOptions, type QuizDifficultyLevel } from "@/lib/rooms/store";
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
- Jika diberikan bahan ajar lengkap, soal harus bisa dijawab dari isi bahan tersebut. Jika hanya diberikan topik atau instruksi tentang apa yang akan dipelajari, susun soal dari fakta keilmuan yang akurat sesuai topik/instruksi itu.
- Sesuaikan kompleksitas soal dengan tingkat kesulitan yang diminta oleh pengajar (mudah, sedang, sulit, atau campuran).
- Satu pertanyaan menguji satu konsep penting. Tulis kalimat biasa, jelas, dan lugas.
- Empat pilihan, satu benar. Pilihan salah harus masuk akal tetapi jelas salah, dan panjangnya mirip dengan pilihan yang benar.
- Letak jawaban benar (answerIndex 0, 1, 2, 3) wajib bervariasi secara acak dan tidak boleh selalu berada di indeks 0.
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

const DIFFICULTY_GUIDE: Record<QuizDifficultyLevel, string> = {
  mudah:
    "Tingkat kesulitan: MUDAH — fokus pada pengenalan konsep dasar, definisi inti, dan pemahaman langsung dari materi.",
  sedang:
    "Tingkat kesulitan: SEDANG — fokus pada penerapan konsep, hubungan sebab-akibat, dan contoh nyata dari materi.",
  sulit:
    "Tingkat kesulitan: SULIT (HOTS) — fokus pada analisis kritis, evaluasi kasus, perbandingan mendalam, dan pemecahan masalah kompleks.",
  campuran:
    "Tingkat kesulitan: CAMPURAN — susun soal secara bertahap dari mudah di awal, sedang di tengah, hingga sulit (analisis/HOTS) di akhir.",
};

export async function generateQuizFromText(params: {
  text: string;
  questionCount: number;
  instructions?: string;
  sourceName?: string;
  difficulty?: QuizDifficultyLevel;
}): Promise<GeneratedQuiz> {
  const count = Math.min(Math.max(params.questionCount, 1), 20);
  const diff = params.difficulty || "sedang";
  const user = [
    params.sourceName ? `Nama berkas: ${params.sourceName}` : "",
    `Jumlah soal: ${count}`,
    DIFFICULTY_GUIDE[diff] || DIFFICULTY_GUIDE.sedang,
    params.instructions?.trim() ? `Instruksi guru: ${params.instructions.trim()}` : "",
    "",
    "=== BAHAN AJAR / INSTRUKSI TOPIK ===",
    params.text,
    "=== AKHIR BAHAN ===",
  ]
    .filter((line, i) => line !== "" || i > 3)
    .join("\n");

  const result = await chatJSON(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    GeneratedSchema,
    { temperature: 0.5 }
  );

  const questions: Question[] = result.questions.slice(0, count).map((q, i) => {
    const rawQuestion: Question = {
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
    };
    return shuffleQuestionOptions(rawQuestion);
  });

  return { title: result.title.trim(), questions };
}
