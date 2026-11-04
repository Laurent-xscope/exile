import { NextResponse } from "next/server";
import { z } from "zod";
import {
  advanceRoomQuestion,
  setRoomStatus,
  getTeacherRoomDetails,
  recordAnswerSubmission,
  getGameRoomState,
  approvePlayer,
  rejectPlayer,
  approveAllPlayers,
  toggleAutoApprove,
} from "@/lib/rooms/store";

const ActionSchema = z.object({
  action: z.enum([
    "get_teacher_state",
    "start_quiz",
    "advance_question",
    "show_leaderboard",
    "resume_quiz",
    "finish_game",
    "simulate_answer",
    "approve_player",
    "reject_player",
    "approve_all_players",
    "toggle_auto_approve",
  ]),
  playerId: z.string().optional(),
  selectedOption: z.string().optional(),
  autoApprove: z.boolean().optional(),
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
        const details = await getTeacherRoomDetails(roomCode);
        if (!details) {
          return NextResponse.json(
            { error: `Room ${roomCode} tidak ditemukan` },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, ...details });
      }

      case "advance_question": {
        const result = await advanceRoomQuestion(roomCode);
        const state = await getGameRoomState(roomCode);
        const details = await getTeacherRoomDetails(roomCode);
        return NextResponse.json({
          success: result.success,
          isFinished: result.isFinished,
          state,
          details,
        });
      }

      case "show_leaderboard": {
        await setRoomStatus(roomCode, "showing_leaderboard");
        const state = await getGameRoomState(roomCode);
        const details = await getTeacherRoomDetails(roomCode);
        return NextResponse.json({ success: true, state, details });
      }

      case "start_quiz":
      case "resume_quiz": {
        await setRoomStatus(roomCode, "active");
        const state = await getGameRoomState(roomCode);
        const details = await getTeacherRoomDetails(roomCode);
        return NextResponse.json({ success: true, state, details });
      }

      case "finish_game": {
        await setRoomStatus(roomCode, "finished");
        const state = await getGameRoomState(roomCode);
        const details = await getTeacherRoomDetails(roomCode);
        return NextResponse.json({ success: true, state, details });
      }

      case "approve_player": {
        if (!playerId) {
          return NextResponse.json({ error: "playerId wajib diisi" }, { status: 400 });
        }
        await approvePlayer(roomCode, playerId);
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, details, state });
      }

      case "reject_player": {
        if (!playerId) {
          return NextResponse.json({ error: "playerId wajib diisi" }, { status: 400 });
        }
        await rejectPlayer(roomCode, playerId);
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, details, state });
      }

      case "approve_all_players": {
        const approvedCount = await approveAllPlayers(roomCode);
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, approvedCount, details, state });
      }

      case "toggle_auto_approve": {
        const autoApprove = await toggleAutoApprove(
          roomCode,
          parseResult.data.autoApprove
        );
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, autoApprove, details, state });
      }

      case "simulate_answer": {
        const state = await getGameRoomState(roomCode);
        if (!state || !state.currentQuestion) {
          return NextResponse.json(
            { error: "Tidak ada soal aktif untuk dijawab" },
            { status: 400 }
          );
        }

        const simulatedPlayerId =
          playerId ||
          state.players[Math.floor(Math.random() * state.players.length)]?.id;

        if (!simulatedPlayerId) {
          return NextResponse.json(
            { error: "Belum ada peserta di ruangan ini" },
            { status: 400 }
          );
        }

        const option =
          selectedOption ||
          ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];

        await recordAnswerSubmission({
          roomCode,
          playerId: simulatedPlayerId,
          questionId: state.currentQuestion.id || "",
          selectedOption: option,
          responseTimeMs: Math.floor(2000 + Math.random() * 4000),
        });

        const updatedDetails = await getTeacherRoomDetails(roomCode);
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
