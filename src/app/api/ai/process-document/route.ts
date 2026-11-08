import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import {
  DocumentAnalysisSchema,
  buildDocumentAnalysisPrompt,
} from "@/lib/ai/prompts";
import { chatJSON, AIUnavailableError } from "@/lib/ai/llm";
import { extractText, UnsupportedFileError } from "@/lib/ai/documents";
import {
  solveHomeworkFromImages,
  transcribeImagesWithVision,
  type ImageInput,
} from "@/lib/ai/vision";
import { storeQuiz } from "@/lib/rooms/store";
import { shuffleQuestionOptions } from "@/lib/quiz/options";

export const maxDuration = 120;

export const ImagePartSchema = z.object({
  base64: z.string(),
  mimeType: z.string().optional(),
});

export const BodySchema = z.object({
  fileName: z.string().optional().default("dokumen-materi.pdf"),
  fileType: z.enum(["image", "pdf", "text"]).optional().default("text"),
  fileBase64: z.string().optional(),
  mimeType: z.string().optional().default("text/plain"),
  extractedText: z.string().optional(),
  text: z.string().optional(),
  userContext: z.string().optional(),
  customPrompt: z.string().optional(),
  action: z.enum(["analyze", "transcribe"]).optional().default("analyze"),
  scanMode: z.enum(["direct_answer", "learning"]).optional(),
  images: z.array(ImagePartSchema).optional(),
  artifacts: z
    .array(
      z.enum([
        "flashcards",
        "quiz",
        "summary",
        "mindmap",
        "infographic",
        "table",
        "report",
      ])
    )
    .min(1)
    .optional(),
});

export const RequestSchema = BodySchema;

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 20, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Format permintaan tidak valid" }, { status: 400 });
  }
  const {
    fileName,
    fileType,
    fileBase64,
    mimeType,
    extractedText,
    text,
    userContext,
    customPrompt,
    action,
    scanMode,
    images,
    artifacts,
  } = parsed.data;

  try {
    let source = (extractedText || text || "").trim();

    // Collect all input images from images array or fileBase64
    const imageList: ImageInput[] = [];
    if (images && images.length > 0) {
      imageList.push(...images);
    } else if (
      fileBase64 &&
      (fileType === "image" ||
        mimeType?.startsWith("image/") ||
        /\.(jpe?g|png|webp)$/i.test(fileName))
    ) {
      imageList.push({ base64: fileBase64, mimeType });
    }

    // 1. Direct answer mode: extract questions and provide verified answers
    if (scanMode === "direct_answer") {
      if (imageList.length > 0) {
        const solution = await solveHomeworkFromImages(
          imageList,
          userContext || customPrompt
        );
        return NextResponse.json({
          success: true,
          scanMode: "direct_answer",
          transcription: solution.transcription,
          directAnswers: solution.directAnswers,
        });
      }

      if (source.length > 0) {
        const textResult = await chatJSON(
          [
            {
              role: "system",
              content:
                "You are an expert tutor solving homework problems. Provide markdown transcription and direct verified answers with key explanations.",
            },
            {
              role: "user",
              content: `Solve all questions in this homework text:\n\n${source}\n\nReturn JSON with keys: transcription (string) and directAnswers (array of {number, questionSnippet, answer, keyExplanation}).`,
            },
          ],
          z.object({
            transcription: z.string().optional().default(source),
            directAnswers: z.array(
              z.object({
                number: z.number(),
                questionSnippet: z.string(),
                answer: z.string(),
                keyExplanation: z.string(),
              })
            ),
          })
        );
        return NextResponse.json({
          success: true,
          scanMode: "direct_answer",
          transcription: textResult.transcription || source,
          directAnswers: textResult.directAnswers,
        });
      }

      return NextResponse.json(
        { error: "Tidak ada gambar atau teks soal yang diberikan." },
        { status: 400 }
      );
    }

    // 2. Learning or default mode: transcribe images via Gemini Vision
    if (imageList.length > 0 && (action === "transcribe" || source.length < 40)) {
      source = await transcribeImagesWithVision(
        imageList,
        userContext || customPrompt
      );
    } else if (fileBase64 && (action === "transcribe" || source.length < 40)) {
      source = await extractText({ name: fileName, mimeType, base64: fileBase64 });
    }

    const effectiveFileType = imageList.length > 0 ? "image" : fileType;

    if (action === "transcribe" || scanMode === "learning") {
      return NextResponse.json({
        success: true,
        action: "transcribe",
        scanMode: "learning",
        transcription: source,
        fileName,
        fileType: effectiveFileType,
      });
    }

    if (source.length < 40) {
      return NextResponse.json(
        { error: "Materi terlalu pendek. Tempel teks yang lebih panjang atau unggah berkas." },
        { status: 400 }
      );
    }

    const requestedArtifacts = artifacts?.length
      ? artifacts
      : (["flashcards", "quiz", "summary"] as const);

    const { systemPrompt, prompt } = buildDocumentAnalysisPrompt(
      source.slice(0, 40_000),
      effectiveFileType,
      userContext || customPrompt,
      [...requestedArtifacts]
    );

    const result = await chatJSON(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      DocumentAnalysisSchema,
      { temperature: 0.4, timeoutMs: 110_000 }
    );

    result.transcription = source;
    result.flashcards = (result.flashcards || []).map((c, idx) => ({
      ...c,
      id: c.id && c.id.trim().length > 0 ? c.id : `c${idx + 1}`,
      tag: c.tag && c.tag.trim().length > 0 ? c.tag : "Konsep inti",
    }));
    result.quiz = (result.quiz || []).map((q, idx) => ({
      ...shuffleQuestionOptions(q),
      id: crypto.randomUUID(),
      questionOrder: q.questionOrder || idx + 1,
    }));
    if (result.difficultyQuizzes) {
      const dq = result.difficultyQuizzes;
      result.difficultyQuizzes = {
        easy: dq.easy?.map((q) => shuffleQuestionOptions(q)),
        medium: dq.medium?.map((q) => shuffleQuestionOptions(q)),
        hard: dq.hard?.map((q) => shuffleQuestionOptions(q)),
      };
    }
    if (result.dataTable) {
      const cols = result.dataTable.columns;
      result.dataTable.rows = result.dataTable.rows.map((row) => {
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
    }

    let quizId: string | undefined;
    if (result.quiz.length > 0) {
      const stored = await storeQuiz({
        id: crypto.randomUUID(),
        title: result.title,
        description: (result.summary?.overview || result.title).slice(0, 160),
        targetGrade: result.gradeLevel,
        category: result.subjectArea,
        questions: result.quiz,
      });
      result.quiz = stored.questions;
      quizId = stored.id;
    }

    return NextResponse.json({
      success: true,
      scanMode: scanMode || (imageList.length > 0 ? "learning" : undefined),
      quizId,
      transcription: source,
      analysis: result,
      document: { quizId, ...result },
      metadata: {
        fileName,
        fileType: effectiveFileType,
        scanMode: scanMode || (imageList.length > 0 ? "learning" : undefined),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof UnsupportedFileError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[process-document]", error);
    return NextResponse.json({ error: "Gagal memproses materi. Coba lagi." }, { status: 500 });
  }
}
