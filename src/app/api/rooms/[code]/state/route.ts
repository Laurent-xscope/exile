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

    const etag = `"${state.status}-${state.currentQuestionIndex}-${state.questionStartedAt || ""}-${state.players.length}-${state.totalSubmissionsCount}-${state.updatedAt || ""}"`;

    const clientEtag = req.headers.get("if-none-match");
    if (clientEtag && clientEtag === etag) {
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
