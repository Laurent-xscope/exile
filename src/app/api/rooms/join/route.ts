import { NextResponse } from "next/server";
import { z } from "zod";
import {
  joinGameRoom,
  PlayerIdentityConflictError,
} from "@/lib/rooms/store";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";

const JoinRoomSchema = z.object({
  roomCode: z.string().min(1, "Room code Pin is required"),
  nickname: z.string().min(1, "Nickname is required").max(30, "Nickname too long"),
  avatar: z.string().optional().default("garuda"),
  playerToken: z.string().optional(),
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 120, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = JoinRoomSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid join payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { roomCode, nickname, avatar, playerToken } = parsed.data;
    const normalizedCode = normalizeRoomCode(roomCode);

    const BLOCKED_TERMS = ["anjing", "babi", "bangsat", "kontol", "memek", "taek", "fuck", "shit", "bitch", "asshole"];
    const isOffensive = BLOCKED_TERMS.some((term) => nickname.toLowerCase().includes(term));
    if (isOffensive) {
      return NextResponse.json(
        { success: false, error: "Nama panggilan tidak pantas. Gunakan nama yang sopan untuk kelas." },
        { status: 400 }
      );
    }

    if (!isValidRoomCode(normalizedCode)) {
      return NextResponse.json(
        { success: false, error: "Pin ruangan harus tepat 6 digit." },
        { status: 400 }
      );
    }

    const result = await joinGameRoom({
      roomCode: normalizedCode,
      nickname: nickname.trim(),
      avatar: avatar.trim(),
      playerToken,
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: `Room pin "${normalizedCode}" tidak ditemukan atau permainan telah selesai. Pastikan pin yang dimasukkan sudah sesuai.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playerId: result.player.id,
      playerToken: result.player.token,
      playerStatus: result.player.status,
      nickname: result.player.nickname,
      avatar: result.player.avatar,
      score: result.player.score,
      streak: result.player.streak,
      room: {
        roomCode: result.room.roomCode,
        hostName: result.room.hostName,
        status: result.room.status,
        quizId: result.room.quizId,
      },
    });
  } catch (err: unknown) {
    if (err instanceof PlayerIdentityConflictError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 409 }
      );
    }
    console.error("[rooms/join error]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan saat bergabung ke ruangan kuis.",
      },
      { status: 500 }
    );
  }
}
