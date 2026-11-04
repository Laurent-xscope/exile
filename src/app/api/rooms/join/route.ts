import { NextResponse } from "next/server";
import { z } from "zod";
import { joinGameRoom } from "@/lib/rooms/store";

const JoinRoomSchema = z.object({
  roomCode: z.string().min(4, "Room code PIN is required"),
  nickname: z.string().min(1, "Nickname is required").max(30, "Nickname too long"),
  avatar: z.string().optional().default("garuda"),
});

export async function POST(req: Request) {
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

    const { roomCode, nickname, avatar } = parsed.data;

    const result = await joinGameRoom({
      roomCode: roomCode.trim(),
      nickname: nickname.trim(),
      avatar: avatar.trim(),
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: `Room PIN "${roomCode}" tidak ditemukan atau permainan telah selesai. Pastikan PIN yang dimasukkan sudah sesuai.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playerId: result.player.id,
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
