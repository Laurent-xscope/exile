import { NextResponse } from "next/server";
import { z } from "zod";
import {
  advanceRoomQuestion,
  setRoomStatus,
  getTeacherRoomDetails,
  recordAnswerSubmission,
  getGameRoomState,
} from "@/lib/rooms/store";

const ActionSchema = z.object({
  action: z.enum([
    "get_teacher_state",
    "advance_question",
    "show_leaderboard",
    "resume_quiz",
    "finish_game",
    "simulate_answer",
  ]),
  playerId: z.string().optional(),
  selectedOption: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const roomCode = code.trim();

    const body = await req.json().catch(() => ({}));
    const parseResult = ActionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Aksi tidak valid", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { action, playerId, selectedOption } = parseResult.data;

    switch (action) {
      case "get_teacher_state": {
        const details = getTeacherRoomDetails(roomCode);
        if (!details) {
          return NextResponse.json(
            { error: `Room ${roomCode} tidak ditemukan` },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, ...details });
      }

      case "advance_question": {
        const result = advanceRoomQuestion(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({
          success: result.success,
          isFinished: result.isFinished,
          state,
        });
      }

      case "show_leaderboard": {
        setRoomStatus(roomCode, "showing_leaderboard");
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, state });
      }

      case "resume_quiz": {
        setRoomStatus(roomCode, "active");
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, state });
      }

      case "finish_game": {
        setRoomStatus(roomCode, "finished");
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, state });
      }

      case "simulate_answer": {
        // Handy for live demo: simulate a submission from one of the demo players
        const state = await getGameRoomState(roomCode);
        if (!state || !state.currentQuestion) {
          return NextResponse.json(
            { error: "Tidak ada soal aktif untuk dijawab" },
            { status: 400 }
          );
        }

        const simulatedPlayerId =
          playerId || state.players[Math.floor(Math.random() * state.players.length)]?.id;
        const option =
          selectedOption ||
          ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];

        if (simulatedPlayerId) {
          recordAnswerSubmission({
            roomCode,
            playerId: simulatedPlayerId,
            questionId: state.currentQuestion.id || "q1",
            selectedOption: option,
            responseTimeMs: Math.floor(2000 + Math.random() * 4000),
          });
        }

        const updatedDetails = getTeacherRoomDetails(roomCode);
        return NextResponse.json({ success: true, details: updatedDetails });
      }

      default:
        return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Room Action Error]:", error);
    return NextResponse.json(
      { error: "Gagal memproses aksi ruangan" },
      { status: 500 }
    );
  }
}
