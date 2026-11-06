import { NextResponse } from "next/server";
import { z } from "zod";
import { setRoomQuestions, validateHostToken } from "@/lib/rooms/store";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import { extractText, UnsupportedFileError } from "@/lib/ai/documents";
import { generateQuizFromText } from "@/lib/ai/quiz-gen";
import { AIUnavailableError } from "@/lib/ai/llm";

export const maxDuration = 120;

const BodySchema = z.object({
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  fileBase64: z.string().optional(),
  text: z.string().optional(),
  questionCount: z.coerce.number().int().min(1).max(20).optional().default(8),
  instructions: z.string().max(4000).optional(),
  difficulty: z.enum(["mudah", "sedang", "sulit", "campuran"]).optional().default("sedang"),
  timePerQuestionSec: z.coerce.number().int().min(5).max(120).optional(),
  streakBonus: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rateLimit = await checkRateLimit(req, 12, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const { code } = await params;
  const roomCode = normalizeRoomCode(code);
  if (!isValidRoomCode(roomCode)) {
    return NextResponse.json({ error: "Pin ruangan harus tepat 6 digit." }, { status: 400 });
  }
  if (!(await validateHostToken(roomCode, req.headers.get("x-host-token")))) {
    return NextResponse.json({ error: "Akses pengajar diperlukan." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const {
    fileName,
    mimeType,
    fileBase64,
    text,
    questionCount,
    instructions,
    difficulty,
    timePerQuestionSec,
    streakBonus,
  } = parsed.data;

  try {
    let source = text?.trim() ?? "";
    if (fileBase64) {
      source = await extractText({ name: fileName || "materi", mimeType, base64: fileBase64 });
    }
    if (!source && instructions?.trim()) {
      source = instructions.trim();
    }
    if (source.length < 3) {
      return NextResponse.json(
        {
          error:
            "Unggah berkas sumber pembelajaran atau tuliskan instruksi/topik materi yang akan dipelajari.",
        },
        { status: 400 }
      );
    }

    const quiz = await generateQuizFromText({
      text: source,
      questionCount,
      instructions: fileBase64 || text?.trim() ? instructions : undefined,
      sourceName: fileName,
      difficulty,
    });

    const saved = await setRoomQuestions(roomCode, {
      title: quiz.title,
      description: fileName ? `Dibuat dari ${fileName}` : instructions?.slice(0, 120) || "",
      questions: quiz.questions,
      difficulty,
      timePerQuestionSec,
      streakBonus,
    });
    if (!saved) {
      return NextResponse.json(
        { error: "Soal hanya bisa diganti sebelum kuis dimulai." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      title: quiz.title,
      totalQuestions: saved.length,
      difficulty,
    });
  } catch (err) {
    if (err instanceof UnsupportedFileError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof AIUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[rooms/quiz error]", err);
    return NextResponse.json({ error: "Gagal membuat kuis. Coba lagi." }, { status: 500 });
  }
}
