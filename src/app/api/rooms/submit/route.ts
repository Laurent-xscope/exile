import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAnswerSubmission } from "@/lib/rooms/store";

const SubmitAnswerSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOption: z.string().min(1),
  responseTimeMs: z.coerce.number().optional().default(3000),
  microFeedback: z.string().optional(),
});

export async function POST(req: Request) {
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

    const {
      roomCode,
      playerId,
      questionId,
      selectedOption,
      responseTimeMs,
      microFeedback,
    } = parsed.data;

    const result = await recordAnswerSubmission({
      roomCode,
      playerId,
      questionId,
      selectedOption,
      responseTimeMs,
      microFeedback,
    });

    if (!result || !result.updatedPlayer) {
      return NextResponse.json(
        {
          success: false,
          error: "Room or player not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
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
