import { NextResponse } from "next/server";
import { getGameRoomState } from "@/lib/rooms/store";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rateLimit = await checkRateLimit(req, 240, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

  try {
    const { code } = await params;
    const normalizedCode = normalizeRoomCode(code);

    if (!isValidRoomCode(normalizedCode)) {
      return NextResponse.json(
        { success: false, error: "Pin ruangan harus tepat 6 digit." },
        { status: 400 }
      );
    }

    const state = await getGameRoomState(normalizedCode);

    if (!state) {
      return NextResponse.json(
        {
          success: false,
          error: `Room pin "${code}" tidak ditemukan.`,
        },
        { status: 404 }
      );
    }

    const chatMessages = (state as { chatMessages?: { id?: string }[] }).chatMessages || [];
    const chatCount = chatMessages.length;
    const lastChatId = chatCount > 0 ? chatMessages[chatCount - 1]?.id || "" : "";

    let playerChecksum = 0;
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      const statusVal = p.status === "approved" ? 1 : p.status === "pending" ? 2 : 3;
      const connVal = p.isConnected ? 1 : 0;
      playerChecksum =
        ((playerChecksum << 5) -
          playerChecksum +
          (p.score || 0) * 31 +
          (p.streak || 0) * 17 +
          statusVal * 7 +
          connVal) |
        0;
    }

    const etag = `"${state.status}-${state.currentQuestionIndex}-${state.questionStartedAt || ""}-${state.players.length}-${playerChecksum}-${state.totalSubmissionsCount}-${chatCount}-${lastChatId}-${state.updatedAt || ""}"`;

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
      {
        success: true,
        ...state,
      },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, no-transform",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[rooms/[code]/state error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil status ruangan kuis." },
      { status: 500 }
    );
  }
}
