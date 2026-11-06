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

const SYSTEM = `Kamu adalah pakar asesmen pendidikan dan kurikulum yang merancang soal asesmen pilihan ganda berkualitas tinggi untuk pembelajaran aktif.

Pedoman Langkah Pembuatan Soal (Step-by-Step Assessment Design):
1. Analisis Sumber & Topik: Identifikasi konsep-konsep esensial dari bahan ajar atau instruksi topik yang diberikan. Pastikan seluruh soal berakar pada fakta ilmiah dan materi yang akurat.
2. Penentuan Tingkat Kesulitan:
   - MUDAH (Comprehension): TIDAK BOLEH berupa hafalan definisi kata demi kata atau pengecoh konyol/asal-asalan. Soal mudah tetap menuntut pemahaman makna dari satu konsep spesifik dalam konteks wajar. Keempat opsi harus berada dalam kategori semantik dan panjang yang setara.
   - SEDANG (Application & Cause-Effect): Menuntut penerapan konsep pada situasi nyata, analisis hubungan sebab-akibat, atau pemecahan masalah satu-dua langkah. Pengecoh mewakili miskonsepsi umum peserta didik.
   - SULIT / HOTS (High-Order Thinking): Analisis kritis terhadap studi kasus, pemecahan masalah multi-langkah, evaluasi trade-off, atau prediksi akibat ketika suatu variabel dalam sistem diubah.
   - CAMPURAN (Progressive): Bagi tingkat kesulitan secara bertahap: awal mudah (pemahaman konsep), tengah sedang (aplikasi/sebab-akibat), akhir sulit (analisis kritis HOTS).
3. Struktur Pertanyaan (Stem): Tuliskan pokok soal dengan kalimat yang lugas, tidak ambigu, dan tidak menyisipkan petunjuk ke arah jawaban benar. Hindari bentuk negatif ganda (misal: "Kecuali yang bukan...").
4. Kualitas Opsi & Pengecoh (Distractors):
   - Wajib tepat 4 opsi per soal.
   - Hanya ada 1 opsi yang paling tepat/benar.
   - 3 opsi pengecoh harus masuk akal, tidak konyol, tidak saling bertentangan secara sepele, dan memiliki panjang kalimat yang setara dengan opsi benar.
   - DILARANG menggunakan opsi "Semua benar", "Semua salah", "A dan B benar", atau sejenisnya.
   - DILARANG menyertakan awalan label huruf seperti "A.", "B.", "C.", atau "D." di dalam teks opsi.
5. Keseimbangan Indeks Jawaban:
   - Letak jawaban benar ("answerIndex": 0, 1, 2, atau 3) WAJIB didistribusikan secara acak dan seimbang, tidak boleh monoton atau berkumpul di indeks tertentu.
6. Rasionalisasi Pedagogis:
   - "explanation": 1-2 kalimat padat yang menjelaskan mengapa opsi kunci tersebut benar berdasarkan prinsip ilmiah/materi.
   - "distractorRationales": Tepat 4 string berurutan sesuai urutan opsi. Untuk opsi yang benar tulis "Jawaban benar" (atau "Correct answer" bila bahasa Inggris). Untuk opsi salah, jelaskan secara spesifik kekeliruan pemahamannya.
   - "topic": 2-4 kata penanda subtopik konsep spesifik yang diuji.
7. Format Luaran (Strict JSON Only):
   - Gunakan bahasa yang sama dengan instruksi/materi pengguna (Bahasa Indonesia secara default).
   - Keluaran WAJIB berupa objek JSON valid tanpa teks pengantar, tanpa penutup percakapan, dan tanpa karakter tambahan di luar JSON.

Contoh Struktur JSON (Few-shot Example):
{
  "title": "Kuis Siklus Air dan Ekosistem",
  "questions": [
    {
      "question": "Ketika tutupan vegetasi di lereng bukit berkurang drastis akibat penebangan, bagaimanakah perubahan pada pergerakan air tanah dan limpasan permukaan (surface runoff)?",
      "options": [
        "Infiltrasi air tanah meningkat karena air langsung menyerap tanpa terhalang daun",
        "Limpasan permukaan meningkat tajam sehingga laju pengisian air tanah justru menurun",
        "Laju transpirasi lingkungan bertambah sehingga air tanah tersedot lebih cepat",
        "Kapasitas retensi tanah bertambah karena tanah langsung terkena sinar matahari"
      ],
      "answerIndex": 1,
      "explanation": "Tanpa vegetasi, air hujan tidak terserap maksimal ke pori-pori tanah (infiltrasi menurun) dan sebagian besar menjadi limpasan permukaan yang berisiko erosi.",
      "distractorRationales": [
        "Infiltrasi justru menurun drastis karena pori-pori tanah memadat tanpa akar tumbuhan.",
        "Jawaban benar",
        "Transpirasi justru berkurang signifikan karena jumlah tanaman berkurang drastis.",
        "Sinar matahari langsung justru membuat tanah kering dan retak sehingga menurunkan kemampuan retensi air."
      ],
      "topic": "Infiltrasi dan limpasan"
    }
  ]
}`;

export interface GeneratedQuiz {
  title: string;
  questions: Question[];
}

const LABELS = ["A", "B", "C", "D"] as const;

const DIFFICULTY_GUIDE: Record<QuizDifficultyLevel, string> = {
  mudah:
    "Tingkat kesulitan: MUDAH — fokus pada pemahaman konsep inti (bukan sekadar hafalan definisi kata). Siswa menguji pemahaman satu konsep dalam konteks nyata dengan 3 pengecoh logis yang setara kategori dan panjangnya.",
  sedang:
    "Tingkat kesulitan: SEDANG — fokus pada penerapan konsep, hubungan sebab-akibat, dan analisis kasus terarah. Pengecoh mencerminkan kekeliruan logika atau miskonsepsi umum.",
  sulit:
    "Tingkat kesulitan: SULIT (HOTS) — fokus pada penalaran tingkat tinggi, studi kasus multi-langkah, evaluasi trade-off atau dilema, dan sintesis kesimpulan dari situasi yang kompleks.",
  campuran:
    "Tingkat kesulitan: CAMPURAN (PROGRESIF) — susun urutan soal secara bertahap: bagian awal mudah (pemahaman konsep), bagian tengah sedang (aplikasi/sebab-akibat), dan bagian akhir sulit (analisis HOTS).",
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
