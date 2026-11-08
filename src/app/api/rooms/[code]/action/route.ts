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
  updateRoomSettings,
  validateHostToken,
  recordHeartbeat,
  abandonRoom,
  invalidateGameRoomState,
} from "@/lib/rooms/store";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";

const ActionSchema = z.object({
  action: z.enum([
    "get_teacher_state",
    "start_quiz",
    "advance_question",
    "show_leaderboard",
    "resume_quiz",
    "finish_game",
    "abandon_room",
    "simulate_answer",
    "approve_player",
    "reject_player",
    "approve_all_players",
    "toggle_auto_approve",
    "update_room_settings",
    "heartbeat",
  ]),
  playerId: z.string().optional(),
  selectedOption: z.string().optional(),
  autoApprove: z.boolean().optional(),
  settings: z
    .object({
      timePerQuestionSec: z.coerce.number().int().min(5).max(120).optional(),
      streakBonus: z.boolean().optional(),
      shuffleQuestions: z.boolean().optional(),
      autoApproveStudents: z.boolean().optional(),
      difficulty: z
        .enum(["mudah", "sedang", "sulit", "campuran", "adaptif"])
        .transform((v) => (v === "adaptif" ? "campuran" : v))
        .optional(),
    })
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rateLimit = await checkRateLimit(req, 120, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

  try {
    const { code } = await params;
    const roomCode = normalizeRoomCode(code);
    const hostToken = req.headers.get("x-host-token");

    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json(
        { error: "Pin ruangan harus tepat 6 digit." },
        { status: 400 }
      );
    }

    if (!(await validateHostToken(roomCode, hostToken))) {
      return NextResponse.json(
        { error: "Akses pengajar diperlukan untuk mengontrol ruangan ini." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = ActionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Aksi tidak valid", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { action, playerId, selectedOption } = parseResult.data;

    if (action !== "get_teacher_state") {
      invalidateGameRoomState(roomCode);
    }

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
        const existing = await getGameRoomState(roomCode);
        if (!existing || existing.totalQuestions === 0) {
          return NextResponse.json(
            { error: "Belum ada soal. Unggah materi dulu untuk membuat kuis." },
            { status: 400 }
          );
        }
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

      case "abandon_room": {
        await abandonRoom(roomCode);
        const state = await getGameRoomState(roomCode);
        const details = await getTeacherRoomDetails(roomCode);
        return NextResponse.json({ success: true, isAbandoned: true, state, details });
      }

      case "approve_player": {
        if (!playerId) {
          return NextResponse.json({ error: "playerId wajib diisi" }, { status: 400 });
        }
        await approvePlayer(roomCode, playerId);
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, ...details, details, state });
      }

      case "reject_player": {
        if (!playerId) {
          return NextResponse.json({ error: "playerId wajib diisi" }, { status: 400 });
        }
        await rejectPlayer(roomCode, playerId);
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, ...details, details, state });
      }

      case "approve_all_players": {
        const approvedCount = await approveAllPlayers(roomCode);
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, approvedCount, ...details, details, state });
      }

      case "toggle_auto_approve": {
        const autoApprove = await toggleAutoApprove(
          roomCode,
          parseResult.data.autoApprove
        );
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({ success: true, autoApprove, ...details, details, state });
      }

      case "update_room_settings": {
        const updatedSettings = await updateRoomSettings(
          roomCode,
          parseResult.data.settings || {}
        );
        const details = await getTeacherRoomDetails(roomCode);
        const state = await getGameRoomState(roomCode);
        return NextResponse.json({
          success: true,
          settings: updatedSettings,
          details,
          state,
        });
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

        const submission = await recordAnswerSubmission({
          roomCode,
          playerId: simulatedPlayerId,
          hostBypass: true,
          questionId: state.currentQuestion.id || "",
          selectedOption: option,
          responseTimeMs: Math.floor(2000 + Math.random() * 4000),
        });

        if (!submission.ok) {
          return NextResponse.json(
            { error: `Gagal mensimulasikan jawaban: ${submission.reason}` },
            { status: 400 }
          );
        }

        const updatedDetails = await getTeacherRoomDetails(roomCode);
        return NextResponse.json({ success: true, details: updatedDetails });
      }

      case "heartbeat": {
        await recordHeartbeat(roomCode, { playerId });
        return NextResponse.json({ success: true });
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
