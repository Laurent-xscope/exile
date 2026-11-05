import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import {
  DocumentAnalysisSchema,
  buildDocumentAnalysisPrompt,
} from "@/lib/ai/prompts";
import { chatJSON, AIUnavailableError } from "@/lib/ai/llm";
import { extractText, UnsupportedFileError } from "@/lib/ai/documents";
import { storeQuiz, shuffleQuestionOptions } from "@/lib/rooms/store";

export const maxDuration = 120;

const RequestSchema = z.object({
  fileName: z.string().optional().default("dokumen-materi.pdf"),
  fileType: z.enum(["image", "pdf", "text"]).optional().default("text"),
  fileBase64: z.string().optional(),
  mimeType: z.string().optional().default("text/plain"),
  extractedText: z.string().optional(),
  text: z.string().optional(),
  userContext: z.string().optional(),
  customPrompt: z.string().optional(),
  action: z.enum(["analyze", "transcribe"]).optional().default("analyze"),
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

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 20, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
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
    artifacts,
  } = parsed.data;

  try {
    let source = (extractedText || text || "").trim();

    if (fileBase64 && (action === "transcribe" || source.length < 40)) {
      if (fileType === "image") {
        return NextResponse.json(
          { error: "Gambar belum bisa dibaca. Tempel teksnya ke kolom materi." },
          { status: 422 }
        );
      }
      source = await extractText({ name: fileName, mimeType, base64: fileBase64 });
    }

    if (action === "transcribe") {
      return NextResponse.json({
        success: true,
        action: "transcribe",
        transcription: source,
        fileName,
        fileType,
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
      fileType,
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
      quizId,
      transcription: source,
      analysis: result,
      document: { quizId, ...result },
      metadata: { fileName, fileType, timestamp: new Date().toISOString() },
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
