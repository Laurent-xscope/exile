import { z } from "zod";
import type { Question } from "@/lib/ai/prompts";
import { shuffleQuestionOptions, type QuizDifficultyLevel } from "@/lib/rooms/store";
import { chatJSON, AIUnavailableError } from "./llm";

const GeneratedSchema = z.object({
  title: z.string().min(2),
  questions: z
    .array(
      z.object({
        question: z.string().min(8),
        options: z.array(z.string().min(1)).length(4),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(5),
        distractorRationales: z.array(z.string()).length(4).optional(),
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
- Sertakan penjelasan alasan mengapa tiap opsi salah pada "distractorRationales" (4 string, untuk opsi benar tulis "Jawaban benar").
- Letak jawaban benar (answerIndex 0, 1, 2, 3) wajib bervariasi secara acak dan tidak boleh selalu berada di indeks 0.
- "explanation": satu atau dua kalimat yang menjelaskan mengapa jawaban itu benar.
- "topic": 2-4 kata subtopik konsep yang diuji.
- Jangan menulis "A." atau "B." di dalam teks pilihan.
- Pakai bahasa yang sama dengan masukan pengguna.
- Balas hanya JSON: {"title": string, "questions": [{"question": string, "options": [4 string], "answerIndex": 0-3, "explanation": string, "distractorRationales": [4 string], "topic": string}]}`;

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

/** Heuristic Fallback Generator: Membuat soal otomatis dari bahan jika AI down */
function generateHeuristicFallbackQuiz(text: string, count: number, topicHint?: string): GeneratedQuiz {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 180);

  const title = topicHint?.trim() || "Kuis materi pembelajaran";
  const questions: Question[] = [];

  for (let i = 0; i < Math.min(count, Math.max(sentences.length, 3)); i++) {
    const target = sentences[i % sentences.length] || `Konsep penting ${i + 1} dari materi.`;
    const words = target.split(/\s+/);
    const keyword = words.length > 4 ? words[Math.floor(words.length / 2)] : "prinsip utama";
    const clozeQuestion = target.replace(keyword, "_____");

    questions.push(
      shuffleQuestionOptions({
        questionOrder: i + 1,
        question: `Lengkapilah pernyataan berikut berdasarkan materi: "${clozeQuestion}"`,
        options: [
          {
            label: "A",
            text: keyword,
            isCorrect: true,
            distractorRationale: "Tepat sesuai dengan rujukan materi bahan ajar.",
          },
          {
            label: "B",
            text: `Kebalikan dari ${keyword}`,
            isCorrect: false,
            distractorRationale: "Merupakan lawan arti dari konteks kalimat materi.",
          },
          {
            label: "C",
            text: `Bukan bagian dari ${keyword}`,
            isCorrect: false,
            distractorRationale: "Tidak selaras dengan gagasan utama kalimat rujukan.",
          },
          {
            label: "D",
            text: `Variasi lain ${keyword}`,
            isCorrect: false,
            distractorRationale: "Kurang spesifik dibandingkan istilah asli pada bahan ajar.",
          },
        ],
        correctAnswer: "A",
        explanation: `Pernyataan lengkap: "${target}".`,
        conceptTag: topicHint || "Pemahaman konsep",
      })
    );
  }
  return { title, questions };
}

export async function generateQuizFromText(params: {
  text: string;
  questionCount: number;
  instructions?: string;
  sourceName?: string;
  difficulty?: QuizDifficultyLevel;
}): Promise<GeneratedQuiz> {
  const count = Math.min(Math.max(params.questionCount, 1), 20);
  const diff = params.difficulty || "sedang";
  const sanitizedText = params.text.replace(/===/g, "---").trim();
  const sanitizedInstructions = params.instructions?.replace(/===/g, "---").trim();

  const user = [
    params.sourceName ? `Nama berkas: ${params.sourceName.replace(/[^\w\s.-]/g, "")}` : "",
    `Jumlah soal: ${count}`,
    DIFFICULTY_GUIDE[diff] || DIFFICULTY_GUIDE.sedang,
    sanitizedInstructions ? `<teacher_instructions>${sanitizedInstructions}</teacher_instructions>` : "",
    "",
    "<learning_material>",
    sanitizedText,
    "</learning_material>",
  ]
    .filter((line, i) => line !== "" || i > 3)
    .join("\n");

  let result;
  try {
    result = await chatJSON(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      GeneratedSchema,
      { temperature: 0.5 }
    );
  } catch (err) {
    if (err instanceof AIUnavailableError || (err instanceof Error && err.message.includes("fetch"))) {
      console.warn("[quiz-gen] AI unavailable, activating heuristic fallback generator.");
      return generateHeuristicFallbackQuiz(sanitizedText, count, params.sourceName || params.instructions);
    }
    throw err;
  }

  const questions: Question[] = result.questions.slice(0, count).map((q, i) => {
    const rawQuestion: Question = {
      questionOrder: i + 1,
      question: q.question.trim(),
      options: q.options.map((text, idx) => ({
        label: LABELS[idx],
        text: text.replace(/^[A-Da-d][.)]\s+/, "").trim(),
        isCorrect: idx === q.answerIndex,
        distractorRationale: q.distractorRationales?.[idx] || undefined,
      })),
      correctAnswer: LABELS[q.answerIndex],
      explanation: q.explanation.trim(),
      conceptTag: q.topic.trim(),
    };
    return shuffleQuestionOptions(rawQuestion);
  });

  return { title: result.title.trim(), questions };
}
