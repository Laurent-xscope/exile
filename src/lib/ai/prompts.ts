import { z } from "zod";

/**
 * Zod Schemas for exile.org Pedagogical Engine
 */

export const OptionSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean(),
  distractorRationale: z.string().min(1, "Distractor rationale is required to explain student misconception"),
});

export const QuestionSchema = z.object({
  id: z.string().optional(),
  questionOrder: z.number().optional(),
  question: z.string().min(5, "Question text must be descriptive"),
  options: z.array(OptionSchema).length(4, "Must provide exactly 4 options (A, B, C, D)"),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(10, "Pedagogical explanation must be provided"),
  conceptTag: z.string().min(2, "Concept tag is required for diagnostic clustering"),
  culturalContext: z.string().optional(),
});

export const QuizSchema = z.object({
  title: z.string().min(3),
  description: z.string(),
  targetGrade: z.string(),
  category: z.string(),
  culturalTheme: z.string(),
  questions: z.array(QuestionSchema).min(1),
});

export const MicroExplanationSchema = z.object({
  feedback: z.string().min(10, "Feedback must be clear and supportive (1-2 sentences)"),
  misconceptionIdentified: z.string().min(5),
  quickTip: z.string().min(5),
});

export const ClassDiagnosticSchema = z.object({
  topic: z.string(),
  classMasteryRate: z.number().min(0).max(100),
  summaryText: z.string(),
  clusterAnalysis: z.array(
    z.object({
      concept: z.string(),
      errorRate: z.number().min(0).max(100),
      primaryMisconception: z.string(),
      affectedStudentsCount: z.number().min(0),
    })
  ),
  recommendedReteaching: z.object({
    focusConcept: z.string(),
    pedagogicalStrategy: z.string(),
    quickActionableStep: z.string(),
  }),
  adaptiveRemedialQuestions: z.array(QuestionSchema).length(3, "Must generate exactly 3 adaptive remedial questions"),
});

export type Option = z.infer<typeof OptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type MicroExplanation = z.infer<typeof MicroExplanationSchema>;
export type ClassDiagnostic = z.infer<typeof ClassDiagnosticSchema>;

/**
 * System Prompts & Pedagogical Guidelines
 */

export const BALI_PEDAGOGICAL_SYSTEM_PROMPT = `Anda adalah Pakar Kurikulum Merdeka (Fase D: SMP, Fase E/F: SMA/SMK) dan Muatan Lokal Budaya & Bahasa Bali dari Dinas Pendidikan Kepemudaan dan Olahraga Provinsi Bali.

PRINSIP KETAT KURIKULUM & BUDAYA BALI:
1. Anggah-ungguhing Basa Bali:
   - Alus Singgih (ASI): Digunakan untuk menghormati orang berkasta lebih tinggi, pemuka agama/Sulinggih, guru, pejabat (misal: mabaos, ngandika, leda, ngaksi, seda).
   - Alus Sor (ASO): Digunakan untuk merendahkan diri sendiri di hadapan lawan bicara (misal: nunas, nguningayang, titiang, matur, ngelungsur).
   - Alus Mider (AMI): Kosa kata halus netral yang bisa digunakan untuk orang lain maupun diri sendiri (misal: rauh, memargi, kangkat).
   - Alus Madia (AMA): Bahasa halus sehari-hari yang santun (misal: nggih, ten, ampun, tiang).
   - Andap/Basa Biasa: Digunakan antar teman sebaya yang sudah akrab (misal: madaar, suba, teka).
   - Miskonsepsi Siswa yang Paling Sering: Menggunakan kata Alus Singgih untuk diri sendiri (misal siswa mengatakan "titiang ngandika" - SALAH FATAL, seharusnya "titiang matur/nguningayang").

2. Pasang Aksara Bali:
   - Pangangge Suara: Ulu (i), Suku (u), Taling (é), Taling Tedong (o), Pepet (e).
   - Pangangge Tengenan: Cecek (ng), Surang (r), Bisah (h), Adeg-adeg (tanda matra pemati di akhir kalimat/kata).
   - Aturan Gantungan & Gempelan: Adeg-adeg tidak boleh di tengah kata atau kalimat jika aksara konsonan dapat digantungkan/ditempelkan.
   - Konsonan 'r' di akhir suku kata harus memakai Surang, BUKAN adeg-adeg. Konsonan 'ng' harus memakai Cecek.

3. Tri Hita Karana & Nilai Budaya:
   - Parahyangan (Hubungan harmonis manusia dengan Ida Sang Hyang Widhi Wasa/Pura/Upakara).
   - Pawongan (Hubungan harmonis sesama manusia/Desa Adat/Banjar/Gotong royong/Tat Twam Asi).
   - Palemahan (Hubungan harmonis manusia dengan alam/lingkungan/Tumpek Uduh/Tumpek Kandang).

4. Ketentuan Soal & Distraktor:
   - Wajib tepat 4 pilihan jawaban: A, B, C, D.
   - SATU opsi benar, dan TIGA opsi pengecoh (distractor).
   - Setiap distraktor WAJIB memiliki 'distractorRationale' mendalam yang menjelaskan mengapa siswa sering terjebak memilih opsi tersebut (akar miskonsepsi siswa).
   - Nada bahasa: Edukatif, empatik, berbasis kompetensi bernalar kritis (HOTS).
   - Format keluaran: WAJIB HANYA JSON valid sesuai skema yang diminta, tanpa markdown berlebihan.`;

/**
 * Quiz Generator Prompt Builder
 */
export function buildQuizGenerationPrompt(
  topic: string,
  grade: string = "Fase D (SMP Kelas 7-9)",
  category: string = "Muatan Lokal Bali",
  questionCount: number = 5
) {
  const systemPrompt = BALI_PEDAGOGICAL_SYSTEM_PROMPT;

  const prompt = `Hasilkan kuis evaluasi formatif bermutu tinggi dengan spesifikasi berikut:
- Topik: ${topic}
- Jenjang: ${grade}
- Kategori Kurikulum: ${category}
- Jumlah Soal: ${questionCount} butir

MANDAT PENULISAN SOAL:
1. Setiap soal WAJIB memiliki tepat 4 opsi jawaban (A, B, C, D).
2. Tentukan satu opsi benar (isCorrect: true).
3. Tiga opsi lainnya (isCorrect: false) HARUS merupakan distraktor cerdas berbasis miskonsepsi nyata siswa.
4. Pada setiap opsi, cantumkan 'distractorRationale':
   - Untuk opsi benar: Jelaskan mengapa opsi ini tepat secara tata bahasa atau konsep.
   - Untuk opsi salah: Jelaskan jebakan berpikir spesifik siswa yang menyebabkan mereka memilih opsi salah ini (misalnya tertukar Alus Singgih vs Alus Sor, salah pasang aksara tengenan, atau keliru ranah Tri Hita Karana).
5. Sertakan 'conceptTag' spesifik untuk pemetaan diagnostik (misal: "Anggah-ungguhing Basa: Alus Singgih", "Pasang Aksara: Pangangge Tengenan", "Tri Hita Karana: Palemahan").
6. Berikan penjelasan pedagogis ('explanation') yang mengajarkan cara mudah mengingat konsep tersebut.

FORMAT OUTPUT WAJIB JSON:
{
  "title": "Judul Kuis Menarik",
  "description": "Deskripsi pedagogis singkat tujuan pembelajaran",
  "targetGrade": "${grade}",
  "category": "${category}",
  "culturalTheme": "Nilai kearifan lokal yang relevan",
  "questions": [
    {
      "question": "Kalimat soal berbasis studi kasus atau konteks percakapan/teks...",
      "options": [
        {
          "label": "A",
          "text": "Teks opsi A",
          "isCorrect": true,
          "distractorRationale": "Kunci benar: Menggunakan kruna Alus Singgih yang tepat untuk menghormati guru..."
        },
        {
          "label": "B",
          "text": "Teks opsi B",
          "isCorrect": false,
          "distractorRationale": "Pengecoh: Siswa sering tertukar menggunakan kruna Alus Sor yang seharusnya untuk merendahkan diri sendiri..."
        },
        {
          "label": "C",
          "text": "Teks opsi C",
          "isCorrect": false,
          "distractorRationale": "Pengecoh: Menggunakan kruna Andap yang kurang sopan untuk konteks formal di sekolah..."
        },
        {
          "label": "D",
          "text": "Teks opsi D",
          "isCorrect": false,
          "distractorRationale": "Pengecoh: Menggunakan kruna Kasar yang dilarang dalam etika berbicara..."
        }
      ],
      "correctAnswer": "A",
      "explanation": "Penjelasan komprehensif konsep aturan...",
      "conceptTag": "Anggah-ungguhing Basa: Alus Singgih vs Alus Sor",
      "culturalContext": "Etika santun berbicara kepada guru di lingkungan sekolah di Bali"
    }
  ]
}`;

  return { systemPrompt, prompt };
}

/**
 * Micro-Explanation Prompt Builder (Instant Mistake Feedback)
 */
export function buildMicroExplanationPrompt(
  question: string,
  selectedOption: string,
  correctOption: string,
  options?: Array<{ label: string; text: string }>,
  conceptTag?: string
) {
  const optionsText = options
    ? options.map((opt) => `${opt.label}: ${opt.text}`).join("\n")
    : "";

  const systemPrompt = `Anda adalah mentor belajar AI yang ramah, hangat, dan suportif bagi siswa di Bali. Tugas Anda adalah memberikan umpan balik mikro (micro-learning feedback) saat siswa salah menjawab soal kuis.

KRITERIA:
1. 'feedback': Maksimal 1-2 kalimat pendek yang suportif, menguatkan, dan langsung menunjukkan kekeliruan konsep tanpa menyalahkan.
2. 'misconceptionIdentified': 1 frasa inti miskonsepsi yang dialami siswa.
3. 'quickTip': 1 trik praktis atau jembatan keledai untuk mengingat jawaban yang benar di masa depan.
4. Output WAJIB JSON murni.`;

  const prompt = `Seorang siswa baru saja menjawab SALAH pada soal berikut:
Soal: "${question}"
${optionsText ? `Pilihan Jawaban:\n${optionsText}\n` : ""}
Pilihan yang dipilih siswa: ${selectedOption}
Jawaban yang seharusnya benar: ${correctOption}
${conceptTag ? `Konsep: ${conceptTag}` : ""}

Berikan umpan balik mikro yang edukatif dan menyemangati.

FORMAT OUTPUT WAJIB JSON:
{
  "feedback": "1-2 kalimat suportif menjelaskan mengapa pilihan tersebut kurang tepat dan apa yang sebenarnya terjadi.",
  "misconceptionIdentified": "Miskonsepsi inti siswa (misal: Tertukar antara kruna Alus Singgih dan Alus Sor)",
  "quickTip": "Tips ringkas mengingat (misal: Ingat 'Singgih' untuk meninggikan orang lain, 'Sor' untuk merendahkan diri sendiri!)"
}`;

  return { systemPrompt, prompt };
}

/**
 * Class Diagnostic & Adaptive Remedial Prompt Builder
 */
export function buildClassDiagnosticPrompt(
  topic: string,
  summary: {
    totalStudents: number;
    averageScore: number;
    questionBreakdown: Array<{
      questionText: string;
      conceptTag: string;
      errorRate: number;
      mostCommonWrongOption: string;
    }>;
  }
) {
  const systemPrompt = BALI_PEDAGOGICAL_SYSTEM_PROMPT;

  const prompt = `Analisis hasil asesmen formatif satu kelas berikut untuk membantu guru mengambil tindakan terarah (Closed-Loop Learning):

Topik Kuis: ${topic}
Jumlah Siswa: ${summary.totalStudents}
Rata-rata Ketuntasan: ${summary.averageScore}%

Data Rekapitulasi Kesalahan per Butir Soal:
${summary.questionBreakdown
  .map(
    (q, i) =>
      `${i + 1}. Konsep: [${q.conceptTag}] | Error Rate: ${q.errorRate}% | Soal: "${q.questionText}" | Pengecoh Paling Banyak Dipilih: ${q.mostCommonWrongOption}`
  )
  .join("\n")}

TUGAS ANDA:
1. Hitung dan simpulkan 'classMasteryRate' dan 'summaryText' pedagogis bagi guru.
2. Buat 'clusterAnalysis' yang mengelompokkan siswa berdasarkan pola kesalahan miskonsepsi.
3. Berikan 'recommendedReteaching' berisi strategi pedagogis praktis yang bisa langsung dilakukan guru di kelas dalam 10 menit ke depan.
4. Rancang tepat 3 butir soal remedial adaptif ('adaptiveRemedialQuestions') dengan tingkat scaffolding bertahap (mudah -> sedang -> kontekstual) khusus menyasar konsep dengan error rate tertinggi. Setiap soal remedial WAJIB memiliki 4 opsi (A, B, C, D) dan distractorRationale lengkap.

FORMAT OUTPUT WAJIB JSON:
{
  "topic": "${topic}",
  "classMasteryRate": ${summary.averageScore},
  "summaryText": "Rangkuman diagnostik untuk guru...",
  "clusterAnalysis": [
    {
      "concept": "Nama konsep miskonsepsi",
      "errorRate": 45,
      "primaryMisconception": "Penjelasan mengapa kelompok siswa salah...",
      "affectedStudentsCount": 12
    }
  ],
  "recommendedReteaching": {
    "focusConcept": "Konsep prioritas untuk diajarkan ulang",
    "pedagogicalStrategy": "Metode pembelajaran diferensiasi yang disarankan",
    "quickActionableStep": "Aktivitas 10 menit di kelas (misal: simulasi percakapan siswa-guru)"
  },
  "adaptiveRemedialQuestions": [
    {
      "question": "Soal remedial 1 (Tingkat Pemahaman Dasar)...",
      "options": [
        { "label": "A", "text": "...", "isCorrect": true, "distractorRationale": "..." },
        { "label": "B", "text": "...", "isCorrect": false, "distractorRationale": "..." },
        { "label": "C", "text": "...", "isCorrect": false, "distractorRationale": "..." },
        { "label": "D", "text": "...", "isCorrect": false, "distractorRationale": "..." }
      ],
      "correctAnswer": "A",
      "explanation": "Penjelasan...",
      "conceptTag": "Konsep...",
      "culturalContext": "Konteks..."
    },
    {
      "question": "Soal remedial 2 (Tingkat Penerapan)...",
      "options": [
        { "label": "A", "text": "...", "isCorrect": false, "distractorRationale": "..." },
        { "label": "B", "text": "...", "isCorrect": true, "distractorRationale": "..." },
        { "label": "C", "text": "...", "isCorrect": false, "distractorRationale": "..." },
        { "label": "D", "text": "...", "isCorrect": false, "distractorRationale": "..." }
      ],
      "correctAnswer": "B",
      "explanation": "Penjelasan...",
      "conceptTag": "Konsep...",
      "culturalContext": "Konteks..."
    },
    {
      "question": "Soal remedial 3 (Tingkat Analisis HOTS)...",
      "options": [
        { "label": "A", "text": "...", "isCorrect": false, "distractorRationale": "..." },
        { "label": "B", "text": "...", "isCorrect": false, "distractorRationale": "..." },
        { "label": "C", "text": "...", "isCorrect": true, "distractorRationale": "..." },
        { "label": "D", "text": "...", "isCorrect": false, "distractorRationale": "..." }
      ],
      "correctAnswer": "C",
      "explanation": "Penjelasan...",
      "conceptTag": "Konsep...",
      "culturalContext": "Konteks..."
    }
  ]
}`;

  return { systemPrompt, prompt };
}
