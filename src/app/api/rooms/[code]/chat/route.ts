import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureRoomLoaded,
  validateHostToken,
  validatePlayerToken,
  addRoomChatMessage,
  getRoomChatMessages,
  invalidateGameRoomState,
} from "@/lib/rooms/store";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const PostChatSchema = z.object({
  text: z.string().min(1).max(500),
  senderId: z.string().optional(),
  senderName: z.string().optional(),
  senderRole: z.enum(["teacher", "student"]).optional(),
  avatar: z.string().optional(),
  hostToken: z.string().optional(),
  playerId: z.string().optional(),
  playerToken: z.string().optional(),
});

async function authenticateCaller(
  req: Request,
  roomCode: string,
  bodyData?: { hostToken?: string; playerId?: string; playerToken?: string }
): Promise<
  | { authorized: true; role: "teacher"; senderId: string; senderName: string }
  | { authorized: true; role: "student"; senderId: string; senderName: string; avatar?: string }
  | { authorized: false }
> {
  const url = new URL(req.url);
  const hostToken =
    req.headers.get("x-host-token") ||
    bodyData?.hostToken ||
    url.searchParams.get("hostToken");

  if (hostToken && (await validateHostToken(roomCode, hostToken))) {
    const room = await ensureRoomLoaded(roomCode);
    return {
      authorized: true,
      role: "teacher",
      senderId: "host",
      senderName: room?.hostName || "Guru",
    };
  }

  const playerId =
    req.headers.get("x-player-id") ||
    bodyData?.playerId ||
    url.searchParams.get("playerId");
  const playerToken =
    req.headers.get("x-player-token") ||
    bodyData?.playerToken ||
    url.searchParams.get("playerToken");

  if (
    playerId &&
    playerToken &&
    (await validatePlayerToken(roomCode, playerId, playerToken))
  ) {
    const room = await ensureRoomLoaded(roomCode);
    const player = room?.players.get(playerId);
    return {
      authorized: true,
      role: "student",
      senderId: playerId,
      senderName: player?.nickname || "Siswa",
      avatar: player?.avatar,
    };
  }

  return { authorized: false };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rateLimit = await checkRateLimit(req, 120, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  try {
    const { code } = await params;
    const roomCode = normalizeRoomCode(code);

    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json(
        { success: false, error: "Pin ruangan harus tepat 6 digit." },
        { status: 400 }
      );
    }

    const room = await ensureRoomLoaded(roomCode);
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Ruangan ${code} tidak ditemukan.` },
        { status: 404 }
      );
    }

    const auth = await authenticateCaller(req, roomCode);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: "Akses obrolan ruangan ditolak." },
        { status: 401 }
      );
    }

    const messages = await getRoomChatMessages(roomCode);
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    const etag = `"${roomCode}-chat-${messages.length}-${lastMsg?.id || "0"}-${lastMsg?.createdAt || "0"}"`;

    const clientEtag = req.headers.get("if-none-match");
    if (
      clientEtag &&
      (clientEtag === etag ||
        clientEtag === `W/${etag}` ||
        clientEtag.replace(/^W\//, "") === etag)
    ) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, no-transform",
        },
      });
    }

    return NextResponse.json(
      { success: true, messages },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, no-transform",
        },
      }
    );
  } catch (err) {
    console.error("[rooms/[code]/chat GET error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil pesan obrolan." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rateLimit = await checkRateLimit(req, 60, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  try {
    const { code } = await params;
    const roomCode = normalizeRoomCode(code);

    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json(
        { success: false, error: "Pin ruangan harus tepat 6 digit." },
        { status: 400 }
      );
    }

    const room = await ensureRoomLoaded(roomCode);
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Ruangan ${code} tidak ditemukan.` },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = PostChatSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Format pesan tidak valid." },
        { status: 400 }
      );
    }

    const auth = await authenticateCaller(req, roomCode, parseResult.data);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: "Akses obrolan ruangan ditolak." },
        { status: 401 }
      );
    }

    const senderRole = auth.role;
    const senderId = auth.senderId;
    const senderName =
      parseResult.data.senderName?.trim() && senderRole === "teacher"
        ? parseResult.data.senderName.trim()
        : auth.senderName;
    const avatar = auth.role === "student" ? auth.avatar : parseResult.data.avatar;

    const message = await addRoomChatMessage({
      roomCode,
      senderId,
      senderName,
      senderRole,
      avatar,
      text: parseResult.data.text,
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Gagal mengirim pesan." },
        { status: 400 }
      );
    }

    invalidateGameRoomState(roomCode);

    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error("[rooms/[code]/chat POST error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal memproses pesan obrolan." },
      { status: 500 }
    );
  }
}
