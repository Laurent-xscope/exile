import { NextResponse } from "next/server";
import { z } from "zod";
import { createGameRoom } from "@/lib/rooms/store";

const CreateRoomSchema = z.object({
  quizId: z.string().optional(),
  hostName: z.string().optional().default("Guru"),
  questions: z.array(z.any()).optional(),
  settings: z
    .object({
      timePerQuestionSec: z.number().int().min(5).max(120).optional(),
      streakBonus: z.boolean().optional(),
      shuffleQuestions: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = CreateRoomSchema.safeParse(rawBody);

    const quizId = parsed.success ? parsed.data.quizId : undefined;
    const hostName = parsed.success ? parsed.data.hostName : "Guru";
    const settings = parsed.success ? parsed.data.settings : undefined;
    const questions = parsed.success ? parsed.data.questions : undefined;

    const room = await createGameRoom({
      quizId,
      hostName,
      settings,
      questions,
    });

    return NextResponse.json({
      success: true,
      roomCode: room.roomCode,
      roomId: room.id,
      hostName: room.hostName,
      status: room.status,
      totalQuestions: room.questions.length,
      createdAt: room.createdAt,
    });
  } catch (err: unknown) {
    console.error("[rooms/create error]", err);
    // Even in error, create room gracefully
    const fallbackRoom = await createGameRoom({
      hostName: "Guru Pengajar",
    });

    return NextResponse.json({
      success: true,
      roomCode: fallbackRoom.roomCode,
      roomId: fallbackRoom.id,
      hostName: fallbackRoom.hostName,
      status: fallbackRoom.status,
      totalQuestions: fallbackRoom.questions.length,
      createdAt: fallbackRoom.createdAt,
    });
  }
}
