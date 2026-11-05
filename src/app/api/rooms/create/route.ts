import { NextResponse } from "next/server";
import { z } from "zod";
import { createGameRoom } from "@/lib/rooms/store";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const CreateRoomSchema = z.object({
  quizId: z.string().optional(),
  hostName: z.string().optional().default("Guru"),
  questions: z.array(z.unknown()).optional(),
  settings: z
    .object({
      timePerQuestionSec: z.number().int().min(5).max(120).optional(),
      streakBonus: z.boolean().optional(),
      shuffleQuestions: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 20, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = CreateRoomSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid room payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const room = await createGameRoom({
      quizId: parsed.data.quizId,
      hostName: parsed.data.hostName,
      settings: parsed.data.settings,
      questions: parsed.data.questions as never,
    });

    return NextResponse.json({
      success: true,
      roomCode: room.roomCode,
      roomId: room.id,
      hostToken: room.hostToken,
      hostName: room.hostName,
      status: room.status,
      totalQuestions: room.questions.length,
      createdAt: room.createdAt,
    });
  } catch (err: unknown) {
    console.error("[rooms/create error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal membuat ruang kuis. Coba lagi." },
      { status: 500 }
    );
  }
}
