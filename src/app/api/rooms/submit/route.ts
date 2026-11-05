import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAnswerSubmission } from "@/lib/rooms/store";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";

const SubmitAnswerSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(1),
  playerToken: z.string().min(1, "Player token is required"),
  questionId: z.string().min(1),
  selectedOption: z.string().min(1),
  responseTimeMs: z.coerce.number().optional().default(3000),
  microFeedback: z.string().max(2000).optional(),
});

const STATUS_BY_REASON: Record<string, number> = {
  unauthorized: 401,
  not_found: 404,
  inactive: 409,
  not_approved: 403,
  invalid_question: 409,
  write_failed: 500,
};

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 60, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = SubmitAnswerSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid submission payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const roomCode = normalizeRoomCode(parsed.data.roomCode);
    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json(
        { success: false, error: "PIN ruangan harus tepat 6 digit." },
        { status: 400 }
      );
    }

    const result = await recordAnswerSubmission({
      roomCode,
      playerId: parsed.data.playerId,
      playerToken: parsed.data.playerToken,
      questionId: parsed.data.questionId,
      selectedOption: parsed.data.selectedOption,
      responseTimeMs: parsed.data.responseTimeMs,
      microFeedback: parsed.data.microFeedback,
    });

    if (!result.ok) {
      const messages: Record<string, string> = {
        unauthorized: "Sesi pemain tidak valid. Gabung ulang ke ruangan.",
        not_found: "Pemain atau ruangan tidak ditemukan.",
        inactive: "Soal belum aktif atau sudah ditutup.",
        not_approved: "Kamu belum disetujui oleh pengajar.",
        invalid_question: "Soal tersebut bukan soal aktif saat ini.",
        write_failed: "Gagal menyimpan jawaban. Coba lagi.",
      };
      return NextResponse.json(
        { success: false, error: messages[result.reason] || "Gagal mengirim jawaban." },
        { status: STATUS_BY_REASON[result.reason] || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate ?? false,
      submission: result.submission,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      player: {
        id: result.updatedPlayer.id,
        nickname: result.updatedPlayer.nickname,
        score: result.updatedPlayer.score,
        streak: result.updatedPlayer.streak,
      },
    });
  } catch (err: unknown) {
    console.error("[rooms/submit error]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to record submission",
      },
      { status: 500 }
    );
  }
}
