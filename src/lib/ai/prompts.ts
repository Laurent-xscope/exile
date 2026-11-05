import { z } from "zod";

/**
 * Zod Schemas for Exile Pedagogical Engine
 */

export const OptionSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean(),
  distractorRationale: z.string().optional(),
});

export const QuestionSchema = z.object({
  id: z.string().optional(),
  questionOrder: z.number().optional(),
  question: z.string().min(5, "Question text must be descriptive"),
  options: z.array(OptionSchema).length(4, "Must provide exactly 4 options (A, B, C, D)"),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(3, "Explanation must be provided"),
  conceptTag: z.string().min(1).optional().default("Konsep Inti"),
  culturalContext: z.string().optional(),
});

export const QuizSchema = z.object({
  title: z.string().min(3),
  description: z.string(),
  targetGrade: z.string().optional(),
  category: z.string().optional(),
  culturalTheme: z.string().optional(),
  questions: z.array(QuestionSchema).min(1),
});

export type Option = z.infer<typeof OptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

export const SlideItemSchema = z.object({
  slideNumber: z.number(),
  title: z.string(),
  bullets: z.array(z.string()).min(2),
  presenterNotes: z.string(),
  visualConcept: z.string(),
});

export interface MindMapNode {
  id: string;
  label: string;
  description: string;
  category?: string;
  children?: MindMapNode[];
}

export const MindMapNodeSchema: z.ZodType<MindMapNode> = z.lazy(() =>
  z.object({
    id: z.string().optional().default(() => crypto.randomUUID()),
    label: z.string().min(1),
    description: z.string().min(1),
    category: z.string().optional(),
    children: z.array(MindMapNodeSchema).optional(),
  })
);

export const ReportSectionSchema = z.object({
  heading: z.string(),
  content: z.string(),
  keyPoints: z.array(z.string()).optional().default([]),
});

export const PedagogicalReportSchema = z.object({
  executiveSummary: z.string(),
  coreCompetencies: z.array(z.string()).optional().default([]),
  prerequisiteKnowledge: z.array(z.string()).optional().default([]),
  difficultyHotspots: z.array(z.string()).optional().default([]),
  recommendedAction: z.string().optional().default(""),
  sections: z.array(ReportSectionSchema).optional().default([]),
});

export const DataTableSchema = z.object({
  title: z.string().optional().default(""),
  description: z.string().optional().default(""),
  columns: z.array(z.string()).min(1),
  rows: z.array(
    z.record(
      z.string(),
      z
        .union([z.string(), z.number(), z.boolean(), z.null()])
        .transform((v) => (v === null ? "" : typeof v === "boolean" ? String(v) : v))
    )
  ),
});

export const InfographicSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional().default(""),
  centralConcept: z.string(),
  pillars: z.array(
    z.object({
      title: z.string(),
      keyPoints: z.array(z.string()),
      quoteOrMnemonic: z.string().optional().default(""),
    })
  ),
});

export const StudentPovInsightSchema = z.object({
  studentMentalModel: z.string(),
  commonPointsOfConfusion: z.array(z.string()).optional().default([]),
  empatheticExplanation: z.string().optional().default(""),
  relatableAnalogy: z.string().optional().default(""),
});

export const FlashcardItemSchema = z.object({
  id: z.string().optional().default(""),
  front: z.string().min(3),
  back: z.string().min(3),
  tag: z.string().optional().default("Konsep"),
  hint: z.string().optional(),
});

export type StudioCraftableArtifact =
  | "flashcards"
  | "quiz"
  | "summary"
  | "mindmap"
  | "infographic"
  | "table"
  | "report";

export const DocumentAnalysisSchema = z.object({
  title: z.string().min(2),
  subjectArea: z.string().optional().default("Materi pembelajaran"),
  gradeLevel: z.string().optional().default("Umum"),
  summary: z
    .object({
      overview: z.string().optional().default(""),
      keyTakeaways: z.array(z.string()).optional().default([]),
      culturalGlossary: z
        .array(
          z.object({
            term: z.string(),
            meaning: z.string(),
            category: z.string().optional().default("Istilah"),
          })
        )
        .optional()
        .default([]),
      expansions: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
          })
        )
        .optional()
        .default([]),
    })
    .optional()
    .default({ overview: "", keyTakeaways: [], culturalGlossary: [], expansions: [] }),
  flashcards: z.array(FlashcardItemSchema).optional().default([]),
  quiz: z.array(QuestionSchema).optional().default([]),
  difficultyQuizzes: z
    .object({
      easy: z.array(QuestionSchema).optional(),
      medium: z.array(QuestionSchema).optional(),
      hard: z.array(QuestionSchema).optional(),
    })
    .optional()
    .catch(undefined),
  slideDeck: z.array(SlideItemSchema).optional().catch(undefined),
  mindMap: MindMapNodeSchema.optional(),
  report: PedagogicalReportSchema.optional(),
  dataTable: DataTableSchema.optional(),
  infographic: InfographicSchema.optional(),
  studentPov: StudentPovInsightSchema.optional().catch(undefined),
  transcription: z.string().optional(),
});

export type FlashcardItem = z.infer<typeof FlashcardItemSchema>;
export type SlideItem = z.infer<typeof SlideItemSchema>;
export type PedagogicalReport = z.infer<typeof PedagogicalReportSchema>;
export type DataTableData = z.infer<typeof DataTableSchema>;
export type InfographicData = z.infer<typeof InfographicSchema>;
export type StudentPovInsight = z.infer<typeof StudentPovInsightSchema>;
export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;

/**
 * Focused NotebookLM-caliber prompt for Studio material synthesis.
 * Generates only the requested artifact(s) so users can craft specific artifacts on demand.
 */
export function buildDocumentAnalysisPrompt(
  extractedContent: string,
  mediaType: "pdf" | "image" | "text" = "text",
  userContext?: string,
  artifacts: StudioCraftableArtifact[] = ["flashcards", "quiz", "summary"]
): { systemPrompt: string; prompt: string } {
  const wantFlashcards = artifacts.includes("flashcards");
  const wantQuiz = artifacts.includes("quiz");
  const wantSummary = artifacts.includes("summary");
  const wantMindmap = artifacts.includes("mindmap");
  const wantInfographic = artifacts.includes("infographic");
  const wantTable = artifacts.includes("table");
  const wantReport = artifacts.includes("report");

  const instructions: string[] = [];
  const jsonShapeFields: string[] = [
    '  "title": string,',
    '  "subjectArea": string,',
    '  "gradeLevel": string',
  ];

  if (wantSummary) {
    instructions.push(`Standar intisari (summary):
- "overview": 2 paragraf ringkas yang merangkum gagasan utama, alur mekanisme/argumen, dan kesimpulan bahan.
- "keyTakeaways": 4-6 poin spesifik yang memuat fakta/prinsip konkret dari bahan.
- "culturalGlossary": 4-8 istilah penting dari bahan beserta arti singkat ("meaning") dan kategorinya ("category").`);
    jsonShapeFields.push(
      `  "summary": {\n    "overview": string,\n    "keyTakeaways": [string],\n    "culturalGlossary": [{"term": string, "meaning": string, "category": string}]\n  }`
    );
  }

  if (wantFlashcards) {
    instructions.push(`Standar kualitas kartu belajar (flashcards) setara NotebookLM:
- Buat 8-12 kartu yang menguji pemahaman mendalam dari berbagai sudut, bukan sekadar "Apa definisi X?" berulang-ulang:
  1. Mekanisme / proses ("Bagaimana X bekerja hingga menghasilkan Y?")
  2. Perbandingan / pembeda ("Apa perbedaan fungsi antara X dan Y?")
  3. Sebab-akibat / alasan ("Mengapa X terjadi ketika kondisi Y berubah?")
  4. Contoh / penerapan ("Dalam kasus X pada bahan, prinsip apa yang berlaku?")
  5. Istilah kunci ("Apa peran spesifik X dalam keseluruhan proses?")
- "front": satu kalimat pertanyaan yang tajam, spesifik, dan langsung memicu ingatan aktif.
- "back": kalimat pertama langsung menjawab inti pertanyaan, diikuti 1-2 kalimat penjelasan mekanisme, alasan, atau detail penting dari bahan.
- "tag": sub-topik spesifik 2-3 kata.
- "hint": petunjuk berpikir 1 kalimat singkat yang membantu mengingat tanpa membocorkan jawaban.`);
    jsonShapeFields.push(
      '  "flashcards": [{"id": "c1", "front": string, "back": string, "tag": string, "hint": string}]'
    );
  }

  if (wantQuiz) {
    instructions.push(`Standar kuis (quiz):
- Buat 6 soal pilihan ganda (4 opsi label "A", "B", "C", "D"; tepat satu "isCorrect": true; "correctAnswer" sesuai label yang benar).
- Sebarkan letak jawaban benar secara merata antara A, B, C, dan D.
- Pilihan yang salah harus masuk akal dan sebanding panjangnya, namun jelas salah menurut bahan.
- "explanation": 1-2 kalimat yang menjelaskan mengapa jawaban tersebut benar menurut bahan.
- "conceptTag": 2-4 kata topik soal.`);
    jsonShapeFields.push(
      '  "quiz": [{"question": string, "options": [{"label": "A"|"B"|"C"|"D", "text": string, "isCorrect": boolean}], "correctAnswer": "A"|"B"|"C"|"D", "explanation": string, "conceptTag": string}]'
    );
  }

  if (wantMindmap) {
    instructions.push(`Standar peta konsep (mindMap) setara NotebookLM:
- Susun pohon konsep hierarkis 3 tingkat (akar utama -> 4-6 cabang utama -> 2-4 sub-cabang per cabang utama).
- Setiap simpul wajib memiliki "id" unik (mis. "root", "b1", "b1-1"), "label" singkat & jelas (2-5 kata), "category" (mis. "Struktur", "Kosakata", "Pola kalimat"), dan "description" (1 kalimat ringkas yang menjelaskan konsep/contoh konkret dari bahan).`);
    jsonShapeFields.push(
      '  "mindMap": {"id": "root", "label": string, "description": string, "children": [{"id": "b1", "label": string, "category": string, "description": string, "children": [{"id": "b1-1", "label": string, "description": string}]}]}'
    );
  }

  if (wantInfographic) {
    instructions.push(`Standar infografik (infographic) setara NotebookLM:
- "title": judul ringkas visual poster.
- "subtitle": 1 kalimat konteks atau tujuan pembelajaran bahan.
- "centralConcept": 1 kalimat kesimpulan utama yang merangkum inti seluruh bahan ajar.
- "pillars": 4-6 pilar visual utama dari bahan; masing-masing memiliki "title" (judul pilar), "keyPoints" (3-4 poin konkret/contoh dari bahan), dan "quoteOrMnemonic" (rumus, pola kalimat, atau jembatan keledai singkat yang mudah diingat).`);
    jsonShapeFields.push(
      '  "infographic": {"title": string, "subtitle": string, "centralConcept": string, "pillars": [{"title": string, "keyPoints": [string], "quoteOrMnemonic": string}]}'
    );
  }

  if (wantTable) {
    instructions.push(`Standar tabel data (dataTable) setara NotebookLM:
- Ekstrak perbandingan, klasifikasi, kosakata, pola kalimat, atau matriks fakta penting dari bahan menjadi tabel terstruktur.
- "title": judul tabel yang spesifik.
- "description": 1 kalimat penjelasan isi tabel.
- "columns": 3-5 nama kolom yang konsisten.
- "rows": 6-12 baris objek JSON di mana setiap key persis sama dengan nama di "columns".`);
    jsonShapeFields.push(
      '  "dataTable": {"title": string, "description": string, "columns": [string], "rows": [{"Kolom1": string, "Kolom2": string}]}'
    );
  }

  if (wantReport) {
    instructions.push(`Standar laporan briefing (report) setara NotebookLM Briefing Doc:
- "executiveSummary": 2 paragraf ringkasan eksekutif yang membedah ruang lingkup, struktur konsep, dan tujuan bahan ajar.
- "coreCompetencies": 4-5 kemampuan spesifik yang dikuasai setelah mempelajari bahan ini.
- "prerequisiteKnowledge": 3-4 pengetahuan dasar yang perlu dimiliki sebelum masuk ke materi inti.
- "difficultyHotspots": 3-4 bagian tersulit atau pola yang paling sering membingungkan beserta cara mengatasinya.
- "recommendedAction": langkah belajar atau latihan bertahap yang disarankan dari bahan.
- "sections": 3-4 bagian pendalaman topik ("heading", "content" 1 paragraf analisis, dan "keyPoints" 2-3 contoh/fakta spesifik dari bahan).`);
    jsonShapeFields.push(
      '  "report": {"executiveSummary": string, "coreCompetencies": [string], "prerequisiteKnowledge": [string], "difficultyHotspots": [string], "recommendedAction": string, "sections": [{"heading": string, "content": string, "keyPoints": [string]}]}'
    );
  }

  const systemPrompt = `Kamu menyusun artifak belajar dari bahan ajar (${mediaType}) dengan ketajaman setara Google NotebookLM.

Aturan utama:
- Semua fakta, istilah, angka, dan hubungan sebab-akibat harus berasal dari bahan yang diberikan. Jangan mengarang fakta di luar bahan.
- Gunakan bahasa yang sama dengan bahan ajar (atau Bahasa Indonesia yang jelas bila bahan dwibahasa). Tulis lugas, bernas, dan alami—tanpa jargon kaku, tanpa kata "miskonsepsi" atau "pengecoh", dan tanpa kalimat basa-basi.

${instructions.join("\n\n")}

Balas HANYA satu objek JSON valid dengan struktur:
{
${jsonShapeFields.join(",\n")}
}`;

  const prompt = `${userContext ? `Catatan pengajar: ${userContext}\n\n` : ""}=== BAHAN AJAR ===
${extractedContent}
=== AKHIR BAHAN AJAR ===`;

  return { systemPrompt, prompt };
}
